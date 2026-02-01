const { Token, Booking, MealSlot, CapacityLog, AuditLog, User } = require('../models');
const logger = require('../config/logger');

/**
 * Validate and scan token (Staff use)
 */
exports.validateToken = async (req, res, next) => {
  try {
    const { tokenCode } = req.body;
    const staffId = req.user.id;

    // Find token
    const token = await Token.findOne({ tokenCode })
      .populate({
        path: 'bookingId',
        populate: [
          {
            path: 'userId',
            select: 'fullName email rollOrEmployeeId'
          },
          {
            path: 'mealSlotId',
            populate: { path: 'menuId' }
          }
        ]
      });

    if (!token) {
      return res.status(404).json({
        success: false,
        errorCode: 'TOKEN_NOT_FOUND',
        message: 'Token not found'
      });
    }

    // Validate token
    const validation = token.validateToken();
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        errorCode: 'TOKEN_INVALID',
        message: validation.reason,
        data: {
          tokenCode,
          isUsed: token.isUsed,
          expiresAt: token.expiresAt
        }
      });
    }

    const booking = token.bookingId;
    
    // Check booking status
    if (booking.status !== 'BOOKED') {
      return res.status(400).json({
        success: false,
        errorCode: 'BOOKING_INVALID',
        message: `Booking status is ${booking.status}`
      });
    }

    // Mark token as used
    await token.markUsed(staffId);

    // Mark booking as consumed
    await booking.markConsumed();

    // Log audit
    await AuditLog.log({
      userId: staffId,
      action: 'Token scanned and validated',
      entity: 'Token',
      entityId: token._id,
      method: 'UPDATE',
      changes: { isUsed: true, bookingStatus: 'CONSUMED' },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    logger.info(`Token validated: ${tokenCode} by staff ${staffId}`);

    res.json({
      success: true,
      message: 'Token validated successfully',
      data: {
        token: {
          tokenCode: token.tokenCode,
          isUsed: true,
          usedAt: token.usedAt
        },
        booking: {
          bookingId: booking._id,
          bookingReference: booking.bookingReference,
          status: booking.status,
          consumedAt: booking.consumedAt
        },
        student: {
          name: booking.userId.fullName,
          email: booking.userId.email,
          rollOrEmployeeId: booking.userId.rollOrEmployeeId
        },
        slot: {
          slotStart: booking.mealSlotId.slotStart,
          slotEnd: booking.mealSlotId.slotEnd,
          mealType: booking.mealSlotId.menuId.mealType
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get token by booking ID
 */
exports.getTokenByBooking = async (req, res, next) => {
  try {
    const { bookingId } = req.params;

    const token = await Token.findOne({ bookingId }).populate('bookingId');
    
    if (!token) {
      return res.status(404).json({
        success: false,
        errorCode: 'TOKEN_NOT_FOUND',
        message: 'Token not found for this booking'
      });
    }

    res.json({
      success: true,
      data: {
        tokenId: token._id,
        tokenCode: token.tokenCode,
        qrCode: token.qrCodeData,
        isUsed: token.isUsed,
        usedAt: token.usedAt,
        expiresAt: token.expiresAt,
        isValid: token.isValid
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get token details by token code
 */
exports.getTokenByCode = async (req, res, next) => {
  try {
    const { tokenCode } = req.params;

    const token = await Token.findOne({ tokenCode })
      .populate({
        path: 'bookingId',
        populate: [
          { path: 'userId', select: 'fullName email rollOrEmployeeId' },
          { path: 'mealSlotId', populate: { path: 'menuId' } }
        ]
      });
    
    if (!token) {
      return res.status(404).json({
        success: false,
        errorCode: 'TOKEN_NOT_FOUND',
        message: 'Token not found'
      });
    }

    // Validate token
    const validation = token.validateToken();

    res.json({
      success: true,
      data: {
        token: {
          tokenId: token._id,
          tokenCode: token.tokenCode,
          qrCode: token.qrCodeData,
          isUsed: token.isUsed,
          usedAt: token.usedAt,
          expiresAt: token.expiresAt,
          isValid: validation.valid,
          validationReason: validation.reason
        },
        booking: token.bookingId
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cleanup expired tokens (Admin/Cron job)
 */
exports.cleanupExpiredTokens = async (req, res, next) => {
  try {
    const result = await Token.cleanupExpired();

    logger.info(`Expired tokens cleaned up: ${result.modifiedCount} tokens invalidated`);

    res.json({
      success: true,
      message: 'Expired tokens cleaned up successfully',
      data: {
        invalidatedCount: result.modifiedCount
      }
    });
  } catch (error) {
    next(error);
  }
};