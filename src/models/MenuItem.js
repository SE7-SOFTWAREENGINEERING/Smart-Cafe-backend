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
    isVeg: {
      type: Boolean,
      default: true
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters']
    },
    category: {
      type: String,
      enum: ['STARTER', 'MAIN_COURSE', 'SIDE_DISH', 'DESSERT', 'BEVERAGE'],
      uppercase: true
    },
    nutritionalInfo: {
      calories: Number,
      protein: Number,
      carbs: Number,
      fat: Number
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