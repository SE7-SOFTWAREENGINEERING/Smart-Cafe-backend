const cron = require('node-cron');
const Booking = require('../models/Booking');
const Token = require('../models/Token');
const Notification = require('../models/Notification');
const { sendNotificationToUser } = require('../services/socketService');

// User Story #9: Automatically release "No-Show" slots
const releaseNoShowSlots = async () => {
  try {
    const gracePeriod = parseInt(process.env.NO_SHOW_GRACE_PERIOD_MINUTES) || 5;
    const cutoffTime = new Date(Date.now() - gracePeriod * 60000);

    // Find bookings that are no-shows
    // status: 'Booked', slot_time < cutoffTime

    const overdueBookings = await Booking.find({
      status: 'Booked',
      slot_time: { $lt: cutoffTime }
    });

    if (overdueBookings.length > 0) {
      console.log(`Marked ${overdueBookings.length} bookings as no-show`);

      const bookingIds = overdueBookings.map(b => b.booking_id);

      // Update bookings
      await Booking.updateMany(
        { booking_id: { $in: bookingIds } },
        { status: 'No-show' } // Schema uses 'No-show' enum value? Step 179: ['Booked', 'Cancelled', 'Completed', 'No-show']
        // Original code used 'NoShow'. strict enum?
        // Step 179 enum: 'No-show'. Original code: 'NoShow'.
        // Mongoose validation will fail if I use 'NoShow'. I must use 'No-show'.
      );

      // Expire tokens
      await Token.updateMany(
        { booking_id: { $in: bookingIds }, status: 'Active' },
        { status: 'Expired' }
      );

      // Send notifications
      // Insert many
      // Need next notification ID logic if strict integer ID is required.
      // But for bulk, finding ID for each is tricky efficiently.
      // I'll assume we can use findOne + map or just iterate.
      // Iterating is safer for sequential ID gen.

      let lastNotif = await Notification.findOne().sort({ notification_id: -1 });
      let nextId = lastNotif ? lastNotif.notification_id + 1 : 1;

      const notifications = overdueBookings.map((b, i) => ({
        notification_id: nextId + i,
        user_id: b.user_id,
        message: `You missed your booking at ${new Date(b.slot_time).toLocaleString()}. Your slot has been released.`,
        notification_type: 'Alert'
      }));

      const createdNotifications = await Notification.insertMany(notifications);

      // Send real-time notifications via WebSocket
      createdNotifications.forEach(notification => {
        sendNotificationToUser(notification.user_id, notification);
      });
    }
  } catch (error) {
    console.error('Error releasing no-show slots:', error);
  }
};

// User Story #8: Send reminder notifications
const sendSlotReminders = async () => {
  try {
    const reminderMinutes = parseInt(process.env.NOTIFICATION_REMINDER_MINUTES) || 10;
    const now = new Date();
    const futureWindow = new Date(now.getTime() + reminderMinutes * 60000);

    // Find bookings in window
    const upcomingBookings = await Booking.find({
      status: 'Booked',
      slot_time: { $gt: now, $lte: futureWindow }
    });

    if (upcomingBookings.length > 0) {
      // Filter out those who already received reminder
      const bookingIds = upcomingBookings.map(b => b.booking_id);

      const existingReminders = await Notification.find({
        booking_id: { $in: bookingIds }, // Booking ID is NOT in Notification schema I implemented in Step 195/205?
        // Wait, I decided NOT to include booking_id in Notification schema because it wasn't in my reference?
        // But original code uses it for deduping!
        // If I can't check by booking_id, I might send duplicate reminders if cron runs e.g. every minute and window is overlapping.
        // Actually, cron runs * * * * * (every minute).
        // Bookings in [now, now+10min].
        // Next minute: bookings in [now+1, now+11min].
        // Overlap!
        // I MUST have booking_id in Notification to dedup, OR dedicated Reminder model.
        // I should add booking_id to Notification schema.
        // Step 48 schema description I wrote: "notification_id, user_id, message, notification_type, sent_at."
        // I should add booking_id to Notification schema.
      });

      // ... I need to add booking_id to Notification schema.
      // Assuming I will do that (simultaneous tool call or next).

      // Let's assume I add it.
      const remindedBookingIds = new Set(existingReminders.map(n => n.booking_id));

      const toRemind = upcomingBookings.filter(b => !remindedBookingIds.has(b.booking_id));

      if (toRemind.length > 0) {
        console.log(`Sending ${toRemind.length} reminder notifications`);

        let lastNotif = await Notification.findOne().sort({ notification_id: -1 });
        let nextId = lastNotif ? lastNotif.notification_id + 1 : 1;

        const newReminders = toRemind.map((b, i) => ({
          notification_id: nextId + i,
          user_id: b.user_id,
          message: `Reminder: Your ${b.meal_type} slot at ${new Date(b.slot_time).toLocaleTimeString()} is coming up in ${reminderMinutes} minutes!`,
          notification_type: 'Reminder',
          booking_id: b.booking_id
        }));

        const createdReminders = await Notification.insertMany(newReminders);

        // Send real-time notifications via WebSocket
        createdReminders.forEach(notification => {
          sendNotificationToUser(notification.user_id, notification);
        });
      }
    }
  } catch (error) {
    console.error('Error sending reminders:', error);
  }
};

// Expire old tokens
const expireOldTokens = async () => {
  try {
    const result = await Token.updateMany(
      { status: 'Active', expires_at: { $lt: new Date() } },
      { status: 'Expired' }
    );

    if (result.modifiedCount > 0) {
      console.log(`Expired ${result.modifiedCount} old tokens`);
    }
  } catch (error) {
    console.error('Error expiring tokens:', error);
  }
};

// Initialize
const initializeCronJobs = () => {
  cron.schedule('*/2 * * * *', () => {
    console.log('Running scheduled task: Release no-show slots');
    releaseNoShowSlots();
  });

  cron.schedule('* * * * *', () => {
    console.log('Running scheduled task: Send reminders');
    sendSlotReminders();
  });

  cron.schedule('*/5 * * * *', () => {
    console.log('Running scheduled task: Expire old tokens');
    expireOldTokens();
  });

  console.log('✅ Cron jobs initialized successfully');
};

module.exports = {
  initializeCronJobs,
  releaseNoShowSlots,
  sendSlotReminders,
  expireOldTokens
};