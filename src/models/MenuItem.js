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
<<<<<<< HEAD
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price must be non-negative']
    },
    portionSize: {
      type: String,
      enum: ['Regular', 'Small', 'Large'],
      default: 'Regular'
    },
    dietaryType: {
      type: String,
      enum: ['Veg', 'Non-Veg', 'Vegan', 'Jain'],
      default: 'Veg'
    },
    allergens: {
      type: [String],
      default: []
    },
    // Keep isVeg for backward compatibility, but it will be derived from dietaryType
    isVeg: {
      type: Boolean,
      default: true
    },
    category: {
      type: String,
      // enum: ['STARTER', 'MAIN_COURSE', 'SIDE_DISH', 'DESSERT', 'BEVERAGE'], // Relaxed enum for frontend compatibility 'Breakfast', 'Lunch', 'Snacks'
      uppercase: false // Allow mixed case for frontend compatibility
=======
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
      type: Number,
      default: 50
    },
    imageColor: {
      type: String,
      default: 'bg-gray-100'
    },
    description: {
      type: String,
      trim: true
>>>>>>> 0ca20192c0a6fb1760a6c42ccf9424991aa20e79
    },
    nutritionalInfo: {
      calories: Number,
      protein: Number,
      carbs: Number,
      fat: Number
    },
    ecoScore: {
      type: String,
      enum: ['A', 'B', 'C', 'D', 'E'],
      default: 'C'
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