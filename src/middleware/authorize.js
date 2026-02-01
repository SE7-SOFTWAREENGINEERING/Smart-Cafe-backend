const logger = require('../config/logger');

/**
 * Role-based authorization middleware
 * @param {string[]} allowedRoles - Array of roles that can access the route
 * @returns {Function} Express middleware function
 */
const authorize = (allowedRoles = []) => {
  return (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.user || !req.user.roles) {
        return res.status(401).json({
          success: false,
          errorCode: 'UNAUTHORIZED',
          message: 'Authentication required'
        });
      }

      // Check if user has at least one of the allowed roles
      const hasRole = req.user.roles.some(role => 
        allowedRoles.includes(role)
      );

      if (!hasRole) {
        logger.warn(`Access denied for user ${req.user.id} with roles ${req.user.roles.join(', ')}. Required: ${allowedRoles.join(', ')}`);
        
        return res.status(403).json({
          success: false,
          errorCode: 'ACCESS_DENIED',
          message: 'You do not have permission to access this resource',
          requiredRoles: allowedRoles,
          userRoles: req.user.roles
        });
      }

      next();
    } catch (error) {
      logger.error(`Authorization error: ${error.message}`);
      return res.status(500).json({
        success: false,
        errorCode: 'AUTHORIZATION_ERROR',
        message: 'Authorization check failed'
      });
    }
  };
};

module.exports = authorize;