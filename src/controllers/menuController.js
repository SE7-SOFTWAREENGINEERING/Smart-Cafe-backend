const Menu = require('../models/Menu');
const MenuItem = require('../models/MenuItem');

const menuController = {
  // Get all menus with optional filtering
  getMenus: async (req, res, next) => {
    try {
      const { date, mealType, isActive } = req.query;
      let query = {};

      if (date) {
        const queryDate = new Date(date);
        queryDate.setHours(0, 0, 0, 0);
        const endDate = new Date(queryDate);
        endDate.setHours(23, 59, 59, 999);
        query.menuDate = { $gte: queryDate, $lte: endDate };
      }

      if (mealType) {
        query.mealType = mealType.toUpperCase();
      }

      if (isActive !== undefined) {
        query.isActive = isActive === 'true';
      }

      const menus = await Menu.find(query)
        .populate('items')
        .populate('createdBy', 'name email')
        .sort({ menuDate: -1, mealType: 1 });

      res.json({
        success: true,
        data: {
          count: menus.length,
          menus
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Get a single menu by ID with items
  getMenuById: async (req, res, next) => {
    try {
      const { menuId } = req.params;

      const menu = await Menu.findById(menuId)
        .populate('items')
        .populate('createdBy', 'name email');

      if (!menu) {
        return res.status(404).json({
          success: false,
          message: 'Menu not found'
        });
      }

      res.json({
        success: true,
        data: menu
      });
    } catch (error) {
      next(error);
    }
  },

  // Create a new menu (Admin only)
  createMenu: async (req, res, next) => {
    try {
      const { menuDate, mealType, isActive = true } = req.body;
      const createdBy = req.user.userId;

      const menu = await Menu.create({
        menuDate: new Date(menuDate),
        mealType: mealType.toUpperCase(),
        isActive,
        createdBy
      });

      res.status(201).json({
        success: true,
        message: 'Menu created successfully',
        data: menu
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: 'Menu already exists for this date and meal type'
        });
      }
      next(error);
    }
  },

  // Update a menu (Admin only)
  updateMenu: async (req, res, next) => {
    try {
      const { menuId } = req.params;
      const { menuDate, mealType, isActive } = req.body;

      const menu = await Menu.findByIdAndUpdate(
        menuId,
        { menuDate, mealType, isActive },
        { new: true, runValidators: true }
      );

      if (!menu) {
        return res.status(404).json({
          success: false,
          message: 'Menu not found'
        });
      }

      res.json({
        success: true,
        message: 'Menu updated successfully',
        data: menu
      });
    } catch (error) {
      next(error);
    }
  },

  // Delete a menu (Admin only)
  deleteMenu: async (req, res, next) => {
    try {
      const { menuId } = req.params;

      // Delete associated menu items first
      await MenuItem.deleteMany({ menuId });

      const menu = await Menu.findByIdAndDelete(menuId);

      if (!menu) {
        return res.status(404).json({
          success: false,
          message: 'Menu not found'
        });
      }

      res.json({
        success: true,
        message: 'Menu and associated items deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // ========== MENU ITEMS ==========

  // Get all items for a menu
  getMenuItems: async (req, res, next) => {
    try {
      const { menuId } = req.params;
      const { category, isVeg } = req.query;

      let query = { menuId };

      if (category) {
        query.category = category.toUpperCase();
      }

      if (isVeg !== undefined) {
        query.isVeg = isVeg === 'true';
      }

      const items = await MenuItem.find(query).sort({ category: 1, itemName: 1 });

      res.json({
        success: true,
        data: {
          count: items.length,
          items
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Get a single menu item
  getMenuItem: async (req, res, next) => {
    try {
      const { itemId } = req.params;

      const item = await MenuItem.findById(itemId).populate('menuId');

      if (!item) {
        return res.status(404).json({
          success: false,
          message: 'Menu item not found'
        });
      }

      res.json({
        success: true,
        data: item
      });
    } catch (error) {
      next(error);
    }
  },

  // Create a menu item (Admin only)
  createMenuItem: async (req, res, next) => {
    try {
      const { menuId, itemName, isVeg, description, category, nutritionalInfo } = req.body;

      // Verify menu exists
      const menu = await Menu.findById(menuId);
      if (!menu) {
        return res.status(404).json({
          success: false,
          message: 'Menu not found'
        });
      }

      const item = await MenuItem.create({
        menuId,
        itemName,
        isVeg,
        description,
        category: category?.toUpperCase(),
        nutritionalInfo
      });

      res.status(201).json({
        success: true,
        message: 'Menu item created successfully',
        data: item
      });
    } catch (error) {
      next(error);
    }
  },

  // Update a menu item (Admin only)
  updateMenuItem: async (req, res, next) => {
    try {
      const { itemId } = req.params;
      const { itemName, isVeg, description, category, nutritionalInfo } = req.body;

      const item = await MenuItem.findByIdAndUpdate(
        itemId,
        { itemName, isVeg, description, category: category?.toUpperCase(), nutritionalInfo },
        { new: true, runValidators: true }
      );

      if (!item) {
        return res.status(404).json({
          success: false,
          message: 'Menu item not found'
        });
      }

      res.json({
        success: true,
        message: 'Menu item updated successfully',
        data: item
      });
    } catch (error) {
      next(error);
    }
  },

  // Delete a menu item (Admin only)
  deleteMenuItem: async (req, res, next) => {
    try {
      const { itemId } = req.params;

      const item = await MenuItem.findByIdAndDelete(itemId);

      if (!item) {
        return res.status(404).json({
          success: false,
          message: 'Menu item not found'
        });
      }

      res.json({
        success: true,
        message: 'Menu item deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // Legacy endpoint for backward compatibility (returns mock data)
  getMenu: async (req, res) => {
    try {
      // Check if DB has menus, otherwise return mock data
      const menuCount = await Menu.countDocuments();
      
      if (menuCount > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const menus = await Menu.find({ 
          menuDate: { $gte: today },
          isActive: true 
        }).populate('items');
        
        const items = menus.flatMap(m => m.items || []);
        return res.json(items);
      }

      // Legacy mock data for backwards compatibility
      const MENU_ITEMS = [
        { id: '1', name: 'Masala Dosa', price: { regular: 60 }, category: 'Breakfast', type: 'Veg', isJain: true, allergens: [], ecoScore: 85, imageColor: 'bg-orange-100' },
        { id: '2', name: 'Idli Sambar', price: { small: 30, regular: 50 }, category: 'Breakfast', type: 'Veg', isJain: true, allergens: [], ecoScore: 90, imageColor: 'bg-gray-100' },
        { id: '3', name: 'Chicken Biryani', price: { small: 120, regular: 180 }, category: 'Lunch', type: 'Non-Veg', isJain: false, allergens: [], ecoScore: 40, imageColor: 'bg-red-100' },
        { id: '4', name: 'Veg Meals', price: { regular: 80 }, category: 'Lunch', type: 'Veg', isJain: true, allergens: ['Dairy'], ecoScore: 80, imageColor: 'bg-green-100' },
        { id: '5', name: 'Paneer Butter Masala', price: { small: 90, regular: 150 }, category: 'Lunch', type: 'Veg', isJain: false, allergens: ['Dairy', 'Nuts'], ecoScore: 60, imageColor: 'bg-orange-50' },
        { id: '6', name: 'Samosa', price: { regular: 20 }, category: 'Snacks', type: 'Veg', isJain: false, allergens: ['Gluten'], ecoScore: 75, imageColor: 'bg-yellow-100' },
        { id: '7', name: 'Vegan Salad', price: { regular: 120 }, category: 'Lunch', type: 'Vegan', isJain: true, allergens: [], ecoScore: 95, imageColor: 'bg-green-50' },
      ];
      
      res.json(MENU_ITEMS);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching menu', error: error.message });
    }
  }
};

module.exports = menuController;
