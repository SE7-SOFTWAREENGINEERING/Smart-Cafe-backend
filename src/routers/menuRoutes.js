const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Public routes
router.get('/', menuController.getMenu); // Legacy endpoint for backward compatibility

// Protected routes - Any authenticated user
router.get('/list', authenticateToken, menuController.getMenus);
router.get('/:menuId', authenticateToken, menuController.getMenuById);
router.get('/:menuId/items', authenticateToken, menuController.getMenuItems);

// Menu item detail - for student item page
router.get('/items/daily', authenticateToken, menuController.getDailyMenuItems);
router.get('/items/:itemId', authenticateToken, menuController.getMenuItem);

// Admin only routes - Menu management
router.post('/', authenticateToken, authorizeRoles('Admin', 'Manager'), menuController.createMenu);
router.put('/:menuId', authenticateToken, authorizeRoles('Admin', 'Manager'), menuController.updateMenu);
router.delete('/:menuId', authenticateToken, authorizeRoles('Admin'), menuController.deleteMenu);

// Admin only routes - Menu item management
router.post('/items', authenticateToken, authorizeRoles('Admin', 'Manager'), menuController.createMenuItem);
router.put('/items/:itemId', authenticateToken, authorizeRoles('Admin', 'Manager'), menuController.updateMenuItem);
router.delete('/items/:itemId', authenticateToken, authorizeRoles('Admin'), menuController.deleteMenuItem);

module.exports = router;
