const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  user_id: {
    type: Number,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true,
    maxlength: 100
  },
  email: {
    type: String,
    required: true,
    unique: true,
    maxlength: 150
  },
  password: {
    type: String,
    required: true
  },
  otp: {
    type: String,
    default: null
  },
  otp_expires: {
    type: Date,
    default: null
  },
  is_verified: {
    type: Boolean,
    default: false
  },
  role: {
    type: String,
    required: true,
    enum: ['User', 'CanteenStaff', 'KitchenStaff', 'CounterStaff', 'Manager', 'Admin'],
    default: 'User'
  },
  status: {
    type: String,
    type: String,
    default: 'Active'
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', userSchema);
