const express = require('express');
const router = express.Router();
const systemController = require('../controllers/systemController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// All routes require admin authentication
router.use(authenticateToken);
router.use(authorizeRoles('Admin'));

// Audit Logs
router.get('/audit-logs', systemController.getAuditLogs);

// Backups
router.get('/backups', systemController.getBackups);
router.post('/backups/trigger', systemController.triggerBackup);

// Analytics
router.get('/analytics', systemController.getAnalytics);

// Get all settings (with optional category filter)
router.get('/', systemController.getAllSettings);

// Get settings grouped by category
router.get('/grouped', systemController.getSettingsByCategory);

// Get a single setting by key (Generic - must be last GET)
router.get('/:key', systemController.getSetting);

// Create or update a setting
router.post('/', systemController.upsertSetting);

// Quick update setting value
router.patch('/:key', systemController.updateSettingValue);

// Delete a setting
router.delete('/:key', systemController.deleteSetting);

// Bulk update settings
router.post('/bulk', systemController.bulkUpdateSettings);

module.exports = router;
