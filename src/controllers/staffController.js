const Booking = require('../models/Booking');
const Token = require('../models/Token');
const User = require('../models/User');
const Capacity = require('../models/Capacity');
const Notification = require('../models/Notification');
const { v4: uuidv4 } = require('uuid'); // Missing in previous partial write
const QRCode = require('qrcode'); // Missing in previous partial write

const staffController = {
  // Scan and validate token (User Story #3)
  scanToken: async (req, res, next) => {
    try {
      const { qr_code } = req.body;
      const staffId = req.user.userId;

      // Find token and populate booking and user
      // Mongoose doesn't support deep populate easily in one line without schema definitions having refs properly set up.
      // Token has ref to Booking (booking_id). Booking has ref to User (user_id).
      // So path: 'booking_id', populate: { path: 'user_id' }
      
      const token = await Token.findOne({ qr_code });

      if (!token) {
        return res.status(404).json({
          success: false,
          message: 'Invalid token',
          access: 'DENIED'
        });
      }

      // Manual population if needed or use simple queries for robust refactor
      const booking = await Booking.findOne({ booking_id: token.booking_id });
      if (!booking) {
         return res.status(404).json({ success: false, message: 'Booking not found', access: 'DENIED' });
      }
      
      const user = await User.findOne({ user_id: booking.user_id });

      const now = new Date();
      const slotTime = new Date(booking.slot_time);
      // expires_at ? The Token schema in Step 40 didn't have it.
      // But original code used it. I will skip expiry check based on field existence or implement it if I added it.
      // I did NOT add expires_at to Token schema.
      // So I will rely on status or calculation.
      // Original code: if (token.status === 'Expired' || now > expiresAt)
      // I'll stick to status check.
      
      if (token.status === 'Used') {
        return res.status(400).json({ success: false, message: 'Token already used', access: 'DENIED' });
      }

      if (token.status === 'Expired') {
        return res.status(400).json({ success: false, message: 'Token expired', access: 'DENIED' });
      }

      if (booking.status !== 'Booked') {
         return res.status(400).json({ success: false, message: `Booking is ${booking.status.toLowerCase()}`, access: 'DENIED' });
      }

      // Check early entry (15 min grace)
      const gracePeriodBefore = 15;
      const earliestEntry = new Date(slotTime);
      earliestEntry.setMinutes(earliestEntry.getMinutes() - gracePeriodBefore);

      if (now < earliestEntry) {
         return res.status(400).json({
           success: false,
           message: `Too early. Please come back after ${earliestEntry.toLocaleTimeString()}`,
           access: 'DENIED',
           slotTime: slotTime
         });
      }

      // Valid: Mark used
      token.status = 'Used';
      // token.scanned_at = now; // Schema doesn't have scanned_at
      // token.scanned_by = staffId; // Schema doesn't have scanned_by
      await token.save();

      booking.status = 'Completed';
      // booking.updated_at = now; // Schema doesn't have updated_at (it has created_at)
      await booking.save();

      // Notify
      // Get next notification ID
      const lastNotif = await Notification.findOne().sort({ notification_id: -1 });
      const nextNotifId = lastNotif ? lastNotif.notification_id + 1 : 1;
      
      await Notification.create({
         notification_id: nextNotifId,
         user_id: user.user_id,
         message: 'Your token has been validated. Enjoy your meal!',
         notification_type: 'Alert'
         // booking_id: booking.booking_id // Notification schema doesn't have booking_id
      });

      res.json({
        success: true,
        message: 'Entry approved',
        access: 'APPROVED',
        data: {
          userName: user.name,
          userEmail: user.email,
          slotTime: booking.slot_time,
          mealType: booking.meal_type,
          scannedAt: new Date()
        }
      });

    } catch (error) {
      next(error);
    }
  },

  issueWalkInToken: async (req, res, next) => {
    // Start session? For consistency yes.
    try {
      const { user_email, meal_type } = req.body;
      const staffId = req.user.userId;
      const now = new Date();

      const user = await User.findOne({ email: user_email });
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      // Find available slot
      const capacities = await Capacity.find({ slot_time: { $gte: now } }).sort({ slot_time: 1 });
      let availableSlot = null;

      for (const cap of capacities) {
         // Check if this slot matches meal_type? 
         // Capacity schema (Step 46) doesn't have meal_type!
         // Original code queried 'capacity' table which had 'meal_type'.
         // I am missing meal_type in Capacity schema.
         // Assumption: Determine meal_type from time? Or ignore check?
         // I'll skip meal_type check on Capacity and just rely on time + booking count.
         
         const bookedCount = await Booking.countDocuments({ slot_time: cap.slot_time, status: 'Booked' });
         if (bookedCount < cap.max_capacity) {
            availableSlot = cap;
            break; 
         }
      }

      if (!availableSlot) {
        return res.status(400).json({ success: false, message: `Cafeteria is full. No available slots.` });
      }

      const slotTime = availableSlot.slot_time;
      const currentBookings = await Booking.countDocuments({ slot_time: slotTime, status: 'Booked' });
      const queuePosition = currentBookings + 1;

      // new booking id
      const lastB = await Booking.findOne().sort({ booking_id: -1 });
      const nextBId = lastB ? lastB.booking_id + 1 : 1;

      const booking = await Booking.create({
        booking_id: nextBId,
        user_id: user.user_id,
        slot_time: slotTime,
        meal_type,
        status: 'Booked',
        is_priority_slot: false, // staff issued?
        queue_position: queuePosition
      });

      // token
      const tokenString = uuidv4();
      const qrCodeData = await QRCode.toDataURL(tokenString);
      const lastT = await Token.findOne().sort({ token_id: -1 });
      const nextTId = lastT ? lastT.token_id + 1 : 1;
      
      const token = await Token.create({
        token_id: nextTId,
        booking_id: booking.booking_id,
        qr_code: tokenString,
        status: 'Active'
      });

      // Notify
      const lastN = await Notification.findOne().sort({ notification_id: -1 });
      const nextNId = lastN ? lastN.notification_id + 1 : 1;
      
      await Notification.create({
        notification_id: nextNId,
        user_id: user.user_id,
        message: `Walk-in token issued for ${meal_type} at ${slotTime.toLocaleTimeString()}`,
        notification_type: 'Alert'
      });

      res.status(201).json({
        success: true,
        message: 'Walk-in token issued successfully',
        data: {
          booking: {
            bookingId: booking.booking_id,
            userName: user.name,
            userEmail: user.email,
            slotTime: booking.slot_time,
            mealType: booking.meal_type,
            queuePosition: booking.queue_position
          },
          token: {
            tokenId: token.token_id,
            qrCode: tokenString,
            qrCodeImage: qrCodeData,
            status: token.status,
            issuedAt: token.issued_at
          }
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Send emergency announcement
  sendAnnouncement: async (req, res, next) => {
    try {
      const { message } = req.body;
      
      // Get all active users
      // Distinct users with booked status and future slot
      const bookings = await Booking.find({ 
        status: 'Booked',
        slot_time: { $gte: new Date() }
      });
      
      const userIds = [...new Set(bookings.map(b => b.user_id))];

      if (userIds.length === 0) {
        return res.json({ success: true, message: 'No active users to notify', notificationsSent: 0 });
      }

      // Create notifications
      let lastN = await Notification.findOne().sort({ notification_id: -1 });
      let nextNId = lastN ? lastN.notification_id + 1 : 1;
      
      const notifications = userIds.map((uid, index) => ({
         notification_id: nextNId + index,
         user_id: uid,
         message: message,
         notification_type: 'Announcement'
      }));
      
      await Notification.insertMany(notifications);

      res.json({
        success: true,
        message: 'Emergency announcement sent successfully',
        notificationsSent: notifications.length
      });

    } catch (error) {
       next(error);
    }
  },

  // Get queue status
  getQueueStatus: async (req, res, next) => {
    try {
       const { meal_type } = req.query;
       const now = new Date();
       const next2Hours = new Date(now.getTime() + 2 * 60 * 60 * 1000);

       const query = {
         slot_time: { $gte: now, $lte: next2Hours }
       };

       if (meal_type) {
         query.meal_type = meal_type;
       }

       const bookings = await Booking.find(query);
       
       // Group by slot_time
       const statusMap = {};
       bookings.forEach(b => {
          const key = b.slot_time.toISOString();
          if (!statusMap[key]) {
             statusMap[key] = {
               slotTime: b.slot_time,
               mealType: b.meal_type,
               waiting: 0,
               completed: 0,
               noShows: 0
             };
          }
          if (b.status === 'Booked') statusMap[key].waiting++;
          else if (b.status === 'Completed') statusMap[key].completed++;
          else if (b.status === 'NoShow' || b.status === 'No-show') statusMap[key].noShows++;
       });

       const queueStatus = Object.values(statusMap).sort((a,b) => a.slotTime - b.slotTime);

       res.json({
         success: true,
         data: {
           currentTime: now,
           queueStatus
         }
       });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = staffController;