const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authController = {
  // Register a new user
  register: async (req, res, next) => {
    try {
      const { name, email, password, role = 'Student' } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ email });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'User with this email already exists'
        });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Generate next user_id (simple auto-increment simulation or random)
      // Since schema uses integer IDs, we can't use ObjectId.
      // Ideally we'd use a counter, but for this exercise I'll generating a random ID or find max.
      // To keep it robust without extra collections, I'll find max or use timestamp/random logic.
      // Better: Find max user_id and increment.
      const lastUser = await User.findOne().sort({ user_id: -1 });
      const nextId = lastUser ? lastUser.user_id + 1 : 1;

      // Create user
      const user = await User.create({
        user_id: nextId,
        name,
        email,
        password: passwordHash,
        role
      });

      // Generate token
      const token = jwt.sign(
        { 
          userId: user.user_id, 
          email: user.email, 
          role: user.role 
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            userId: user.user_id,
            name: user.name,
            email: user.email,
            role: user.role
          },
          token
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Login user
  login: async (req, res, next) => {
    try {
      const { email, password } = req.body;

      // Find user
      const user = await User.findOne({ email });

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Generate token
      const token = jwt.sign(
        { 
          userId: user.user_id, 
          email: user.email, 
          role: user.role 
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            userId: user.user_id,
            name: user.name,
            email: user.email,
            role: user.role
          },
          token
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Get current user profile
  getProfile: async (req, res, next) => {
    try {
      const user = await User.findOne({ user_id: req.user.userId });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        data: {
          userId: user.user_id,
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.created_at
        }
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = authController;