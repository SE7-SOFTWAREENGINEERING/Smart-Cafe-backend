const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { validateRequest, schemas } = require('../middleware/validation');

// All routes require authentication
router.use(authenticateToken);

// User routes
router.post('/', 
  authorizeRoles('User', 'Admin'),
  validateRequest(schemas.booking), 
  bookingController.createBooking
);

router.get('/my-bookings', bookingController.getMyBookings);

router.get('/available-slots', bookingController.getAvailableSlots);

router.get('/:bookingId', bookingController.getBookingById);

router.patch('/:bookingId',
  authorizeRoles('User', 'Admin'),
  validateRequest(schemas.updateBooking),
  bookingController.updateBooking
);

module.exports = router;