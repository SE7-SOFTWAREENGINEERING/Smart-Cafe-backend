const { validationResult } = require('express-validator');
const logger = require('../config/logger');

/**
 * Middleware to handle validation errors from express-validator
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value
    }));

    logger.warn(`Validation failed: ${JSON.stringify(formattedErrors)}`);

    return res.status(400).json({
      success: false,
      errorCode: 'VALIDATION_ERROR',
      message: 'Validation failed',
      errors: formattedErrors
    });
  }
  
  next();
};

module.exports = validate;