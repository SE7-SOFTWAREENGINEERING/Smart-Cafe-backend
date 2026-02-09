const mongoose = require('mongoose');

const capacitySchema = new mongoose.Schema({
  capacity_id: {
    type: Number,
    required: true,
    unique: true
  },
  slot_time: {
    type: Date,
    required: true
  },
  max_capacity: {
    type: Number,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isCancelled: {
    type: Boolean,
    default: false
  },
  canteen: {
    type: String,
    enum: ['Sopanam', 'Prasada', 'Samudra'],
    required: true,
    default: 'Sopanam'
  }
});

module.exports = mongoose.model('Capacity', capacitySchema);
