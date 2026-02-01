const mongoose = require('mongoose');
const crypto = require('crypto');

const tokenSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: [true, 'Booking ID is required'],
      unique: true
    },
    tokenCode: {
      type: String,
      unique: true,
      index: true
    },
    qrCodeData: {
      type: String
    },
    isUsed: {
      type: Boolean,
      default: false
    },
    usedAt: {
      type: Date
    },
    usedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true
    },
    isValid: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Indexes
tokenSchema.index({ tokenCode: 1, isUsed: 1 });
tokenSchema.index({ bookingId: 1 });
tokenSchema.index({ expiresAt: 1 });

// Generate unique token code before saving
tokenSchema.pre('save', function (next) {
  if (this.isNew && !this.tokenCode) {
    this.tokenCode = `TKN-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
  }
  next();
});

// Method to validate token
tokenSchema.methods.validateToken = function () {
  if (this.isUsed) {
    return { valid: false, reason: 'Token already used' };
  }
  if (!this.isValid) {
    return { valid: false, reason: 'Token is invalid' };
  }
  if (new Date() > this.expiresAt) {
    return { valid: false, reason: 'Token has expired' };
  }
  return { valid: true };
};

// Method to mark token as used
tokenSchema.methods.markUsed = async function (staffId) {
  const validation = this.validateToken();
  if (!validation.valid) {
    throw new Error(validation.reason);
  }
  
  this.isUsed = true;
  this.usedAt = new Date();
  this.usedBy = staffId;
  return await this.save();
};

// Static method to cleanup expired tokens
tokenSchema.statics.cleanupExpired = async function () {
  const result = await this.updateMany(
    { expiresAt: { $lt: new Date() }, isValid: true },
    { $set: { isValid: false } }
  );
  return result;
};

const Token = mongoose.model('Token', tokenSchema);

module.exports = Token;