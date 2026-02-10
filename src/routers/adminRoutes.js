const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { validateRequest, schemas } = require('../middleware/validation');

// All routes require authentication
router.use(authenticateToken);

// User management (Admin or Manager)
// IDs: Match User model enum case (Admin, Manager, CanteenStaff, User)
router.get('/users', authorizeRoles('Admin', 'Manager'), adminController.getAllUsers);
router.patch('/users/:userId/role',
  authorizeRoles('Admin'),
  validateRequest(schemas.updateRole),
  adminController.updateUserRole
);

router.delete('/users/:userId', authorizeRoles('Admin', 'Manager'), adminController.deleteUser);

// Other routes require Admin
router.use(authorizeRoles('Admin', 'Manager'));

// Cafeteria timings
router.get('/timings', adminController.getCafeteriaTimings);
router.post('/timings',
  validateRequest(schemas.cafeteriaTiming),
  adminController.setCafeteriaTiming
);

// Capacity management
router.post('/capacity',
  authorizeRoles('Admin', 'Manager'),
  validateRequest(schemas.capacity),
  adminController.setSlotCapacity
);
router.get('/capacity', adminController.getSlotCapacity);
router.post('/capacity/bulk', adminController.bulkCreateCapacity);

// System statistics
router.get('/stats', adminController.getSystemStats);
router.get('/bookings', adminController.getAllBookings);

module.exports = router;