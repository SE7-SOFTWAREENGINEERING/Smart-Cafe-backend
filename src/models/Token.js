const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
  token_id: {
    type: Number,
    required: true,
    unique: true
  },
  booking_id: {
    type: Number,
    required: true,
    ref: 'Booking'
  },
  qr_code: {
    type: String,
    required: true,
    maxlength: 255
  },
  status: {
    type: String,
    required: true,
    enum: ['Active', 'Expired', 'Used'],
    default: 'Active'
  },
  issued_at: {
    type: Date,
    default: Date.now
  },
  expires_at: {
    type: Date,
    required: true
  }
});

module.exports = mongoose.model('Token', tokenSchema);
