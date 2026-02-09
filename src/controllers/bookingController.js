const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');

const Booking = require('../models/Booking');
const Token = require('../models/Token');
const Capacity = require('../models/Capacity');
const User = require('../models/User');
const Notification = require('../models/Notification');
const SystemSettings = require('../models/SystemSettings');
const { sendNotificationToUser } = require('../services/socketService');

const bookingController = {
  // Create a new booking
  createBooking: async (req, res, next) => {
    console.log('📍 createBooking called');
    console.log('Request Body:', req.body);
    console.log('User Context:', req.user);

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { slot_time, meal_type, canteen, items } = req.body;
      const userId = req.user.userId;
      const slotTime = new Date(slot_time);
      const now = new Date();
      const selectedCanteen = canteen || 'Sopanam';

      if (slotTime <= now) {
        await session.abortTransaction();
        return res.status(400).json({ success: false, message: 'Cannot book slots in the past' });
      }

      // Check against Holiday/Maintenance Dates
      const holidaySetting = await SystemSettings.findOne({ settingKey: `HOLIDAY_DATES_${selectedCanteen.toUpperCase()}` }).session(session);
      if (holidaySetting) {
        const blockedDates = JSON.parse(holidaySetting.settingValue); // ['2024-03-25', ...]
        const bookingDateStr = slotTime.toISOString().split('T')[0];
        if (blockedDates.includes(bookingDateStr)) {
          await session.abortTransaction();
          return res.status(400).json({
            success: false,
            message: `${selectedCanteen} is closed for maintenance/holiday on this date.`
          });
        }
      }

      // Check if user already has a booking for this slot
      const existingBooking = await Booking.findOne({
        user_id: userId,
        slot_time: slotTime,
        status: 'Booked'
      }).session(session);

      console.log('🔍 Duplicate check:', {
        userId,
        slotTime,
        existingBooking: existingBooking ? {
          bookingId: existingBooking.booking_id,
          slotTime: existingBooking.slot_time,
          status: existingBooking.status
        } : null
      });

      if (existingBooking) {
        await session.abortTransaction();
        return res.status(409).json({
          success: false,
          message: 'You already have a booking for this slot'
        });
      }

      // Check capacity
      const capacity = await Capacity.findOne({
        slot_time: slotTime,
        canteen: selectedCanteen
      }).session(session);

      if (!capacity) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: 'No capacity configured for this slot'
        });
      }

      // Count current bookings
      const bookingsCount = await Booking.countDocuments({
        slot_time: slotTime,
        status: 'Booked'
      }).session(session);

      if (bookingsCount >= capacity.max_capacity) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: 'This slot is full. Please choose another time.'
        });
      }

      // Get user priority status
      const user = await User.findOne({ user_id: userId }).session(session);
      const isPriority = user ? ['Staff', 'Admin', 'Manager'].includes(user.role) : false;

      // Generate IDs
      const lastBooking = await Booking.findOne().sort({ booking_id: -1 }).session(session);
      const nextBookingId = lastBooking ? lastBooking.booking_id + 1 : 1;

      console.log('📝 Creating Booking Document...');
      const bookingData = {
        booking_id: nextBookingId,
        user_id: userId,
        slot_time: slotTime,
        meal_type,
        canteen: selectedCanteen,
        items: items || [],
        status: 'Booked',
        is_priority_slot: isPriority,
        queue_position: 0 // Will be calculated after creation based on timestamp
      };
      console.log('Payload:', bookingData);

      // Create booking
      const newBooking = await Booking.create([bookingData], { session });
      const bookingDoc = newBooking[0];
      console.log('✅ Booking Document Saved:', bookingDoc);

      // Recalculate queue positions for this slot based on created_at timestamp
      const allBookingsForSlot = await Booking.find({
        slot_time: slotTime,
        status: 'Booked'
      }).sort({ is_priority_slot: -1, created_at: 1 }).session(session); // Priority first, then by creation time

      // Assign queue positions
      for (let i = 0; i < allBookingsForSlot.length; i++) {
        allBookingsForSlot[i].queue_position = i + 1;
        await allBookingsForSlot[i].save({ session });
      }

      console.log(`✅ Queue positions recalculated. User position: ${bookingDoc.queue_position}`);

      // Generate QR Token
      const tokenString = uuidv4();
      const qrCodeData = await QRCode.toDataURL(tokenString);
      const expiryMinutes = parseInt(process.env.QR_TOKEN_EXPIRY_MINUTES) || 15;
      const expiresAt = new Date(slotTime);
      expiresAt.setMinutes(expiresAt.getMinutes() + expiryMinutes);

      const lastToken = await Token.findOne().sort({ token_id: -1 }).session(session);
      const nextTokenId = lastToken ? lastToken.token_id + 1 : 1;

      const newToken = await Token.create([{
        token_id: nextTokenId,
        booking_id: bookingDoc.booking_id,
        qr_code: tokenString,
        status: 'Active',
        expires_at: expiresAt
      }], { session });

      const tokenDoc = newToken[0];

      // Create Notification
      const lastNotif = await Notification.findOne().sort({ notification_id: -1 }).session(session);
      const nextNotifId = lastNotif ? lastNotif.notification_id + 1 : 1;

      const notification = await Notification.create([{
        notification_id: nextNotifId,
        user_id: userId,
        message: `Booking confirmed! Your ${meal_type} slot is at ${slotTime.toLocaleTimeString()}. Token: ${tokenString.substring(0, 8)}`,
        notification_type: 'Reminder',
        booking_id: bookingDoc.booking_id
      }], { session });

      await session.commitTransaction();
      session.endSession();

      // Send real-time notification via WebSocket (outside transaction)
      sendNotificationToUser(userId, notification[0]);

      res.status(201).json({
        success: true,
        message: 'Booking created successfully',
        data: {
          booking: {
            bookingId: bookingDoc.booking_id,
            slotTime: bookingDoc.slot_time,
            mealType: bookingDoc.meal_type,
            status: bookingDoc.status,
            queuePosition: bookingDoc.queue_position
          },
          token: {
            tokenId: tokenDoc.token_id,
            qrCode: tokenString,
            qrCodeImage: qrCodeData,
            status: tokenDoc.status
          }
        }
      });

    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      if (error.message.includes('past')) {
        return res.status(400).json({ success: false, message: error.message });
      }
      next(error);
    }
  },

  // Get user bookings
  getMyBookings: async (req, res, next) => {
    try {
      const userId = req.user.userId;
      const { status, upcoming } = req.query;

      console.log(`🔎 Fetching bookings for UserID: ${userId}, Status: ${status}, Upcoming: ${upcoming}`);

      let query = { user_id: userId };

      if (status) {
        query.status = status;
      }

      if (upcoming === 'true') {
        const windowStart = new Date();
        windowStart.setHours(windowStart.getHours() - 2);
        query.slot_time = { $gt: windowStart };
        query.status = 'Booked';
      }

      console.log('Query:', JSON.stringify(query));

      const bookings = await Booking.find(query).sort({ slot_time: -1, queue_position: 1 });
      console.log(`Found ${bookings.length} bookings from DB`);

      const bookingsWithTokens = await Promise.all(bookings.map(async (b) => {
        const token = await Token.findOne({ booking_id: b.booking_id });
        return {
          bookingId: b.booking_id,
          slotTime: b.slot_time,
          mealType: b.meal_type,
          canteen: b.canteen,
          items: b.items || [],
          status: b.status,
          queuePosition: b.queue_position,
          token: token ? {
            tokenId: token.token_id,
            qrCode: token.qr_code,
            status: token.status
          } : null
        };
      }));

      res.json({
        success: true,
        data: {
          count: bookingsWithTokens.length,
          bookings: bookingsWithTokens
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Get specific booking
  getBookingById: async (req, res, next) => {
    try {
      const { bookingId } = req.params;
      const userId = req.user.userId;

      const booking = await Booking.findOne({ booking_id: bookingId });

      if (!booking) {
        return res.status(404).json({ success: false, message: 'Booking not found' });
      }

      if (booking.user_id !== userId && !['Staff', 'Manager', 'Admin'].includes(req.user.role)) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }

      const token = await Token.findOne({ booking_id: bookingId });
      const user = await User.findOne({ user_id: booking.user_id });

      res.json({
        success: true,
        data: {
          bookingId: booking.booking_id,
          user: user ? {
            userId: user.user_id,
            name: user.name,
            email: user.email
          } : null,
          slotTime: booking.slot_time,
          mealType: booking.meal_type,
          status: booking.status,
          queuePosition: booking.queue_position,
          token: token ? {
            tokenId: token.token_id,
            qrCode: token.qr_code,
            status: token.status
          } : null
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Update Booking (Cancel/Reschedule)
  updateBooking: async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const { bookingId } = req.params;
      const { action } = req.body;
      const userId = req.user.userId;

      const booking = await Booking.findOne({ booking_id: bookingId }).session(session);

      if (!booking) {
        await session.abortTransaction();
        return res.status(404).json({ success: false, message: 'Booking not found' });
      }

      if (booking.user_id !== userId) {
        await session.abortTransaction();
        return res.status(403).json({ success: false, message: 'Access denied' });
      }

      if (booking.status !== 'Booked') {
        await session.abortTransaction();
        return res.status(400).json({ success: false, message: `Cannot modify ${booking.status.toLowerCase()} booking` });
      }

      if (action === 'cancel') {
        booking.status = 'Cancelled';
        await booking.save({ session });

        await Token.updateMany({ booking_id: bookingId }, { status: 'Expired' }).session(session);

        // Send cancellation notification
        const lastNotif = await Notification.findOne().sort({ notification_id: -1 }).session(session);
        const nextNotifId = lastNotif ? lastNotif.notification_id + 1 : 1;

        const cancelNotification = await Notification.create([{
          notification_id: nextNotifId,
          user_id: userId,
          message: `Your booking for ${booking.meal_type} at ${new Date(booking.slot_time).toLocaleTimeString()} has been cancelled.`,
          notification_type: 'Alert',
          booking_id: bookingId
        }], { session });

        await Booking.updateMany(
          { slot_time: booking.slot_time, status: 'Booked', queue_position: { $gt: booking.queue_position } },
          { $inc: { queue_position: -1 } }
        ).session(session);

        await session.commitTransaction();
        session.endSession();

        // Send real-time notification
        sendNotificationToUser(userId, cancelNotification[0]);

        return res.json({ success: true, message: 'Booking cancelled successfully' });

      } else if (action === 'reschedule') {
        await session.abortTransaction();
        return res.status(501).json({ success: false, message: 'Reschedule verified but not fully implemented in this refactor pass.' });
      }

    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      next(error);
    }
  },

  // Get Available Slots
  getAvailableSlots: async (req, res, next) => {
    try {
      const { date, canteen } = req.query;
      const selectedCanteen = canteen || 'Sopanam';

      // Auto-Seed Capacities if empty
      const count = await Capacity.countDocuments();
      if (count === 0) {
        console.log('Seeding Capacities...');
        const slotsToInsert = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let idCounter = 1;

        // Seed for next 7 days
        for (let i = 0; i < 7; i++) {
          const day = new Date(today);
          day.setDate(day.getDate() + i);

          // 8 AM to 9 PM, every 15 mins
          for (let h = 8; h < 21; h++) {
            for (let m = 0; m < 60; m += 15) {
              const slot = new Date(day);
              slot.setHours(h, m, 0, 0);

              slotsToInsert.push({
                capacity_id: idCounter++,
                slot_time: slot,
                max_capacity: 50,
                canteen: 'Sopanam' // Default canteen for seed
              });
            }
          }
        }
        await Capacity.insertMany(slotsToInsert);
        console.log(`Seeded ${slotsToInsert.length} slots`);
      }

      let start = new Date();
      let end = new Date();
      end.setDate(end.getDate() + 7);

      if (date) {
        start = new Date(date);
        start.setHours(0, 0, 0, 0);
        end = new Date(date);
        end.setHours(23, 59, 59, 999);
      }

      const capacities = await Capacity.find({
        slot_time: { $gte: start, $lte: end },
        canteen: selectedCanteen
      }).sort({ slot_time: 1 });

      const slots = await Promise.all(capacities.map(async (cap) => {
        const bookedCount = await Booking.countDocuments({
          slot_time: cap.slot_time,
          status: 'Booked'
        });

        return {
          slotTime: cap.slot_time,
          maxCapacity: cap.max_capacity,
          bookedCount,
          remainingSlots: cap.max_capacity - bookedCount,
          isAvailable: (cap.max_capacity - bookedCount) > 0
        };
      }));

      res.json({
        success: true,
        data: {
          count: slots.length,
          slots
        }
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = bookingController;