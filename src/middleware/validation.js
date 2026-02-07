const Joi = require('joi');

const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      console.log('Validation Error:', JSON.stringify(errors, null, 2));
      console.log('Request Body:', req.body);
      
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }
    
    next();
  };
};

// Validation schemas
const schemas = {
  register: Joi.object({
    fullName: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    role: Joi.string().valid('User', 'CanteenStaff', 'Manager', 'Admin').default('User')
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  sendOtp: Joi.object({
    email: Joi.string().email().required()
  }),

  verifyOtp: Joi.object({
    email: Joi.string().email().required(),
    otp: Joi.string().length(6).pattern(/^\d+$/).required()
  }),

  resetPassword: Joi.object({
    email: Joi.string().email().required(),
    otp: Joi.string().length(6).pattern(/^\d+$/).required(),
    password: Joi.string().min(6).required()
  }),

  booking: Joi.object({
    slot_time: Joi.date().iso().required(),
    meal_type: Joi.string().valid('Breakfast', 'Lunch', 'Snacks', 'Dinner').required()
  }),

  updateBooking: Joi.object({
    action: Joi.string().valid('cancel', 'reschedule').required(),
    new_slot_time: Joi.date().iso().when('action', {
      is: 'reschedule',
      then: Joi.required(),
      otherwise: Joi.forbidden()
    })
  }),

  capacity: Joi.object({
    slot_time: Joi.date().iso().required(),
    meal_type: Joi.string().valid('Breakfast', 'Lunch', 'Snacks', 'Dinner').required(),
    max_capacity: Joi.number().integer().min(1).required(),
    priority_capacity: Joi.number().integer().min(0).default(5)
  }),

  cafeteriaTiming: Joi.object({
    day: Joi.string().valid('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday').required(),
    meal_type: Joi.string().valid('Breakfast', 'Lunch', 'Snacks', 'Dinner').required(),
    opening_time: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/).required(),
    closing_time: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/).required(),
    is_holiday: Joi.boolean().default(false),
    specific_date: Joi.date().iso().allow(null)
  }),

  announcement: Joi.object({
    message: Joi.string().min(10).max(500).required()
  }),

  wasteReport: Joi.object({
    meal_type: Joi.string().valid('Breakfast', 'Lunch', 'Snacks', 'Dinner').required(),
    reason: Joi.string().min(10).max(500).required()
  }),

  updateRole: Joi.object({
    role: Joi.string().valid('User', 'CanteenStaff', 'Manager', 'Admin').required(),
    is_priority: Joi.boolean()
  })
};

module.exports = {
  validateRequest,
  schemas
};