const mongoose = require('mongoose');

const forecastSchema = new mongoose.Schema({
  forecast_id: {
    type: Number,
    required: true,
    unique: true
  },
  forecast_date: {
    type: Date,
    required: true
  },
  meal_type: {
    type: String,
    required: true,
    maxlength: 50,
    enum: ['Breakfast', 'Lunch', 'Snacks', 'Dinner']
  },
  predicted_quantity: {
    type: Number,
    required: true
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Forecast', forecastSchema);
