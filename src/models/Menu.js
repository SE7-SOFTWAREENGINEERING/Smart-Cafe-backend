const mongoose = require('mongoose');

const menuSchema = new mongoose.Schema(
  {
    menuDate: {
      type: Date,
      required: [true, 'Menu date is required'],
      index: true
    },
    mealType: {
      type: String,
      required: [true, 'Meal type is required'],
      enum: ['BREAKFAST', 'LUNCH', 'DINNER'],
      uppercase: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    createdBy: {
      type: Number,
      required: false
    }
  },
  {
    timestamps: true
  }
);

// Compound index for unique menu per day and meal type
menuSchema.index({ menuDate: 1, mealType: 1 }, { unique: true });
menuSchema.index({ isActive: 1 });

// Virtual for menu items
menuSchema.virtual('items', {
  ref: 'MenuItem',
  localField: '_id',
  foreignField: 'menuId'
});

// Virtual for creator - using user_id ref
menuSchema.virtual('creator', {
  ref: 'User',
  localField: 'createdBy',
  foreignField: 'user_id',
  justOne: true
});

const Menu = mongoose.model('Menu', menuSchema);

module.exports = Menu;