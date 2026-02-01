const { MealSlot, Menu, Booking, CapacityLog, AuditLog } = require('../models');
const logger = require('../config/logger');

/**
 * Create meal slots for a menu
 */
exports.createMealSlots = async (req, res, next) => {
  try {
    const { menuId, slots } = req.body;
    const userId = req.user.id;

    // Verify menu exists
    const menu = await Menu.findById(menuId);
    if (!menu) {
      return res.status(404).json({
        success: false,
        errorCode: 'MENU_NOT_FOUND',
        message: 'Menu not found'
      });
    }

    // Create slots
    const createdSlots = [];
    for (const slotData of slots) {
      const slot = await MealSlot.create({
        menuId,
        slotStart: slotData.slotStart,
        slotEnd: slotData.slotEnd,
        maxCapacity: slotData.maxCapacity || parseInt(process.env.DEFAULT_CAPACITY) || 50,
        isPrioritySlot: slotData.isPrioritySlot || false,
        priorityFor: slotData.priorityFor || null
      });
      createdSlots.push(slot);
    }

    // Log audit
    await AuditLog.log({
      userId,
      action: `Created ${createdSlots.length} meal slots`,
      entity: 'MealSlot',
      method: 'CREATE',
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    logger.info(`Created ${createdSlots.length} meal slots for menu ${menuId}`);

    res.status(201).json({
      success: true,
      message: 'Meal slots created successfully',
      data: {
        slots: createdSlots,
        count: createdSlots.length
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get available slots for a specific date and meal type
 */
exports.getAvailableSlots = async (req, res, next) => {
  try {
    const { date, mealType } = req.query;

    if (!date || !mealType) {
      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_PARAMS',
        message: 'Date and meal type are required'
      });
    }

    // Find menu for the date and meal type
    const menu = await Menu.findOne({
      menuDate: new Date(date),
      mealType: mealType.toUpperCase(),
      isActive: true
    });

    if (!menu) {
      return res.json({
        success: true,
        message: 'No menu available for this date and meal type',
        data: {
          slots: [],
          menu: null
        }
      });
    }

    // Get all slots for this menu
    const slots = await MealSlot.find({
      menuId: menu._id,
      isActive: true
    }).sort({ slotStart: 1 });

    // Add availability info
    const slotsWithAvailability = slots.map(slot => ({
      ...slot.toJSON(),
      availableCapacity: slot.maxCapacity - slot.currentCount,
      isFull: slot.currentCount >= slot.maxCapacity
    }));

    res.json({
      success: true,
      data: {
        menu: menu,
        slots: slotsWithAvailability,
        count: slots.length
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get slot by ID with booking details
 */
exports.getSlotById = async (req, res, next) => {
  try {
    const { slotId } = req.params;

    const slot = await MealSlot.findById(slotId).populate('menuId');
    
    if (!slot) {
      return res.status(404).json({
        success: false,
        errorCode: 'SLOT_NOT_FOUND',
        message: 'Meal slot not found'
      });
    }

    // Get bookings for this slot
    const bookings = await Booking.find({
      mealSlotId: slot._id,
      status: { $in: ['BOOKED', 'CONSUMED'] }
    }).populate('userId', 'fullName email rollOrEmployeeId');

    res.json({
      success: true,
      data: {
        slot: {
          ...slot.toJSON(),
          availableCapacity: slot.maxCapacity - slot.currentCount,
          isFull: slot.currentCount >= slot.maxCapacity
        },
        bookings: bookings,
        bookingCount: bookings.length
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update slot capacity
 */
exports.updateSlotCapacity = async (req, res, next) => {
  try {
    const { slotId } = req.params;
    const { maxCapacity } = req.body;
    const userId = req.user.id;

    const slot = await MealSlot.findById(slotId);
    
    if (!slot) {
      return res.status(404).json({
        success: false,
        errorCode: 'SLOT_NOT_FOUND',
        message: 'Meal slot not found'
      });
    }

    // Check if new capacity is less than current bookings
    if (maxCapacity < slot.currentCount) {
      return res.status(400).json({
        success: false,
        errorCode: 'CAPACITY_TOO_LOW',
        message: `Cannot set capacity to ${maxCapacity}. Current bookings: ${slot.currentCount}`
      });
    }

    const oldCapacity = slot.maxCapacity;
    slot.maxCapacity = maxCapacity;
    await slot.save();

    // Log audit
    await AuditLog.log({
      userId,
      action: 'Slot capacity updated',
      entity: 'MealSlot',
      entityId: slot._id,
      method: 'UPDATE',
      changes: { oldCapacity, newCapacity: maxCapacity },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    logger.info(`Slot ${slotId} capacity updated from ${oldCapacity} to ${maxCapacity}`);

    res.json({
      success: true,
      message: 'Slot capacity updated successfully',
      data: { slot }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle slot active status
 */
exports.toggleSlotStatus = async (req, res, next) => {
  try {
    const { slotId } = req.params;
    const userId = req.user.id;

    const slot = await MealSlot.findById(slotId);
    
    if (!slot) {
      return res.status(404).json({
        success: false,
        errorCode: 'SLOT_NOT_FOUND',
        message: 'Meal slot not found'
      });
    }

    slot.isActive = !slot.isActive;
    await slot.save();

    // Log audit
    await AuditLog.log({
      userId,
      action: `Slot ${slot.isActive ? 'activated' : 'deactivated'}`,
      entity: 'MealSlot',
      entityId: slot._id,
      method: 'UPDATE',
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    logger.info(`Slot ${slotId} ${slot.isActive ? 'activated' : 'deactivated'}`);

    res.json({
      success: true,
      message: `Slot ${slot.isActive ? 'activated' : 'deactivated'} successfully`,
      data: { slot }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get slot capacity logs
 */
exports.getSlotCapacityLogs = async (req, res, next) => {
  try {
    const { slotId } = req.params;
    const { limit = 50 } = req.query;

    const logs = await CapacityLog.find({ mealSlotId: slotId })
      .populate('triggeredBy', 'fullName email')
      .populate('relatedBookingId')
      .sort({ loggedAt: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: {
        logs,
        count: logs.length
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get live capacity view for all active slots (Staff Dashboard)
 */
exports.getLiveCapacity = async (req, res, next) => {
  try {
    const { date, mealType } = req.query;

    // Build query for menus
    const menuQuery = { isActive: true };
    if (date) menuQuery.menuDate = new Date(date);
    if (mealType) menuQuery.mealType = mealType.toUpperCase();

    const menus = await Menu.find(menuQuery);
    const menuIds = menus.map(m => m._id);

    // Get all active slots for these menus
    const slots = await MealSlot.find({
      menuId: { $in: menuIds },
      isActive: true
    })
      .populate('menuId')
      .sort({ 'menuId.menuDate': 1, slotStart: 1 });

    // Group by menu and add capacity info
    const capacityData = slots.map(slot => ({
      slotId: slot._id,
      menuDate: slot.menuId.menuDate,
      mealType: slot.menuId.mealType,
      slotStart: slot.slotStart,
      slotEnd: slot.slotEnd,
      maxCapacity: slot.maxCapacity,
      currentCount: slot.currentCount,
      availableCapacity: slot.maxCapacity - slot.currentCount,
      utilizationRate: ((slot.currentCount / slot.maxCapacity) * 100).toFixed(2),
      isFull: slot.currentCount >= slot.maxCapacity,
      isPrioritySlot: slot.isPrioritySlot,
      priorityFor: slot.priorityFor
    }));

    res.json({
      success: true,
      data: {
        slots: capacityData,
        totalSlots: capacityData.length,
        summary: {
          totalCapacity: slots.reduce((sum, s) => sum + s.maxCapacity, 0),
          totalBooked: slots.reduce((sum, s) => sum + s.currentCount, 0),
          totalAvailable: slots.reduce((sum, s) => sum + (s.maxCapacity - s.currentCount), 0)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};