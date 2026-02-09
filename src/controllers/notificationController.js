const Notification = require('../models/Notification');
const Booking = require('../models/Booking');

const notificationController = {
  // Get user notifications
  getMyNotifications: async (req, res, next) => {
    try {
      const userId = req.user.userId;
      const { limit = 20, offset = 0, unreadOnly = false } = req.query;

      const filter = { user_id: userId };
      if (unreadOnly === 'true') {
        filter.is_read = false;
      }

      const notifications = await Notification.find(filter)
        .sort({ sent_at: -1 })
        .limit(parseInt(limit))
        .skip(parseInt(offset));

      const total = await Notification.countDocuments(filter);

      res.json({
        success: true,
        data: {
          count: notifications.length,
          total,
          notifications: notifications.map(n => ({
            notificationId: n.notification_id,
            message: n.message,
            type: n.notification_type,
            sentAt: n.sent_at,
            isRead: n.is_read,
            bookingId: n.booking_id
          }))
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Mark as read
  markAsRead: async (req, res, next) => {
    try {
      const { notificationId } = req.params;
      const userId = req.user.userId;

      const notification = await Notification.findOneAndUpdate(
        { notification_id: parseInt(notificationId), user_id: userId },
        { is_read: true },
        { new: true }
      );

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found'
        });
      }

      res.json({
        success: true,
        message: 'Notification marked as read',
        data: {
          notificationId: notification.notification_id,
          isRead: notification.is_read
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Mark all as read
  markAllAsRead: async (req, res, next) => {
    try {
      const userId = req.user.userId;

      const result = await Notification.updateMany(
        { user_id: userId, is_read: false },
        { is_read: true }
      );

      res.json({
        success: true,
        message: 'All notifications marked as read',
        data: {
          updatedCount: result.modifiedCount
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Get unread count
  getUnreadCount: async (req, res, next) => {
    try {
      const userId = req.user.userId;

      const unreadCount = await Notification.countDocuments({
        user_id: userId,
        is_read: false
      });

      res.json({
        success: true,
        data: { unreadCount }
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = notificationController;