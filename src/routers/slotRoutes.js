const express = require('express');
const router = express.Router();
const slotController = require('../controllers/slotController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Get live slots (Admin/Manager/Staff view)
router.get('/live-capacity',
  authorizeRoles('Admin', 'Manager', 'Staff'),
  slotController.getLiveSlots
);

// Update slot capacity
router.put('/:slotId/capacity',
  authorizeRoles('Admin', 'Manager'),
  slotController.updateSlotCapacity
);

// Toggle slot status (Cancel/Open)
router.put('/:slotId/toggle',
  authorizeRoles('Admin', 'Manager'),
  slotController.toggleSlotStatus
);

// Get bookings for a slot
router.get('/:slotId/bookings',
  authorizeRoles('Admin', 'Manager', 'Staff'),
  slotController.getSlotBookings
);

// Add walk-in bookings
router.post('/:slotId/walk-in',
  authorizeRoles('Admin', 'Manager'),
  slotController.addWalkInBookings
);

// Create new slot
router.post('/',
  authorizeRoles('Admin', 'Manager'),
  slotController.createSlot
);

// Delete slot
router.delete('/:slotId',
  authorizeRoles('Admin', 'Manager'),
  slotController.deleteSlot
);

module.exports = router;