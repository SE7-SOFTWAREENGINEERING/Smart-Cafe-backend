const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');

const Booking = require('../models/Booking');
const Token = require('../models/Token');
const Capacity = require('../models/Capacity');
const User = require('../models/User');
const Notification = require('../models/Notification');

const bookingController = {
  // Create a new booking
  createBooking: async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { slot_time, meal_type } = req.body;
      const userId = req.user.userId;
      const slotTime = new Date(slot_time);
      const now = new Date();

      if (slotTime <= now) {
        throw new Error('Cannot book slots in the past');
      }

      // Check if user already has a booking for this slot
      const existingBooking = await Booking.findOne({
        user_id: userId,
        slot_time: slotTime,
        status: 'Booked'
      }).session(session);

      if (existingBooking) {
        await session.abortTransaction();
        return res.status(409).json({
          success: false,
          message: 'You already have a booking for this slot'
        });
      }

      // Get user priority status
      const user = await User.findOne({ user_id: userId }).session(session);
      const isPriority = user ? user.role === 'Staff' || user.role === 'Admin' || user.role === 'Manager' : false;

      // Check capacity
      let capacity = await Capacity.findOne({ slot_time: slotTime }).session(session);

      if (!capacity) {
        // If no explicit capacity, check if it falls within valid CafeteriaTimings
        const dayName = slotTime.toLocaleDateString('en-US', { weekday: 'long' });
        const CafeteriaTimings = require('../models/CafeteriaTimings'); // Lazy load
        const timing = await CafeteriaTimings.findOne({ day: dayName }).session(session);

        let isValidSlot = false;
        if (timing && !timing.is_holiday) {
          const [openH, openM] = timing.opening_time.split(':').map(Number);
          const [closeH, closeM] = timing.closing_time.split(':').map(Number);

          const slotH = slotTime.getHours();
          const slotM = slotTime.getMinutes();

          // Convert to minutes for easier comparison
          const openTime = openH * 60 + openM;
          const closeTime = closeH * 60 + closeM;
          const slotTimeMins = slotH * 60 + slotM;

          if (slotTimeMins >= openTime && slotTimeMins < closeTime) {
            isValidSlot = true;
          }
        }

        if (isValidSlot) {
          // Auto-create capacity with default
          const lastC = await Capacity.findOne().sort({ capacity_id: -1 }).session(session);
          const nextId = lastC ? lastC.capacity_id + 1 : 1;
          const defaultCap = parseInt(process.env.DEFAULT_CAPACITY) || 100;

          const newCap = await Capacity.create([{
            capacity_id: nextId,
            slot_time: slotTime,
            max_capacity: defaultCap
          }], { session });
          capacity = newCap[0];
        } else {
          await session.abortTransaction();
          return res.status(400).json({
            success: false,
            message: 'No capacity configured for this slot and it is not within standard operating hours.'
          });
        }
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

      const queuePosition = bookingsCount + 1;

      // Generate IDs
      const lastBooking = await Booking.findOne().sort({ booking_id: -1 }).session(session);
      const nextBookingId = lastBooking ? lastBooking.booking_id + 1 : 1;

      // Create booking
      const newBooking = await Booking.create([{
        booking_id: nextBookingId,
        user_id: userId,
        slot_time: slotTime,
        meal_type,
        status: 'Booked',
        is_priority_slot: isPriority,
        queue_position: queuePosition
      }], { session });

      const booking = newBooking[0];

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
        booking_id: booking.booking_id,
        qr_code: tokenString,
        status: 'Active',
        expires_at: expiresAt
      }], { session });

      const token = newToken[0];

      // Create Notification
      const lastNotif = await Notification.findOne().sort({ notification_id: -1 }).session(session);
      const nextNotifId = lastNotif ? lastNotif.notification_id + 1 : 1;
      const reminderMinutes = parseInt(process.env.NOTIFICATION_REMINDER_MINUTES) || 10;

      await Notification.create([{
        notification_id: nextNotifId,
        user_id: userId,
        message: `Your meal slot at ${slotTime.toLocaleTimeString()} is coming up in ${reminderMinutes} minutes!`,
        notification_type: 'Reminder',
        booking_id: booking.booking_id // Added booking_id to schema in Step 243
      }], { session });

      await session.commitTransaction();

      res.status(201).json({
        success: true,
        message: 'Booking created successfully',
        data: {
          booking: {
            bookingId: booking.booking_id,
            slotTime: booking.slot_time,
            mealType: booking.meal_type,
            status: booking.status,
            queuePosition: booking.queue_position
          },
          token: {
            tokenId: token.token_id,
            qrCode: tokenString,
            qrCodeImage: qrCodeData,
            status: token.status
          }
        }
      });

    } catch (error) {
      await session.abortTransaction();
      if (error.message.includes('past')) {
        return res.status(400).json({ success: false, message: error.message });
      }
      next(error);
    } finally {
      session.endSession();
    }
  },

  // Get user bookings
  getMyBookings: async (req, res, next) => {
    try {
      const userId = req.user.userId;
      const { status, upcoming } = req.query;

      let query = { user_id: userId };

      if (status) {
        query.status = status;
      }

      if (upcoming === 'true') {
        query.slot_time = { $gt: new Date() };
        query.status = 'Booked';
      }

      const bookings = await Booking.find(query).sort({ slot_time: -1 });

      const bookingsWithTokens = await Promise.all(bookings.map(async (b) => {
        const token = await Token.findOne({ booking_id: b.booking_id });
        return {
          bookingId: b.booking_id,
          slotTime: b.slot_time,
          mealType: b.meal_type,
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

        await Booking.updateMany(
          { slot_time: booking.slot_time, status: 'Booked', queue_position: { $gt: booking.queue_position } },
          { $inc: { queue_position: -1 } }
        ).session(session);

        await session.commitTransaction();
        return res.json({ success: true, message: 'Booking cancelled successfully' });

      } else if (action === 'reschedule') {
        await session.abortTransaction();
        return res.status(501).json({ success: false, message: 'Reschedule verified but not fully implemented in this refactor pass.' });
      }

    } catch (error) {
      await session.abortTransaction();
      next(error);
    } finally {
      session.endSession();
    }
  },

  // Get Available Slots
  getAvailableSlots: async (req, res, next) => {
    try {
      const { date } = req.query;
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
        slot_time: { $gte: start, $lte: end }
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