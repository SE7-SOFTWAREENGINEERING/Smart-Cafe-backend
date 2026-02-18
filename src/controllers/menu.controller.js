const { menuService } = require('../services');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');

// ==================== MENU CONTROLLERS ====================

/**
 * Get all menus
 * GET /api/menus
 */
const getMenus = catchAsync(async (req, res) => {
  const result = await menuService.getMenus(req.query);
  
  ApiResponse.ok(res, 'Menus retrieved', result);
});

/**
 * Get menu by ID
 * GET /api/menus/:id
 */
const getMenuById = catchAsync(async (req, res) => {
  const menu = await menuService.getMenuById(req.params.id);
  
  ApiResponse.ok(res, 'Menu retrieved', menu);
});

/**
 * Create new menu
 * POST /api/menus
 */
const createMenu = catchAsync(async (req, res) => {
  const menu = await menuService.createMenu(req.body, req.userId);
  
  ApiResponse.created(res, 'Menu created', menu);
});

/**
 * Update menu
 * PATCH /api/menus/:id
 */
const updateMenu = catchAsync(async (req, res) => {
  const menu = await menuService.updateMenu(req.params.id, req.body);
  
  ApiResponse.ok(res, 'Menu updated', menu);
});

/**
 * Delete menu
 * DELETE /api/menus/:id
 */
const deleteMenu = catchAsync(async (req, res) => {
  await menuService.deleteMenu(req.params.id);
  
  ApiResponse.ok(res, 'Menu deleted');
});

// ==================== MENU ITEM CONTROLLERS ====================

/**
 * Get all menu items (public)
 * GET /api/menu-items
 */
const getAllMenuItems = catchAsync(async (req, res) => {
  const items = await menuService.getAllMenuItems(req.query);
  
  ApiResponse.ok(res, 'Menu items retrieved', items);
});

/**
 * Get menu item by ID
 * GET /api/menu-items/:id
 */
const getMenuItemById = catchAsync(async (req, res) => {
  const item = await menuService.getMenuItemById(req.params.id);
  
  ApiResponse.ok(res, 'Menu item retrieved', item);
});

/**
 * Create menu item
 * POST /api/menu-items
 */
const createMenuItem = catchAsync(async (req, res) => {
  const item = await menuService.createMenuItem(req.body);
  
  ApiResponse.created(res, 'Menu item created', item);
});

/**
 * Update menu item
 * PATCH /api/menu-items/:id
 */
const updateMenuItem = catchAsync(async (req, res) => {
  const item = await menuService.updateMenuItem(req.params.id, req.body);
  
  ApiResponse.ok(res, 'Menu item updated', item);
});

/**
 * Delete menu item
 * DELETE /api/menu-items/:id
 */
const deleteMenuItem = catchAsync(async (req, res) => {
  await menuService.deleteMenuItem(req.params.id);
  
  ApiResponse.ok(res, 'Menu item deleted');
});

/**
 * Toggle menu item availability
 * PATCH /api/menu-items/:id/toggle
 */
const toggleItemAvailability = catchAsync(async (req, res) => {
  const item = await menuService.toggleItemAvailability(req.params.id);
  
  ApiResponse.ok(res, `Item is now ${item.isAvailable ? 'available' : 'unavailable'}`, item);
});

module.exports = {
  // Menus
  getMenus,
  getMenuById,
  createMenu,
  updateMenu,
  deleteMenu,
  
  // Menu Items
  getAllMenuItems,
  getMenuItemById,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleItemAvailability,
};

