const express = require('express');
const router = express.Router();
const systemController = require('../controllers/systemController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// All routes require admin authentication
router.use(authenticateToken);
// GET routes accessible by Admin and Manager
router.get('/', authorizeRoles('Admin', 'Manager'), systemController.getAllSettings);
router.get('/grouped', authorizeRoles('Admin', 'Manager'), systemController.getSettingsByCategory);
router.get('/:key', authorizeRoles('Admin', 'Manager'), systemController.getSetting);

// Modification routes require Admin only
router.use(authorizeRoles('Admin'));

// Create or update a setting
router.post('/', systemController.upsertSetting);

// Quick update setting value
router.patch('/:key', systemController.updateSettingValue);

// Delete a setting
router.delete('/:key', systemController.deleteSetting);

// Bulk update settings
router.post('/bulk', systemController.bulkUpdateSettings);

module.exports = router;
