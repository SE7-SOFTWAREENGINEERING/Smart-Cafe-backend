const mongoose = require('mongoose');

const wasteReportSchema = new mongoose.Schema({
  waste_id: {
    type: Number,
    required: true,
    unique: true
  },
  user_id: {
    type: Number,
    required: true,
    ref: 'User'
  },
  meal_type: {
    type: String,
    required: true,
    maxlength: 50
  },
  reason: {
    type: String,
    required: true
  },
  reported_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('WasteReport', wasteReportSchema);
