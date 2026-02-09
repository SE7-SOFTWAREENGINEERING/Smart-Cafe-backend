const Capacity = require('../models/Capacity');
const Booking = require('../models/Booking');
const SystemSettings = require('../models/SystemSettings');

const slotController = {
  // Get live slots with occupancy for a specific date
  getLiveSlots: async (req, res, next) => {
    try {
      const { date } = req.query;
      const queryDate = date ? new Date(date) : new Date();

      // Ensure full day range
      const startOfDay = new Date(queryDate);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(queryDate);
      endOfDay.setHours(23, 59, 59, 999);

      // Fetch capacities for the day
      const capacities = await Capacity.find({
        slot_time: { $gte: startOfDay, $lte: endOfDay }
      }).sort({ slot_time: 1 });

      // Check Holiday
      let isHoliday = false;
      const holidaySetting = await SystemSettings.findOne({ settingKey: 'HOLIDAY_DATES' });
      if (holidaySetting) {
        const blockedDates = JSON.parse(holidaySetting.settingValue);
        const dateStr = queryDate.toISOString().split('T')[0];
        if (blockedDates.includes(dateStr)) {
          isHoliday = true;
        }
      }

      const slots = await Promise.all(capacities.map(async (cap) => {
        const bookedCount = await Booking.countDocuments({
          slot_time: cap.slot_time,
          status: 'Booked'
        });

        return {
          slotId: cap._id,
          slotStart: cap.slot_time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          maxCapacity: cap.max_capacity,
          currentCount: bookedCount,
          isActive: cap.isActive && !cap.isCancelled && !isHoliday,
          isFull: bookedCount >= cap.max_capacity,
          isHoliday: isHoliday // Optional flag for frontend msg
        };
      }));

      res.json({
        success: true,
        data: {
          date: queryDate.toISOString().split('T')[0],
          slots
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Update capacity
  updateSlotCapacity: async (req, res, next) => {
    try {
      const { slotId } = req.params;
      const { maxCapacity } = req.body;

      const capacity = await Capacity.findByIdAndUpdate(
        slotId,
        { max_capacity: maxCapacity },
        { new: true }
      );

      if (!capacity) {
        return res.status(404).json({
          success: false,
          message: 'Slot not found'
        });
      }

      res.json({
        success: true,
        message: 'Capacity updated',
        data: capacity
      });
    } catch (error) {
      next(error);
    }
  },

  // Toggle status
  toggleSlotStatus: async (req, res, next) => {
    try {
      const { slotId } = req.params;

      const capacity = await Capacity.findById(slotId);

      if (!capacity) {
        return res.status(404).json({
          success: false,
          message: 'Slot not found'
        });
      }

      // Toggle cancelled status
      capacity.isCancelled = !capacity.isCancelled;
      // Sync active status
      capacity.isActive = !capacity.isCancelled;

      await capacity.save();

      res.json({
        success: true,
        message: `Slot ${capacity.isCancelled ? 'cancelled' : 're-opened'}`,
        data: capacity
      });
    } catch (error) {
      next(error);
    }
  },

  // Get bookings for a slot
  getSlotBookings: async (req, res, next) => {
    try {
      const { slotId } = req.params;
      const capacity = await Capacity.findById(slotId);

      if (!capacity) {
        return res.status(404).json({ success: false, message: 'Slot not found' });
      }

      const bookings = await Booking.find({
        slot_time: capacity.slot_time,
        status: 'Booked'
      }).populate('user_id', 'name email role');

      res.json({
        success: true,
        data: bookings.map(b => ({
          bookingId: b.booking_id,
          userName: b.user_id ? b.user_id.name : 'Unknown',
          userEmail: b.user_id ? b.user_id.email : '-',
          role: b.user_id ? b.user_id.role : '-',
          status: b.status,
          queuePosition: b.queue_position
        }))
      });
    } catch (error) {
      next(error);
    }
  },

  // Add walk-in bookings (Override)
  addWalkInBookings: async (req, res, next) => {
    const mongoose = require('mongoose');
    const User = require('../models/User');
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { slotId } = req.params;
      const { count } = req.body;
      const numToAdd = parseInt(count) || 1;

      const capacity = await Capacity.findById(slotId).session(session);
      if (!capacity) {
        throw new Error('Slot not found');
      }

      // Find or create 'Walk-in' user
      let walkInUser = await User.findOne({ email: 'walkin@smartcafe.com' }).session(session);
      if (!walkInUser) {
        // We need a unique ID for user
        const lastUser = await User.findOne().sort({ user_id: -1 }).session(session);
        const nextUserId = lastUser ? lastUser.user_id + 1 : 9999;

        const createdUsers = await User.create([{
          user_id: nextUserId,
          name: 'Walk-in Guest',
          email: 'walkin@smartcafe.com',
          password: 'walkin_account_secure', // Dummy
          role: 'User',
          is_verified: true
        }], { session });
        walkInUser = createdUsers[0];
      }

      // Determine starting queue position
      const existingCount = await Booking.countDocuments({
        slot_time: capacity.slot_time
      }).session(session);

      // Create N bookings
      const bookingsToCreate = [];
      const lastBooking = await Booking.findOne().sort({ booking_id: -1 }).session(session);
      let nextBookingId = lastBooking ? lastBooking.booking_id + 1 : 1;

      for (let i = 0; i < numToAdd; i++) {
        bookingsToCreate.push({
          booking_id: nextBookingId + i,
          user_id: walkInUser.user_id,
          slot_time: capacity.slot_time,
          meal_type: 'Walk-in', // Special type
          status: 'Booked',
          is_priority_slot: true, // Admin override is priority
          queue_position: existingCount + i + 1
        });
      }

      await Booking.insertMany(bookingsToCreate, { session });

      await session.commitTransaction();
      res.json({
        success: true,
        message: `${numToAdd} walk-in bookings added successfully`
      });

    } catch (error) {
      await session.abortTransaction();
      next(error);
    } finally {
      session.endSession();
    }
  },
  deleteSlot: async (req, res, next) => {
    try {
      const { slotId } = req.params;
      const slot = await Capacity.findByIdAndDelete(slotId);

      if (!slot) {
        return res.status(404).json({ success: false, message: 'Slot not found' });
      }

      // Also delete associated bookings? Or keep them as orphaned/historical?
      // For now, let's keep bookings but maybe mark them? 
      // Actually, if we delete the slot, the bookings lose their reference context if they relied on slot_time matching.
      // But Booking has slot_time stored.

      res.json({ success: true, message: 'Slot deleted successfully' });
    } catch (error) {
      next(error);
    }
  },

  createSlot: async (req, res, next) => {
    try {
      // Expecting date and time separately or a full ISO string?
      // Let's support both or just full ISO.
      // Front end might send date and time.
      const { date, time, maxCapacity } = req.body;

      let slotTime;
      if (date && time) {
        const [hours, minutes] = time.split(':').map(Number);
        slotTime = new Date(date);
        slotTime.setHours(hours, minutes, 0, 0);
      } else {
        return res.status(400).json({ success: false, message: 'Date and time required' });
      }

      // Check if slot exists
      const existing = await Capacity.findOne({ slot_time: slotTime });
      if (existing) {
        return res.status(409).json({ success: false, message: 'Slot already exists at this time' });
      }

      const lastC = await Capacity.findOne().sort({ capacity_id: -1 });
      const nextId = lastC ? lastC.capacity_id + 1 : 1;

      const newSlot = await Capacity.create({
        capacity_id: nextId,
        slot_time: slotTime,
        max_capacity: maxCapacity || 50,
        isActive: true
      });

      res.status(201).json({
        success: true,
        message: 'Slot created successfully',
        data: {
          slotId: newSlot._id,
          slotStart: newSlot.slot_time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          maxCapacity: newSlot.max_capacity,
          currentCount: 0,
          isActive: true,
          isFull: false
        }
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = slotController;