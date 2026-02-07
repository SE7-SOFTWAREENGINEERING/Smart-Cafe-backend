const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema(
  {
    roleName: {
      type: String,
      required: [true, 'Role name is required'],
      unique: true,
      uppercase: true,
      enum: ['USER', 'CANTEEN_STAFF', 'MANAGER', 'ADMIN'],
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    permissions: [{
      type: String,
      enum: [
        'VIEW_MENU',
        'BOOK_MEAL',
        'CANCEL_BOOKING',
        'SCAN_TOKEN',
        'VIEW_CAPACITY',
        'MANAGE_SCHEDULE',
        'VIEW_FORECAST',
        'MANAGE_USERS',
        'SYSTEM_CONFIG',
        'VIEW_ANALYTICS'
      ]
    }]
  },
  {
    timestamps: true
  }
);

// Indexes
roleSchema.index({ roleName: 1 });

const Role = mongoose.model('Role', roleSchema);

module.exports = Role;