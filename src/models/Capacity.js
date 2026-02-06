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
  }
});

module.exports = mongoose.model('Capacity', capacitySchema);
