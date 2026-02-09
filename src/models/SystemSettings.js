const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema(
  {
    settingKey: {
      type: String,
      required: [true, 'Setting key is required'],
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: [100, 'Setting key cannot exceed 100 characters']
    },
    settingValue: {
      type: String,
      required: [true, 'Setting value is required'],
      maxlength: [5000, 'Setting value cannot exceed 5000 characters']
    },
    dataType: {
      type: String,
      enum: ['STRING', 'NUMBER', 'BOOLEAN', 'JSON'],
      default: 'STRING',
      uppercase: true
    },
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters']
    },
    category: {
      type: String,
      enum: ['BOOKING', 'CAPACITY', 'NOTIFICATION', 'SECURITY', 'GENERAL', 'TIMINGS'],
      uppercase: true
    },
    isEditable: {
      type: Boolean,
      default: true
    },
    updatedBy: {
      type: mongoose.Schema.Types.Mixed, // Allow Number or ObjectId to prevnt casting errors on old data
      ref: 'User'
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes
systemSettingsSchema.index({ settingKey: 1 });
systemSettingsSchema.index({ category: 1 });

// Virtual for updater
systemSettingsSchema.virtual('updater', {
  ref: 'User',
  localField: 'updatedBy',
  foreignField: 'user_id',
  justOne: true
});

// Method to get typed value
systemSettingsSchema.methods.getTypedValue = function () {
  switch (this.dataType) {
    case 'NUMBER':
      return parseFloat(this.settingValue);
    case 'BOOLEAN':
      return this.settingValue.toLowerCase() === 'true';
    case 'JSON':
      try {
        return JSON.parse(this.settingValue);
      } catch (e) {
        return this.settingValue;
      }
    default:
      return this.settingValue;
  }
};

// Static method to get setting by key
systemSettingsSchema.statics.getSetting = async function (key) {
  const setting = await this.findOne({ settingKey: key.toUpperCase() });
  return setting ? setting.getTypedValue() : null;
};

// Static method to update setting
systemSettingsSchema.statics.updateSetting = async function (key, value, userId) {
  return await this.findOneAndUpdate(
    { settingKey: key.toUpperCase() },
    {
      settingValue: String(value),
      updatedBy: userId
    },
    { new: true, upsert: true }
  );
};

const SystemSettings = mongoose.model('SystemSettings', systemSettingsSchema);

module.exports = SystemSettings;