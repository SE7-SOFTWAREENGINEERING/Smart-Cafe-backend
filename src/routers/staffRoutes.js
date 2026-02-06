const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { validateRequest, schemas } = require('../middleware/validation');

// All routes require staff authentication
router.use(authenticateToken);
router.use(authorizeRoles('Staff', 'Manager', 'Admin'));

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

module.exports = router;