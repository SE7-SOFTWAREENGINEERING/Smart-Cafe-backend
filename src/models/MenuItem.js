const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema(
  {
    menuId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Menu',
      required: false
    },
    itemName: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true
    },
    price: {
      regular: { type: Number, required: true },
      small: { type: Number }
    },
    category: {
      type: String,
      enum: ['Breakfast', 'Lunch', 'Snacks', 'Dinner'],
      required: true,
      default: 'Lunch'
    },
    type: {
      type: String,
      enum: ['Veg', 'Non-Veg', 'Vegan'],
      required: true,
      default: 'Veg'
    },
    isJain: {
      type: Boolean,
      default: false
    },
    allergens: {
      type: [String],
      default: []
    },
    tags: {
      type: [String],
      default: []
    },
    ecoScore: {
      type: String,
      enum: ['A', 'B', 'C', 'D', 'E'],
      default: 'C'
    },
    imageColor: {
      type: String,
      default: 'bg-gray-100'
    },
    description: {
      type: String,
      trim: true
    },
    nutritionalInfo: {
      calories: Number,
      protein: Number,
      carbs: Number,
      fat: Number
    },
    isAvailable: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Indexes
menuItemSchema.index({ menuId: 1 });
menuItemSchema.index({ isVeg: 1 });
menuItemSchema.index({ category: 1 });

const MenuItem = mongoose.model('MenuItem', menuItemSchema);

module.exports = MenuItem;