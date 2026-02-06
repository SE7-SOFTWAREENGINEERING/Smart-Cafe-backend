const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  booking_id: {
    type: Number,
    required: true,
    unique: true
  },
  user_id: {
    type: Number,
    required: true,
    ref: 'User'
  },
  slot_time: {
    type: Date,
    required: true
  },
  meal_type: {
    type: String,
    required: true,
    enum: ['Breakfast', 'Lunch', 'Snacks', 'Dinner']
  },
  status: {
    type: String,
    required: true,
    enum: ['Booked', 'Cancelled', 'Completed', 'No-show'],
    default: 'Booked'
  },
  is_priority_slot: {
    type: Boolean,
    default: false
  },
  queue_position: {
    type: Number,
    required: true
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Booking', bookingSchema);
