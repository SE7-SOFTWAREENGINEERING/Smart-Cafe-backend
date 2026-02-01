const jwt = require('jsonwebtoken');
const { User, UserRole, Role, AuditLog } = require('../models');
const logger = require('../config/logger');

/**
 * Generate JWT tokens
 */
const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '24h' }
  );

  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
  );

  return { accessToken, refreshToken };
};

/**
 * Register a new user
 */
exports.register = async (req, res, next) => {
  try {
    const { fullName, email, password, rollOrEmployeeId, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        errorCode: 'USER_EXISTS',
        message: 'User with this email already exists'
      });
    }

    // Create user
    const user = await User.create({
      fullName,
      email,
      passwordHash: password,
      rollOrEmployeeId
    });

    // Assign default role (STUDENT) if no role specified
    const roleName = role || 'STUDENT';
    const roleDoc = await Role.findOne({ roleName });
    
    if (roleDoc) {
      await UserRole.create({
        userId: user._id,
        roleId: roleDoc._id
      });
    }

    // Log audit
    await AuditLog.log({
      userId: user._id,
      action: 'User registered',
      entity: 'User',
      entityId: user._id,
      method: 'CREATE',
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id);

    // Update refresh token
    user.refreshToken = refreshToken;
    await user.save();

    logger.info(`User registered: ${user.email}`);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          rollOrEmployeeId: user.rollOrEmployeeId
        },
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login user
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        errorCode: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        errorCode: 'USER_INACTIVE',
        message: 'Your account has been deactivated'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        errorCode: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password'
      });
    }

    // Get user roles
    const userRoles = await UserRole.find({ userId: user._id }).populate('roleId');
    const roles = userRoles.map(ur => ur.roleId.roleName);

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id);

    // Update user
    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save();

    // Log audit
    await AuditLog.log({
      userId: user._id,
      action: 'User logged in',
      entity: 'User',
      entityId: user._id,
      method: 'READ',
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    logger.info(`User logged in: ${user.email}`);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          rollOrEmployeeId: user.rollOrEmployeeId,
          roles: roles
        },
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh access token
 */
exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        errorCode: 'REFRESH_TOKEN_REQUIRED',
        message: 'Refresh token is required'
      });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (error) {
      return res.status(401).json({
        success: false,
        errorCode: 'INVALID_REFRESH_TOKEN',
        message: 'Invalid or expired refresh token'
      });
    }

    // Find user
    const user = await User.findById(decoded.userId);
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({
        success: false,
        errorCode: 'INVALID_REFRESH_TOKEN',
        message: 'Invalid refresh token'
      });
    }

    // Generate new tokens
    const tokens = generateTokens(user._id);

    // Update refresh token
    user.refreshToken = tokens.refreshToken;
    await user.save();

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: tokens
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Logout user
 */
exports.logout = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (user) {
      user.refreshToken = null;
      await user.save();

      // Log audit
      await AuditLog.log({
        userId: user._id,
        action: 'User logged out',
        entity: 'User',
        entityId: user._id,
        method: 'UPDATE',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });
    }

    logger.info(`User logged out: ${req.user.email}`);

    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user profile
 */
exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    const userRoles = await UserRole.find({ userId: user._id }).populate('roleId');
    const roles = userRoles.map(ur => ur.roleId.roleName);

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          rollOrEmployeeId: user.rollOrEmployeeId,
          roles: roles,
          isActive: user.isActive,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
};