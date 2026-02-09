const express = require('express');
const router = express.Router();
const sustainabilityController = require('../controllers/sustainabilityController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { validateRequest, schemas } = require('../middleware/validation');

// Submit food waste report (authenticated users)
router.post(
    '/report',
    authenticateToken,
    validateRequest(schemas.sustainabilityReport),
    sustainabilityController.submitReport
);

// Get user's sustainability stats
router.get(
    '/my-stats',
    authenticateToken,
    sustainabilityController.getUserStats
);

// Get all reports (admin/staff only)
router.get(
    '/reports',
    authenticateToken,
    authorizeRoles('Admin', 'Manager', 'CanteenStaff'),
    sustainabilityController.getAllReports
);

module.exports = router;
