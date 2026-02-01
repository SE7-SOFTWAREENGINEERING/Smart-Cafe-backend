const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required']
    },
    action: {
      type: String,
      required: [true, 'Action is required'],
      maxlength: [255, 'Action cannot exceed 255 characters']
    },
    entity: {
      type: String,
      required: [true, 'Entity is required'],
      maxlength: [50, 'Entity cannot exceed 50 characters']
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId
    },
    method: {
      type: String,
      enum: ['CREATE', 'READ', 'UPDATE', 'DELETE'],
      uppercase: true
    },
    changes: {
      type: mongoose.Schema.Types.Mixed
    },
    ipAddress: {
      type: String
    },
    userAgent: {
      type: String
    },
    status: {
      type: String,
      enum: ['SUCCESS', 'FAILURE'],
      default: 'SUCCESS',
      uppercase: true
    },
    errorMessage: {
      type: String
    },
    loggedAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: false
  }
);

// Indexes
auditLogSchema.index({ userId: 1, loggedAt: -1 });
auditLogSchema.index({ entity: 1, loggedAt: -1 });
auditLogSchema.index({ entityId: 1 });
auditLogSchema.index({ loggedAt: -1 });
auditLogSchema.index({ action: 1 });

// Static method to log action
auditLogSchema.statics.log = async function (data) {
  return await this.create({
    userId: data.userId,
    action: data.action,
    entity: data.entity,
    entityId: data.entityId,
    method: data.method,
    changes: data.changes,
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
    status: data.status || 'SUCCESS',
    errorMessage: data.errorMessage
  });
};

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;