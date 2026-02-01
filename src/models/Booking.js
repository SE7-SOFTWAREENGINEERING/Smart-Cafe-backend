const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required']
    },
    mealSlotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MealSlot',
      required: [true, 'Meal slot ID is required']
    },
    bookingDate: {
      type: Date,
      required: [true, 'Booking date is required'],
      index: true
    },
    status: {
      type: String,
      enum: ['BOOKED', 'CANCELLED', 'CONSUMED', 'NO_SHOW'],
      default: 'BOOKED',
      uppercase: true
    },
    bookingReference: {
      type: String,
      unique: true,
      sparse: true
    },
    cancelledAt: {
      type: Date
    },
    cancelReason: {
      type: String,
      maxlength: [500, 'Cancel reason cannot exceed 500 characters']
    },
    consumedAt: {
      type: Date
    },
    noShowMarkedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

// Compound unique index: one booking per user per slot per day
bookingSchema.index(
  { userId: 1, mealSlotId: 1, bookingDate: 1 },
  { 
    unique: true,
    partialFilterExpression: { status: { $in: ['BOOKED', 'CONSUMED'] } }
  }
);

// Other indexes
bookingSchema.index({ userId: 1, status: 1 });
bookingSchema.index({ mealSlotId: 1, status: 1 });
bookingSchema.index({ bookingReference: 1 });
bookingSchema.index({ status: 1 });

// Generate booking reference before saving
bookingSchema.pre('save', async function (next) {
  if (this.isNew && !this.bookingReference) {
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.bookingReference = `BK-${date}-${random}`;
  }
  next();
});

// Method to cancel booking
bookingSchema.methods.cancelBooking = async function (reason) {
  if (this.status !== 'BOOKED') {
    throw new Error('Only booked bookings can be cancelled');
  }
  this.status = 'CANCELLED';
  this.cancelledAt = new Date();
  this.cancelReason = reason;
  return await this.save();
};

// Method to mark as consumed
bookingSchema.methods.markConsumed = async function () {
  if (this.status !== 'BOOKED') {
    throw new Error('Only booked bookings can be marked as consumed');
  }
  this.status = 'CONSUMED';
  this.consumedAt = new Date();
  return await this.save();
};

// Method to mark as no-show
bookingSchema.methods.markNoShow = async function () {
  if (this.status !== 'BOOKED') {
    throw new Error('Only booked bookings can be marked as no-show');
  }
  this.status = 'NO_SHOW';
  this.noShowMarkedAt = new Date();
  return await this.save();
};

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;