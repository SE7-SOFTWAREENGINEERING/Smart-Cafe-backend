const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const bookingController = require('../controllers/bookingController');
const { authenticate, authorize, validate } = require('../middleware');

/**
 * @route   POST /api/bookings
 * @desc    Create a new booking
 * @access  Private (USER)
 */
router.post(
  '/',
  authenticate,
  authorize(['USER']),
  [
    body('mealSlotId').isMongoId().withMessage('Valid meal slot ID is required'),
    body('bookingDate').isISO8601().withMessage('Valid booking date is required')
  ],
  validate,
  bookingController.createBooking
);

/**
 * @route   GET /api/bookings/user/:userId
 * @desc    Get user's bookings
 * @access  Private (USER, CANTEEN_STAFF, MANAGER, ADMIN)
 */
router.get(
  '/user/:userId?',
  authenticate,
  authorize(['USER', 'CANTEEN_STAFF', 'MANAGER', 'ADMIN']),
  [
    param('userId').optional().isMongoId().withMessage('Valid user ID is required'),
    query('status').optional().isIn(['BOOKED', 'CANCELLED', 'CONSUMED', 'NO_SHOW']),
    query('fromDate').optional().isISO8601(),
    query('toDate').optional().isISO8601()
  ],
  validate,
  bookingController.getUserBookings
);

/**
 * @route   GET /api/bookings/:bookingId
 * @desc    Get booking by ID
 * @access  Private
 */
router.get(
  '/:bookingId',
  authenticate,
  [
    param('bookingId').isMongoId().withMessage('Valid booking ID is required')
  ],
  validate,
  bookingController.getBookingById
);

/**
 * @route   PUT /api/bookings/:bookingId/cancel
 * @desc    Cancel a booking
 * @access  Private (USER, ADMIN)
 */
router.put(
  '/:bookingId/cancel',
  authenticate,
  authorize(['USER', 'ADMIN']),
  [
    param('bookingId').isMongoId().withMessage('Valid booking ID is required'),
    body('reason').optional().trim()
  ],
  validate,
  bookingController.cancelBooking
);

/**
 * @route   PUT /api/bookings/:bookingId/reschedule
 * @desc    Reschedule a booking
 * @access  Private (USER)
 */
router.put(
  '/:bookingId/reschedule',
  authenticate,
  authorize(['USER']),
  [
    param('bookingId').isMongoId().withMessage('Valid booking ID is required'),
    body('newMealSlotId').isMongoId().withMessage('Valid new meal slot ID is required'),
    body('newBookingDate').isISO8601().withMessage('Valid new booking date is required')
  ],
  validate,
  bookingController.rescheduleBooking
);

module.exports = router;