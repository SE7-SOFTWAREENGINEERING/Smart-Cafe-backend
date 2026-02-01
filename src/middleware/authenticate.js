const jwt = require('jsonwebtoken');
const { User, UserRole, Role } = require('../models');
const logger = require('../config/logger');

const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        errorCode: 'AUTH_TOKEN_MISSING',
        message: 'Authentication token is required'
      });
    }

    const token = authHeader.substring(7);

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          errorCode: 'AUTH_TOKEN_EXPIRED',
          message: 'Authentication token has expired'
        });
      }
      return res.status(401).json({
        success: false,
        errorCode: 'AUTH_TOKEN_INVALID',
        message: 'Invalid authentication token'
      });
    }

    // Get user from database
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        errorCode: 'USER_NOT_FOUND',
        message: 'User not found'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        errorCode: 'USER_INACTIVE',
        message: 'User account is inactive'
      });
    }

    // Get user roles
    const userRoles = await UserRole.find({ userId: user._id }).populate('roleId');
    const roles = userRoles.map(ur => ur.roleId.roleName);

    // Attach user and roles to request
    req.user = {
      id: user._id,
      email: user.email,
      fullName: user.fullName,
      roles: roles
    };

    next();
  } catch (error) {
    logger.error(`Authentication error: ${error.message}`);
    return res.status(500).json({
      success: false,
      errorCode: 'AUTH_ERROR',
      message: 'Authentication failed'
    });
  }
};

module.exports = authenticate;