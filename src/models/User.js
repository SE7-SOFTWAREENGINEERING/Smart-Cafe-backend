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
  role: {
    type: String,
    required: true,
    enum: ['Student', 'Staff', 'Manager', 'Admin'],
    default: 'Student'
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', userSchema);
