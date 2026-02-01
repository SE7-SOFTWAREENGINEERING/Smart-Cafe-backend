const mongoose = require('mongoose');

const demandForecastSchema = new mongoose.Schema(
  {
    forecastDate: {
      type: Date,
      required: [true, 'Forecast date is required'],
      index: true
    },
    mealType: {
      type: String,
      required: [true, 'Meal type is required'],
      enum: ['BREAKFAST', 'LUNCH', 'DINNER'],
      uppercase: true
    },
    predictedCount: {
      type: Number,
      required: [true, 'Predicted count is required'],
      min: [0, 'Predicted count cannot be negative']
    },
    actualCount: {
      type: Number,
      default: 0,
      min: [0, 'Actual count cannot be negative']
    },
    accuracy: {
      type: Number,
      min: [0, 'Accuracy cannot be negative'],
      max: [100, 'Accuracy cannot exceed 100']
    },
    basedOn: {
      type: String,
      enum: ['HISTORICAL', 'MANUAL', 'ML_MODEL'],
      default: 'HISTORICAL',
      uppercase: true
    },
    confidence: {
      type: Number,
      min: [0, 'Confidence cannot be negative'],
      max: [100, 'Confidence cannot exceed 100']
    },
    generatedAt: {
      type: Date,
      default: Date.now
    },
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: {
      type: String,
      maxlength: [500, 'Notes cannot exceed 500 characters']
    }
  },
  {
    timestamps: true
  }
);

// Compound unique index
demandForecastSchema.index({ forecastDate: 1, mealType: 1 }, { unique: true });
demandForecastSchema.index({ generatedAt: -1 });
demandForecastSchema.index({ basedOn: 1 });

// Method to calculate accuracy
demandForecastSchema.methods.calculateAccuracy = function () {
  if (this.actualCount > 0) {
    const difference = Math.abs(this.predictedCount - this.actualCount);
    const accuracy = 100 - (difference / this.actualCount) * 100;
    this.accuracy = Math.max(0, Math.min(100, accuracy));
    return this.accuracy;
  }
  return null;
};

const DemandForecast = mongoose.model('DemandForecast', demandForecastSchema);

module.exports = DemandForecast;