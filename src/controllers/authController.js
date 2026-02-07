const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authController = {
  // Register a new user
  register: async (req, res, next) => {
    try {
      const { fullName, email, password, role = 'User' } = req.body;

      // Check if user already exists (one email = one account)
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
        name: fullName,
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
        { expiresIn: process.env.JWT_EXPIRE || '24h' }
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
        { expiresIn: process.env.JWT_EXPIRE || '24h' }
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
  },

  // -------------------------------------------------------------------------
  // New OTP & Password Reset Logic
  // -------------------------------------------------------------------------

  sendOtp: async (req, res, next) => {
    try {
      const { email } = req.body;
      const user = await User.findOne({ email });

      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Save hashed OTP to DB (simple assignment for now, hash in prod)
      user.otp = otp;
      user.otp_expires = Date.now() + 10 * 60 * 1000; // 10 mins
      await user.save();

      // Send Email
      const sendEmail = require('../utils/emailService');
      const message = `Your Password Reset OTP is: ${otp}. It expires in 10 minutes.`;
      
      try {
        await sendEmail({
             email: user.email,
             subject: 'Smart Cafe - Password Reset OTP',
             message: message,
             html: `<p>Your Password Reset OTP is: <strong>${otp}</strong></p><p>It expires in 10 minutes.</p>`
        });

        res.json({ success: true, message: 'OTP sent to email' });
      } catch (err) {
        user.otp = undefined;
        user.otp_expires = undefined;
        await user.save();
        return res.status(500).json({ success: false, message: 'Email could not be sent' });
      }

    } catch (error) {
      next(error);
    }
  },

  verifyOtp: async (req, res, next) => {
     try {
         const { email, otp } = req.body;
         const user = await User.findOne({ 
             email, 
             otp,
             otp_expires: { $gt: Date.now() } 
         });

         if (!user) {
             return res.status(400).json({ success: false, message: 'Invalid or Expired OTP' });
         }

         // Mark verify logic if needed, or just return success token for reset
         // For Reset Password flow, we typically return a temp token or just allow next step.
         // Here we'll just confirm validity.
         
         res.json({ success: true, message: 'OTP Verified' });

     } catch (error) {
         next(error);
     }
  },

  resetPassword: async (req, res, next) => {
      try {
          const { email, otp, password } = req.body;
          
          const user = await User.findOne({ 
             email, 
             otp,
             otp_expires: { $gt: Date.now() } 
          });

          if (!user) {
             return res.status(400).json({ success: false, message: 'Invalid or Expired OTP' });
          }

          // Update Password
          user.password = await bcrypt.hash(password, 10);
          user.otp = undefined;
          user.otp_expires = undefined;
          await user.save();

          res.json({ success: true, message: 'Password Reset Successful' });

      } catch (error) {
          next(error);
      }
  }
};

module.exports = authController;