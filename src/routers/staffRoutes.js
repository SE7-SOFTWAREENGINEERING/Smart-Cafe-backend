const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { validateRequest, schemas } = require('../middleware/validation');

// All routes require canteen staff authentication
router.use(authenticateToken);
router.use(authorizeRoles('CanteenStaff', 'Manager', 'Admin'));

// Token scanning
router.post('/scan-token', staffController.scanToken);

// Walk-in token issuance
router.post('/walk-in-token', staffController.issueWalkInToken);

// Emergency announcements
router.post('/announcement',
  validateRequest(schemas.announcement),
  staffController.sendAnnouncement
);

// Queue monitoring
router.get('/queue-status', staffController.getQueueStatus);
router.get('/live-queue', staffController.getLiveQueue);
router.put('/queue/:bookingId/status', staffController.updateQueueStatus);

// Dashboard data
router.get('/announcements', staffController.getAnnouncements);
router.get('/occupancy', staffController.getOccupancy);

module.exports = router;