const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { validateRequest, schemas } = require('../middleware/validation');

// All routes require admin authentication
router.use(authenticateToken);
router.use(authorizeRoles('Admin'));

// User management
router.get('/users', adminController.getAllUsers);
router.patch('/users/:userId/role',
  validateRequest(schemas.updateRole),
  adminController.updateUserRole
);
router.post('/users', adminController.createUser);
router.delete('/users/:userId', adminController.deleteUser);
router.patch('/users/:userId/status', adminController.updateUserStatus);

// Removed orphaned cafeteria timings and capacity endpoints.

// System statistics
router.get('/stats', adminController.getSystemStats);
router.get('/bookings', adminController.getAllBookings);

module.exports = router;