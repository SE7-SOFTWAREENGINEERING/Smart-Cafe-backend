const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const tokenController = require('../controllers/tokenController');
const { authenticate, authorize, validate } = require('../middleware');

/**
 * @route   POST /api/tokens/validate
 * @desc    Validate and scan token
 * @access  Private (STAFF)
 */
router.post(
  '/validate',
  authenticate,
  authorize(['STAFF', 'MANAGER', 'ADMIN']),
  [
    body('tokenCode').notEmpty().withMessage('Token code is required')
  ],
  validate,
  tokenController.validateToken
);

/**
 * @route   GET /api/tokens/booking/:bookingId
 * @desc    Get token by booking ID
 * @access  Private
 */
router.get(
  '/booking/:bookingId',
  authenticate,
  [
    param('bookingId').isMongoId().withMessage('Valid booking ID is required')
  ],
  validate,
  tokenController.getTokenByBooking
);

/**
 * @route   GET /api/tokens/code/:tokenCode
 * @desc    Get token details by token code
 * @access  Private
 */
router.get(
  '/code/:tokenCode',
  authenticate,
  [
    param('tokenCode').notEmpty().withMessage('Token code is required')
  ],
  validate,
  tokenController.getTokenByCode
);

/**
 * @route   POST /api/tokens/cleanup
 * @desc    Cleanup expired tokens
 * @access  Private (ADMIN)
 */
router.post(
  '/cleanup',
  authenticate,
  authorize(['ADMIN']),
  tokenController.cleanupExpiredTokens
);

module.exports = router;