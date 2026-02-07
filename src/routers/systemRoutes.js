const express = require('express');
const router = express.Router();
const systemController = require('../controllers/systemController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// All routes require admin authentication
router.use(authenticateToken);
router.use(authorizeRoles('Admin'));

// Get all settings (with optional category filter)
router.get('/', systemController.getAllSettings);

// Get settings grouped by category
router.get('/grouped', systemController.getSettingsByCategory);

// Get a single setting by key
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
