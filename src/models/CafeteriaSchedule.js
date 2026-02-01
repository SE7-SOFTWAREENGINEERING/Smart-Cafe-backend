const mongoose = require('mongoose');

const cafeteriaScheduleSchema = new mongoose.Schema(
  {
    dayOfWeek: {
      type: String,
      required: [true, 'Day of week is required'],
      enum: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
      uppercase: true
    },
    mealType: {
      type: String,
      required: [true, 'Meal type is required'],
      enum: ['BREAKFAST', 'LUNCH', 'DINNER'],
      uppercase: true
    },
    openTime: {
      type: String,
      required: [true, 'Open time is required'],
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (use HH:mm)']
    },
    closeTime: {
      type: String,
      required: [true, 'Close time is required'],
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (use HH:mm)']
    },
    slotDuration: {
      type: Number,
      default: 15,
      min: [5, 'Slot duration must be at least 5 minutes'],
      max: [60, 'Slot duration cannot exceed 60 minutes']
    },
    defaultCapacity: {
      type: Number,
      default: 50,
      min: [1, 'Capacity must be at least 1']
    },
    isActive: {
      type: Boolean,
      default: true
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

// Compound unique index
cafeteriaScheduleSchema.index({ dayOfWeek: 1, mealType: 1 }, { unique: true });
cafeteriaScheduleSchema.index({ isActive: 1 });

const CafeteriaSchedule = mongoose.model('CafeteriaSchedule', cafeteriaScheduleSchema);

module.exports = CafeteriaSchedule;