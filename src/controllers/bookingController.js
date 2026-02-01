const { Booking, MealSlot, Token, CapacityLog, AuditLog, Menu } = require('../models');
const logger = require('../config/logger');
const QRCode = require('qrcode');

/**
 * Create a new booking
 */
exports.createBooking = async (req, res, next) => {
  try {
    const { mealSlotId, bookingDate } = req.body;
    const userId = req.user.id;

    // Check if slot exists and is active
    const slot = await MealSlot.findById(mealSlotId).populate('menuId');
    if (!slot) {
      return res.status(404).json({
        success: false,
        errorCode: 'SLOT_NOT_FOUND',
        message: 'Meal slot not found'
      });
    }

    if (!slot.isActive) {
      return res.status(400).json({
        success: false,
        errorCode: 'SLOT_INACTIVE',
        message: 'This meal slot is not active'
      });
    }

    // Check slot capacity
    if (slot.currentCount >= slot.maxCapacity) {
      return res.status(400).json({
        success: false,
        errorCode: 'SLOT_FULL',
        message: 'This meal slot is already full'
      });
    }

    // Check for existing booking
    const existingBooking = await Booking.findOne({
      userId,
      mealSlotId,
      bookingDate,
      status: { $in: ['BOOKED', 'CONSUMED'] }
    });

    if (existingBooking) {
      return res.status(409).json({
        success: false,
        errorCode: 'BOOKING_EXISTS',
        message: 'You already have a booking for this slot'
      });
    }

    // Create booking
    const booking = await Booking.create({
      userId,
      mealSlotId,
      bookingDate,
      status: 'BOOKED'
    });

    // Increment slot count
    const previousCount = slot.currentCount;
    await slot.incrementCount();

    // Log capacity change
    await CapacityLog.logChange({
      mealSlotId: slot._id,
      action: 'INCREMENT',
      previousCount,
      newCount: slot.currentCount,
      triggeredBy: userId,
      reason: 'BOOKING_CREATED',
      relatedBookingId: booking._id
    });

    // Generate token
    const tokenExpiryMinutes = parseInt(process.env.TOKEN_VALIDITY_MINUTES) || 15;
    const expiresAt = new Date(new Date(bookingDate).getTime() + tokenExpiryMinutes * 60000);

    const token = await Token.create({
      bookingId: booking._id,
      expiresAt
    });

    // Generate QR code
    const qrData = JSON.stringify({
      tokenId: token._id,
      tokenCode: token.tokenCode,
      bookingId: booking._id,
      userId: userId
    });
    const qrCodeUrl = await QRCode.toDataURL(qrData);
    token.qrCodeData = qrCodeUrl;
    await token.save();

    // Log audit
    await AuditLog.log({
      userId,
      action: 'Booking created',
      entity: 'Booking',
      entityId: booking._id,
      method: 'CREATE',
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    // Populate booking for response
    const populatedBooking = await Booking.findById(booking._id)
      .populate({
        path: 'mealSlotId',
        populate: { path: 'menuId' }
      })
      .populate('userId', 'fullName email rollOrEmployeeId');

    logger.info(`Booking created: ${booking._id} for user ${userId}`);

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: {
        booking: populatedBooking,
        token: {
          tokenId: token._id,
          tokenCode: token.tokenCode,
          qrCode: qrCodeUrl,
          expiresAt: token.expiresAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user's bookings
 */
exports.getUserBookings = async (req, res, next) => {
  try {
    const userId = req.params.userId || req.user.id;
    const { status, fromDate, toDate } = req.query;

    // Build query
    const query = { userId };
    
    if (status) {
      query.status = status.toUpperCase();
    }

    if (fromDate || toDate) {
      query.bookingDate = {};
      if (fromDate) query.bookingDate.$gte = new Date(fromDate);
      if (toDate) query.bookingDate.$lte = new Date(toDate);
    }

    const bookings = await Booking.find(query)
      .populate({
        path: 'mealSlotId',
        populate: { path: 'menuId' }
      })
      .sort({ bookingDate: -1, createdAt: -1 });

    // Get tokens for bookings
    const bookingIds = bookings.map(b => b._id);
    const tokens = await Token.find({ bookingId: { $in: bookingIds } });
    
    const bookingsWithTokens = bookings.map(booking => {
      const token = tokens.find(t => t.bookingId.toString() === booking._id.toString());
      return {
        ...booking.toJSON(),
        token: token ? {
          tokenId: token._id,
          tokenCode: token.tokenCode,
          qrCode: token.qrCodeData,
          isUsed: token.isUsed,
          expiresAt: token.expiresAt
        } : null
      };
    });

    res.json({
      success: true,
      data: {
        bookings: bookingsWithTokens,
        count: bookings.length
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel a booking
 */
exports.cancelBooking = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        errorCode: 'BOOKING_NOT_FOUND',
        message: 'Booking not found'
      });
    }

    // Check ownership
    if (booking.userId.toString() !== userId && !req.user.roles.includes('ADMIN')) {
      return res.status(403).json({
        success: false,
        errorCode: 'ACCESS_DENIED',
        message: 'You can only cancel your own bookings'
      });
    }

    if (booking.status !== 'BOOKED') {
      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_STATUS',
        message: 'Only booked bookings can be cancelled'
      });
    }

    // Cancel booking
    await booking.cancelBooking(reason);

    // Decrement slot count
    const slot = await MealSlot.findById(booking.mealSlotId);
    if (slot) {
      const previousCount = slot.currentCount;
      await slot.decrementCount();

      // Log capacity change
      await CapacityLog.logChange({
        mealSlotId: slot._id,
        action: 'DECREMENT',
        previousCount,
        newCount: slot.currentCount,
        triggeredBy: userId,
        reason: 'BOOKING_CANCELLED',
        relatedBookingId: booking._id
      });
    }

    // Invalidate token
    const token = await Token.findOne({ bookingId: booking._id });
    if (token) {
      token.isValid = false;
      await token.save();
    }

    // Log audit
    await AuditLog.log({
      userId,
      action: 'Booking cancelled',
      entity: 'Booking',
      entityId: booking._id,
      method: 'UPDATE',
      changes: { status: 'CANCELLED', reason },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    logger.info(`Booking cancelled: ${booking._id}`);

    res.json({
      success: true,
      message: 'Booking cancelled successfully',
      data: { booking }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reschedule a booking
 */
exports.rescheduleBooking = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const { newMealSlotId, newBookingDate } = req.body;
    const userId = req.user.id;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        errorCode: 'BOOKING_NOT_FOUND',
        message: 'Booking not found'
      });
    }

    // Check ownership
    if (booking.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        errorCode: 'ACCESS_DENIED',
        message: 'You can only reschedule your own bookings'
      });
    }

    if (booking.status !== 'BOOKED') {
      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_STATUS',
        message: 'Only booked bookings can be rescheduled'
      });
    }

    // Check new slot availability
    const newSlot = await MealSlot.findById(newMealSlotId);
    if (!newSlot || !newSlot.isActive) {
      return res.status(404).json({
        success: false,
        errorCode: 'SLOT_NOT_FOUND',
        message: 'New meal slot not found or inactive'
      });
    }

    if (newSlot.currentCount >= newSlot.maxCapacity) {
      return res.status(400).json({
        success: false,
        errorCode: 'SLOT_FULL',
        message: 'New meal slot is already full'
      });
    }

    // Decrement old slot
    const oldSlot = await MealSlot.findById(booking.mealSlotId);
    if (oldSlot) {
      const previousCount = oldSlot.currentCount;
      await oldSlot.decrementCount();

      await CapacityLog.logChange({
        mealSlotId: oldSlot._id,
        action: 'DECREMENT',
        previousCount,
        newCount: oldSlot.currentCount,
        triggeredBy: userId,
        reason: 'BOOKING_CANCELLED',
        relatedBookingId: booking._id
      });
    }

    // Increment new slot
    const previousNewCount = newSlot.currentCount;
    await newSlot.incrementCount();

    await CapacityLog.logChange({
      mealSlotId: newSlot._id,
      action: 'INCREMENT',
      previousCount: previousNewCount,
      newCount: newSlot.currentCount,
      triggeredBy: userId,
      reason: 'BOOKING_CREATED',
      relatedBookingId: booking._id
    });

    // Update booking
    booking.mealSlotId = newMealSlotId;
    booking.bookingDate = newBookingDate;
    await booking.save();

    // Update token expiry
    const token = await Token.findOne({ bookingId: booking._id });
    if (token) {
      const tokenExpiryMinutes = parseInt(process.env.TOKEN_VALIDITY_MINUTES) || 15;
      token.expiresAt = new Date(new Date(newBookingDate).getTime() + tokenExpiryMinutes * 60000);
      await token.save();
    }

    // Log audit
    await AuditLog.log({
      userId,
      action: 'Booking rescheduled',
      entity: 'Booking',
      entityId: booking._id,
      method: 'UPDATE',
      changes: { newMealSlotId, newBookingDate },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    const populatedBooking = await Booking.findById(booking._id)
      .populate({
        path: 'mealSlotId',
        populate: { path: 'menuId' }
      });

    logger.info(`Booking rescheduled: ${booking._id}`);

    res.json({
      success: true,
      message: 'Booking rescheduled successfully',
      data: { booking: populatedBooking }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get booking by ID
 */
exports.getBookingById = async (req, res, next) => {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId)
      .populate({
        path: 'mealSlotId',
        populate: { path: 'menuId' }
      })
      .populate('userId', 'fullName email rollOrEmployeeId');

    if (!booking) {
      return res.status(404).json({
        success: false,
        errorCode: 'BOOKING_NOT_FOUND',
        message: 'Booking not found'
      });
    }

    // Get token
    const token = await Token.findOne({ bookingId: booking._id });

    res.json({
      success: true,
      data: {
        booking,
        token: token ? {
          tokenId: token._id,
          tokenCode: token.tokenCode,
          qrCode: token.qrCodeData,
          isUsed: token.isUsed,
          expiresAt: token.expiresAt
        } : null
      }
    });
  } catch (error) {
    next(error);
  }
};