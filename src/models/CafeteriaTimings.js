const mongoose = require('mongoose');

const cafeteriaTimingsSchema = new mongoose.Schema({
  timing_id: {
    type: Number,
    required: true,
    unique: true
  },
  day: {
    type: String,
    required: true,
    maxlength: 20
  },
  opening_time: {
    type: String, // Storing as String "HH:mm" per typical usage if not Date
    required: true
  },
  closing_time: {
    type: String, // Storing as String "HH:mm"
    required: true
  },
  is_holiday: {
    type: Boolean,
    default: false
  }
});

module.exports = mongoose.model('CafeteriaTimings', cafeteriaTimingsSchema);
