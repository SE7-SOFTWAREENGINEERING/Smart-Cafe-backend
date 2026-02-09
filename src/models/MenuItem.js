const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema(
  {
    menuId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Menu',
      required: [true, 'Menu ID is required']
    },
    itemName: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true,
      maxlength: [100, 'Item name cannot exceed 100 characters']
    },
    price: {
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