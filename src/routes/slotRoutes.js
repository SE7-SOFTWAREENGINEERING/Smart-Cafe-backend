const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const slotController = require('../controllers/slotController');
const { authenticate, authorize, validate } = require('../middleware');

/**
 * @route   POST /api/slots
 * @desc    Create meal slots for a menu
 * @access  Private (MANAGER, ADMIN)
 */
router.post(
  '/',
  authenticate,
  authorize(['MANAGER', 'ADMIN']),
  [
    body('menuId').isMongoId().withMessage('Valid menu ID is required'),
    body('slots').isArray({ min: 1 }).withMessage('At least one slot is required'),
    body('slots.*.slotStart').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid slot start time'),
    body('slots.*.slotEnd').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid slot end time'),
    body('slots.*.maxCapacity').optional().isInt({ min: 1 }).withMessage('Capacity must be at least 1')
  ],
  validate,
  slotController.createMealSlots
);

/**
 * @route   GET /api/slots/available
 * @desc    Get available slots for a specific date and meal type
 * @access  Private (STUDENT, STAFF, MANAGER, ADMIN)
 */
router.get(
  '/available',
  authenticate,
  authorize(['STUDENT', 'STAFF', 'MANAGER', 'ADMIN']),
  [
    query('date').notEmpty().isISO8601().withMessage('Valid date is required'),
    query('mealType').notEmpty().isIn(['BREAKFAST', 'LUNCH', 'DINNER']).withMessage('Valid meal type is required')
  ],
  validate,
  slotController.getAvailableSlots
);

/**
 * @route   GET /api/slots/live-capacity
 * @desc    Get live capacity view for all active slots
 * @access  Private (STAFF, MANAGER, ADMIN)
 */
router.get(
  '/live-capacity',
  authenticate,
  authorize(['STAFF', 'MANAGER', 'ADMIN']),
  [
    query('date').optional().isISO8601(),
    query('mealType').optional().isIn(['BREAKFAST', 'LUNCH', 'DINNER'])
  ],
  validate,
  slotController.getLiveCapacity
);

/**
 * @route   GET /api/slots/:slotId
 * @desc    Get slot by ID with booking details
 * @access  Private
 */
router.get(
  '/:slotId',
  authenticate,
  [
    param('slotId').isMongoId().withMessage('Valid slot ID is required')
  ],
  validate,
  slotController.getSlotById
);

/**
 * @route   PUT /api/slots/:slotId/capacity
 * @desc    Update slot capacity
 * @access  Private (MANAGER, ADMIN)
 */
router.put(
  '/:slotId/capacity',
  authenticate,
  authorize(['MANAGER', 'ADMIN']),
  [
    param('slotId').isMongoId().withMessage('Valid slot ID is required'),
    body('maxCapacity').isInt({ min: 1 }).withMessage('Capacity must be at least 1')
  ],
  validate,
  slotController.updateSlotCapacity
);

/**
 * @route   PUT /api/slots/:slotId/toggle
 * @desc    Toggle slot active status
 * @access  Private (MANAGER, ADMIN)
 */
router.put(
  '/:slotId/toggle',
  authenticate,
  authorize(['MANAGER', 'ADMIN']),
  [
    param('slotId').isMongoId().withMessage('Valid slot ID is required')
  ],
  validate,
  slotController.toggleSlotStatus
);

/**
 * @route   GET /api/slots/:slotId/logs
 * @desc    Get slot capacity logs
 * @access  Private (STAFF, MANAGER, ADMIN)
 */
router.get(
  '/:slotId/logs',
  authenticate,
  authorize(['STAFF', 'MANAGER', 'ADMIN']),
  [
    param('slotId').isMongoId().withMessage('Valid slot ID is required'),
    query('limit').optional().isInt({ min: 1, max: 200 })
  ],
  validate,
  slotController.getSlotCapacityLogs
);

module.exports = router;