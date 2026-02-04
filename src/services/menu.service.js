const { Menu, MenuItem } = require("../models");
const {
  parsePagination,
  paginateResponse,
  getDayBounds,
} = require("../utils/helpers");
const ApiError = require("../utils/ApiError");

// ==================== MENU OPERATIONS ====================

/**
 * Get all menus with filters
 */
const getMenus = async (query) => {
  const { page, limit, skip } = parsePagination(query);

  const filter = {};

  if (query.date) {
    const { start, end } = getDayBounds(query.date);
    filter.menuDate = { $gte: start, $lte: end };
  }

  if (query.mealType) {
    filter.mealType = query.mealType;
  }

  if (query.isActive !== undefined) {
    filter.isActive = query.isActive;
  }

  const [menus, total] = await Promise.all([
    Menu.find(filter)
      .populate("items")
      .sort({ menuDate: -1, mealType: 1 })
      .skip(skip)
      .limit(limit),
    Menu.countDocuments(filter),
  ]);

  return paginateResponse(menus, total, page, limit);
};

/**
 * Get menu by ID
 */
const getMenuById = async (id) => {
  const menu = await Menu.findById(id).populate("items");

  if (!menu) {
    throw ApiError.notFound("Menu not found");
  }

  return menu;
};

/**
 * Create new menu
 */
const createMenu = async (data, userId) => {
  // Check for duplicate (same date and meal type)
  const { start, end } = getDayBounds(data.menuDate);
  const existing = await Menu.findOne({
    menuDate: { $gte: start, $lte: end },
    mealType: data.mealType,
  });

  if (existing) {
    throw ApiError.conflict(
      `Menu for ${data.mealType} on this date already exists`,
    );
  }

  const menu = await Menu.create({
    ...data,
    createdBy: userId,
  });

  return menu;
};

/**
 * Update menu
 */
const updateMenu = async (id, data) => {
  const menu = await Menu.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  }).populate("items");

  if (!menu) {
    throw ApiError.notFound("Menu not found");
  }

  return menu;
};

/**
 * Delete menu
 */
const deleteMenu = async (id) => {
  const menu = await Menu.findByIdAndDelete(id);

  if (!menu) {
    throw ApiError.notFound("Menu not found");
  }

  // Also delete associated menu items
  await MenuItem.deleteMany({ menu: id });

  return menu;
};

// ==================== MENU ITEM OPERATIONS ====================

/**
 * Get all menu items (public)
 */
/**
 * Get all menu items (public)
 */
const getAllMenuItems = async (query = {}) => {
  const filter = {};

  if (query.category) {
    filter.category = query.category;
  }

  if (query.dietaryType) {
    filter.dietaryType = query.dietaryType;
  }

  // Backward compatibility for isVeg filtering if dietaryType is not provided
  if (query.isVeg !== undefined && !query.dietaryType) {
    filter.isVeg = query.isVeg;
  }

  if (query.isAvailable !== undefined) {
    filter.isAvailable = query.isAvailable;
  }

  if (query.canteen) {
    filter.canteens = query.canteen;
  }

  const items = await MenuItem.find(filter)
    .populate("canteens", "name")
    .sort({ category: 1, itemName: 1 });

  return items;
};

/**
 * Get menu item by ID
 */
const getMenuItemById = async (id) => {
  const item = await MenuItem.findById(id).populate("canteens", "name");

  if (!item) {
    throw ApiError.notFound("Menu item not found");
  }

  return item;
};

/**
 * Create menu item
 */
const createMenuItem = async (data) => {
  const item = await MenuItem.create(data);

  // If menuId is provided, add item to menu
  if (data.menuId) {
    await Menu.findByIdAndUpdate(data.menuId, {
      $addToSet: { items: item._id },
    });
    item.menu = data.menuId;
    await item.save();
  }

  await item.populate("canteens", "name");

  return item;
};

/**
 * Update menu item
 */
const updateMenuItem = async (id, data) => {
  const { menuId, ...updateData } = data;

  const item = await MenuItem.findById(id);

  if (!item) {
    throw ApiError.notFound("Menu item not found");
  }

  // Re-associate menu if requested
  if (menuId && item.menu?.toString() !== menuId.toString()) {
    if (item.menu) {
      await Menu.findByIdAndUpdate(item.menu, { $pull: { items: id } });
    }

    await Menu.findByIdAndUpdate(menuId, { $addToSet: { items: id } });
    item.menu = menuId;
  }

  Object.assign(item, updateData);
  await item.save();

  await item.populate("canteens", "name");

  return item;
};

/**
 * Delete menu item
 */
const deleteMenuItem = async (id) => {
  const item = await MenuItem.findByIdAndDelete(id);

  if (!item) {
    throw ApiError.notFound("Menu item not found");
  }

  // Remove from menu if associated
  if (item.menu) {
    await Menu.findByIdAndUpdate(item.menu, {
      $pull: { items: id },
    });
  }

  return item;
};

/**
 * Toggle menu item availability
 */
const toggleItemAvailability = async (id) => {
  const item = await MenuItem.findById(id);

  if (!item) {
    throw ApiError.notFound("Menu item not found");
  }

  item.isAvailable = !item.isAvailable;
  await item.save();

  return item;
};

module.exports = {
  // Menu
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
