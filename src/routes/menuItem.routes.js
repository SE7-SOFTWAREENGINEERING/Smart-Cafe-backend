const express = require('express');
const router = express.Router();
const { menuController } = require('../controllers');
const { authenticate, optionalAuth, isManagement, validate } = require('../middlewares');
const { menuValidation } = require('../validations');

// Public routes (students can view)
router.get('/', optionalAuth, menuController.getAllMenuItems);
router.get('/:id', optionalAuth, menuController.getMenuItemById);

// Protected routes (Management only)
router.post('/', authenticate, isManagement, validate(menuValidation.createMenuItem), menuController.createMenuItem);
router.patch('/:id', authenticate, isManagement, validate(menuValidation.updateMenuItem), menuController.updateMenuItem);
router.delete('/:id', authenticate, isManagement, menuController.deleteMenuItem);
router.patch('/:id/toggle', authenticate, isManagement, menuController.toggleItemAvailability);

module.exports = router;
