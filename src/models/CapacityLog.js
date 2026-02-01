const mongoose = require('mongoose');

const capacityLogSchema = new mongoose.Schema(
  {
    mealSlotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MealSlot',
      required: [true, 'Meal slot ID is required']
    },
    action: {
      type: String,
      enum: ['INCREMENT', 'DECREMENT'],
      required: [true, 'Action is required'],
      uppercase: true
    },
    previousCount: {
      type: Number,
      required: true
    },
    newCount: {
      type: Number,
      required: true
    },
    triggeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: {
      type: String,
      enum: ['BOOKING_CREATED', 'BOOKING_CANCELLED', 'TOKEN_SCANNED', 'NO_SHOW', 'MANUAL_ADJUSTMENT'],
      uppercase: true
    },
    relatedBookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking'
    },
    loggedAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: false
  }
);

// Indexes
capacityLogSchema.index({ mealSlotId: 1, loggedAt: -1 });
capacityLogSchema.index({ action: 1 });
capacityLogSchema.index({ loggedAt: -1 });

// Static method to log capacity change
capacityLogSchema.statics.logChange = async function (data) {
  return await this.create({
    mealSlotId: data.mealSlotId,
    action: data.action,
    previousCount: data.previousCount,
    newCount: data.newCount,
    triggeredBy: data.triggeredBy,
    reason: data.reason,
    relatedBookingId: data.relatedBookingId
  });
};

const CapacityLog = mongoose.model('CapacityLog', capacityLogSchema);

module.exports = CapacityLog;