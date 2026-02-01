const mongoose = require('mongoose');

const mealSlotSchema = new mongoose.Schema(
  {
    menuId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Menu',
      required: [true, 'Menu ID is required']
    },
    slotStart: {
      type: String,
      required: [true, 'Slot start time is required'],
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (use HH:mm)']
    },
    slotEnd: {
      type: String,
      required: [true, 'Slot end time is required'],
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (use HH:mm)']
    },
    maxCapacity: {
      type: Number,
      required: [true, 'Max capacity is required'],
      min: [1, 'Capacity must be at least 1']
    },
    currentCount: {
      type: Number,
      default: 0,
      min: [0, 'Current count cannot be negative']
    },
    isPrioritySlot: {
      type: Boolean,
      default: false
    },
    priorityFor: {
      type: String,
      enum: ['DISABILITY', 'TIGHT_SCHEDULE', 'SPECIAL_NEEDS', null]
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Indexes
mealSlotSchema.index({ menuId: 1 });
mealSlotSchema.index({ slotStart: 1, slotEnd: 1 });
mealSlotSchema.index({ isActive: 1 });
mealSlotSchema.index({ isPrioritySlot: 1 });

// Virtual for availability
mealSlotSchema.virtual('availableCapacity').get(function () {
  return this.maxCapacity - this.currentCount;
});

// Virtual for is full
mealSlotSchema.virtual('isFull').get(function () {
  return this.currentCount >= this.maxCapacity;
});

// Method to increment count
mealSlotSchema.methods.incrementCount = async function () {
  if (this.currentCount >= this.maxCapacity) {
    throw new Error('Slot is at full capacity');
  }
  this.currentCount += 1;
  return await this.save();
};

// Method to decrement count
mealSlotSchema.methods.decrementCount = async function () {
  if (this.currentCount > 0) {
    this.currentCount -= 1;
    return await this.save();
  }
  return this;
};

const MealSlot = mongoose.model('MealSlot', mealSlotSchema);

module.exports = MealSlot;