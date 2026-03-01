const User = require('../models/User');
const bcrypt = require('bcrypt');
const Booking = require('../models/Booking');
const Token = require('../models/Token');

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
            status: u.status, // Added status
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

  // Create new user (Admin)
  createUser: async (req, res, next) => {
    try {
      const { name, email, password, role } = req.body;

      // Check if user exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(409).json({ success: false, message: 'User already exists' });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Generate ID
      const lastUser = await User.findOne().sort({ user_id: -1 });
      const nextId = lastUser ? lastUser.user_id + 1 : 1;

      // Normalize role input using a map
      const roleMap = {
        'user': 'User',
        'canteen_staff': 'CanteenStaff',
        'kitchen_staff': 'KitchenStaff',
        'counter_staff': 'CounterStaff',
        'canteenstaff': 'CanteenStaff', // Handle typo just in case
        'manager': 'Manager',
        'admin': 'Admin'
      };

      const normalizedRole = roleMap[role ? role.toLowerCase() : 'user'] || 'User';

      const user = await User.create({
        user_id: nextId,
        name,
        email,
        password: passwordHash,
        role: normalizedRole,
        status: 'Active'
      });

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: { userId: user.user_id, name: user.name, email: user.email, role: user.role, status: user.status }
      });
    } catch (error) {
      next(error);
    }
  },

  // Delete user
  deleteUser: async (req, res, next) => {
    try {
      const { userId } = req.params;
      await User.findOneAndDelete({ user_id: userId });
      res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
      next(error);
    }
  },

  // Update user status
  updateUserStatus: async (req, res, next) => {
    try {
      const { userId } = req.params;
      const { status } = req.body;

      const user = await User.findOneAndUpdate(
        { user_id: userId },
        { status },
        { new: true }
      );

      if (!user) return res.status(404).json({ success: false, message: 'User not found' });

      res.json({ success: true, message: 'User status updated', data: user });
    } catch (error) {
      next(error);
    }
  },

  // Legacy endpoints for Cafeteria Timings & Capacity were removed to standardize storage in SystemSettings.

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