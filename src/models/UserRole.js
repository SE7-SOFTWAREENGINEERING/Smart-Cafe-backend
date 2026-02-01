const mongoose = require('mongoose');

const userRoleSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role',
      required: true
    },
    assignedAt: {
      type: Date,
      default: Date.now
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

// Compound unique index to prevent duplicate role assignments
userRoleSchema.index({ userId: 1, roleId: 1 }, { unique: true });

// Indexes for queries
userRoleSchema.index({ userId: 1 });
userRoleSchema.index({ roleId: 1 });

const UserRole = mongoose.model('UserRole', userRoleSchema);

module.exports = UserRole;