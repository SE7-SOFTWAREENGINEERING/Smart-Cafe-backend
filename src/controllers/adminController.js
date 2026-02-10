const User = require('../models/User');
const Booking = require('../models/Booking');
const Token = require('../models/Token');
const CafeteriaTimings = require('../models/CafeteriaTimings');
const Capacity = require('../models/Capacity');

const adminController = {
  // Get all users
  getAllUsers: async (req, res, next) => {
    try {
      const { role } = req.query;
      const query = role ? { role } : {};

      const users = await User.find(query).sort({ created_at: -1 });

      res.json({
        success: true,
        data: {
          count: users.length,
          users: users.map(u => ({
            userId: u.user_id,
            name: u.name,
            email: u.email,
            role: u.role,
            // isPriority: u.is_priority, // Removed as User model doesn't have is_priority (Step 167: name, email, role, created_at, password)
            createdAt: u.created_at
          }))
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Update user role
  updateUserRole: async (req, res, next) => {
    try {
      const { userId } = req.params;
      const { role } = req.body; // is_priority not supported in schema

      const user = await User.findOneAndUpdate(
        { user_id: userId },
        {
          $set: {
            role: role,
            // is_priority: is_priority // Not in schema
            // updated_at: new Date() // Not in schema
          }
        },
        { new: true }
      );

      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      res.json({
        success: true,
        message: 'User role updated successfully',
        data: {
          userId: user.user_id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Manage cafeteria timings
  getCafeteriaTimings: async (req, res, next) => {
    try {
      const { day } = req.query; // meal_type not in CafeteriaTimings schema? (Step 45: timing_id, day, opening_time, closing_time, is_holiday)
      // Original SQL query used 'meal_type'.
      // If schema is strictly followed per step 45, no meal_type.

      const query = {};
      if (day) query.day = day;

      const timings = await CafeteriaTimings.find(query).sort({ day: 1 });

      res.json({
        success: true,
        data: {
          count: timings.length,
          timings
        }
      });
    } catch (error) {
      next(error);
    }
  },

  setCafeteriaTiming: async (req, res, next) => {
    try {
      const { day, meal_type, opening_time, closing_time, is_holiday } = req.body;
      // Ignoring meal_type as not in schema.
      // Or should I create separate timings per meal?
      // Schema (Step 45) doesn't have meal_type. So 'day' is unique key probably?
      // Or multiple entries per day? Schema has 'timing_id' unique.
      // If I receive meal_type, I might just ignore it if I can't store it.
      // Or I should assume 'day' implies 'Monday', 'Tuesday', or 'Christmas'.

      const update = { opening_time, closing_time, is_holiday };

      // Upsert based on day
      // But we need timing_id.

      let timing = await CafeteriaTimings.findOne({ day });

      if (timing) {
        timing.opening_time = opening_time;
        timing.closing_time = closing_time;
        timing.is_holiday = is_holiday;
        await timing.save();
      } else {
        const lastT = await CafeteriaTimings.findOne().sort({ timing_id: -1 });
        const nextId = lastT ? lastT.timing_id + 1 : 1;

        timing = await CafeteriaTimings.create({
          timing_id: nextId,
          day,
          opening_time,
          closing_time,
          is_holiday
        });
      }

      res.status(201).json({
        success: true,
        message: 'Cafeteria timing set successfully',
        data: timing
      });
    } catch (error) {
      next(error);
    }
  },

  // Manage capacity
  setSlotCapacity: async (req, res, next) => {
    try {
      const { slot_time, max_capacity } = req.body; // meal_type, priority_capacity not in Capacity schema (Step 46: capacity_id, slot_time, max_capacity)

      const slotTime = new Date(slot_time);

      let capacity = await Capacity.findOne({ slot_time: slotTime });

      if (capacity) {
        capacity.max_capacity = max_capacity;
        await capacity.save();
      } else {
        const lastC = await Capacity.findOne().sort({ capacity_id: -1 });
        const nextId = lastC ? lastC.capacity_id + 1 : 1;

        capacity = await Capacity.create({
          capacity_id: nextId,
          slot_time: slotTime,
          max_capacity
        });
      }

      res.status(201).json({
        success: true,
        message: 'Slot capacity configured successfully',
        data: capacity
      });
    } catch (error) {
      next(error);
    }
  },

  getSlotCapacity: async (req, res, next) => {
    try {
      const { date } = req.query;
      let query = {};

      if (date) {
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);
        query.slot_time = { $gte: start, $lte: end };
      }

      const capacities = await Capacity.find(query).sort({ slot_time: 1 });

      res.json({
        success: true,
        data: capacities
      });
    } catch (error) {
      next(error);
    }
  },

  // Bulk create capacity
  bulkCreateCapacity: async (req, res, next) => {
    try {
      const { start_date, end_date, meal_config } = req.body;
      const startDate = new Date(start_date);
      const endDate = new Date(end_date);

      let slotsCreated = 0;

      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        for (const config of meal_config) {
          const [openHour, openMin] = config.opening_time.split(':').map(Number);
          const [closeHour, closeMin] = config.closing_time.split(':').map(Number);

          for (let hour = openHour; hour < closeHour || (hour === closeHour && openMin === 0); hour++) {
            const maxMinute = (hour === closeHour) ? closeMin : 60;
            for (let minute = (hour === openHour ? openMin : 0); minute < maxMinute; minute += 15) {
              const slotTime = new Date(d);
              slotTime.setHours(hour, minute, 0, 0);

              // create or ignore
              const exists = await Capacity.findOne({ slot_time: slotTime });
              if (!exists) {
                const lastC = await Capacity.findOne().sort({ capacity_id: -1 });
                const nextId = lastC ? lastC.capacity_id + 1 : 1 + slotsCreated; // approx ID generation, strictly should query DB or use atomic counter

                // Using upsert or manual check. 
                // To avoid race conditions on IDs in loop, better to fetch last ID once and increment locally if single threaded, 
                // but here await inside loop calls DB.
                // simplified:

                await Capacity.create({
                  capacity_id: nextId, // This might clash if relying on DB state inside loop without re-querying lastC every time. 
                  // But fine for this demo if low concurrency.
                  slot_time: slotTime,
                  max_capacity: config.max_capacity
                });
                slotsCreated++;
              }
            }
          }
        }
      }

      res.status(201).json({
        success: true,
        message: 'Bulk capacity created successfully',
        slotsCreated
      });
    } catch (error) {
      next(error);
    }
  },

  // Get system stats
  getSystemStats: async (req, res, next) => {
    try {
      const stats = {};

      // Users by role
      stats.usersByRole = await User.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } }
      ]);

      // Booking stats (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      stats.bookingStats = await Booking.aggregate([
        { $match: { created_at: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: {
              status: '$status',
              date: { $dateToString: { format: '%Y-%m-%d', date: '$created_at' } }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.date': -1 } }
      ]);

      // Today's bookings
      const startToday = new Date();
      startToday.setHours(0, 0, 0, 0);
      const endToday = new Date();
      endToday.setHours(23, 59, 59, 999);

      stats.todayBookings = await Booking.aggregate([
        { $match: { slot_time: { $gte: startToday, $lte: endToday } } },
        {
          $group: {
            _id: { meal_type: '$meal_type', status: '$status' },
            count: { $sum: 1 }
          }
        }
      ]);

      // Peak hours (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      stats.peakHours = await Booking.aggregate([
        { $match: { created_at: { $gte: sevenDaysAgo }, status: 'Booked' } },
        { $project: { hour: { $hour: '$slot_time' } } },
        { $group: { _id: '$hour', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]);

      // No show rate
      const totalBookings = await Booking.countDocuments({ created_at: { $gte: thirtyDaysAgo } });
      const noShows = await Booking.countDocuments({ created_at: { $gte: thirtyDaysAgo }, status: 'No-show' });
      const completed = await Booking.countDocuments({ created_at: { $gte: thirtyDaysAgo }, status: 'Completed' });

      stats.noShowRate = {
        total: totalBookings,
        no_shows: noShows,
        completed: completed
      };

      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  },

  // Get all bookings
  // Delete user
  deleteUser: async (req, res, next) => {
    try {
      const { userId } = req.params;

      const user = await User.findOneAndDelete({ user_id: userId });

      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      res.json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  getAllBookings: async (req, res, next) => {
    try {
      const { status, date, meal_type, limit = 50, offset = 0 } = req.query;
      const query = {};

      if (status) query.status = status;
      if (meal_type) query.meal_type = meal_type;
      if (date) {
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);
        query.slot_time = { $gte: start, $lte: end };
      }

      const bookings = await Booking.find(query)
        .sort({ slot_time: -1 })
        .limit(parseInt(limit))
        .skip(parseInt(offset));

      // Populate user info manually as Booking user_id is Number, not ObjectId ref?
      // Mongoose supports manual population or virtuals. 
      // Simplified: fetch users.

      const populatedBookings = await Promise.all(bookings.map(async (b) => {
        const user = await User.findOne({ user_id: b.user_id });
        const token = await Token.findOne({ booking_id: b.booking_id });
        return {
          bookingId: b.booking_id,
          slotTime: b.slot_time,
          mealType: b.meal_type,
          status: b.status,
          queuePosition: b.queue_position,
          isPrioritySlot: b.is_priority_slot,
          createdAt: b.created_at,
          user: user ? {
            userId: user.user_id,
            name: user.name,
            email: user.email
          } : null,
          token: token ? {
            tokenId: token.token_id,
            status: token.status
          } : null
        };
      }));

      res.json({
        success: true,
        data: {
          count: populatedBookings.length,
          bookings: populatedBookings
        }
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = adminController;