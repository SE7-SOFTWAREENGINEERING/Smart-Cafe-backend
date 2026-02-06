const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  notification_id: {
    type: Number,
    required: true,
    unique: true
  },
  user_id: {
    type: Number,
    required: true,
    ref: 'User'
  },
  message: {
    type: String,
    required: true
  },
  notification_type: {
    type: String,
    required: true,
    maxlength: 50,
    enum: ['Alert', 'Reminder', 'Announcement']
  },
  booking_id: {
    type: Number,
    ref: 'Booking'
  },
  sent_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Notification', notificationSchema);
