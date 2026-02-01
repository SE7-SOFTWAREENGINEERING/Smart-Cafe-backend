const logger = require('../config/logger');

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  // Log error
  logger.error(`Error: ${err.message}`, {
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    user: req.user?.id
  });

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message
    }));

    return res.status(400).json({
      success: false,
      errorCode: 'VALIDATION_ERROR',
      message: 'Validation failed',
      errors: errors
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(409).json({
      success: false,
      errorCode: 'DUPLICATE_ENTRY',
      message: `${field} already exists`,
      field: field
    });
  }

  // Mongoose cast error
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      errorCode: 'INVALID_ID',
      message: 'Invalid ID format'
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      errorCode: 'INVALID_TOKEN',
      message: 'Invalid authentication token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      errorCode: 'TOKEN_EXPIRED',
      message: 'Authentication token has expired'
    });
  }

  // Default error
  const statusCode = err.statusCode || 500;
  const errorCode = err.errorCode || 'INTERNAL_ERROR';

  res.status(statusCode).json({
    success: false,
    errorCode: errorCode,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;