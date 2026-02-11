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
        .populate('creator', 'name email')
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
        .populate('creator', 'name email');

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

  // Get all items for a specific date (defaults to today) - Flattened structure for frontend
  getDailyMenuItems: async (req, res, next) => {
    try {
      const { date } = req.query;

      const queryDate = date ? new Date(date) : new Date();
      queryDate.setHours(0, 0, 0, 0);

      const endDate = new Date(queryDate);
      endDate.setHours(23, 59, 59, 999);

      // Find all active menus for this date
      const menus = await Menu.find({
        menuDate: { $gte: queryDate, $lte: endDate },
        isActive: true
      });

      const menuIds = menus.map(m => m._id);

      // Find all items belonging to these menus
      const items = await MenuItem.find({ menuId: { $in: menuIds } });

      // Map items to include mealType from their parent menu
      const flattenedItems = items.map(item => {
        const parentMenu = menus.find(m => m._id.equals(item.menuId));
        return {
          ...item.toObject(),
          id: item._id, // Frontend expects 'id'
          mealType: parentMenu ? parentMenu.mealType : 'UNKNOWN',
          // Frontend expects these fields, map them if needed or rely on direct property
          name: item.itemName,
          dietaryType: item.type, // Map 'type' from DB to 'dietaryType'
          isVeg: item.type === 'Veg' || item.type === 'Vegan',
          price: item.price.regular, // Flatten price
          ecoScore: item.ecoScore || item.nutritionalInfo?.ecoScore || 'C', // Prefer top-level
          isAvailable: item.isAvailable !== undefined ? item.isAvailable : true
        };
      });

      res.json({
        success: true,
        data: flattenedItems
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

  // Create a menu item (Admin only) - Improved to handle Menu creation automatically
  createMenuItem: async (req, res, next) => {
    try {
      let { menuId, date, mealType, itemName, name, price, isVeg, description, category, nutritionalInfo, portionSize, dietaryType, ecoScore, allergens } = req.body;

      // Map aliases
      if (!itemName && name) itemName = name;
      if (!category && mealType) category = mealType;

      // If no menuId, try to find or create one
      if (!menuId && date && mealType) {
        const menuDate = new Date(date);
        menuDate.setHours(0, 0, 0, 0);

        // Find existing menu
        let menu = await Menu.findOne({
          menuDate: menuDate,
          mealType: mealType.toUpperCase()
        });

        // Create if not exists
        if (!menu) {
          // Default creator to first admin if not in req.user (should be there though)
          const createdBy = req.user ? req.user.userId : null;

          menu = await Menu.create({
            menuDate: menuDate,
            mealType: mealType.toUpperCase(),
            isActive: true,
            createdBy: createdBy
          });
        }
        menuId = menu._id;
      }

      // Verify menu exists
      const menu = await Menu.findById(menuId);
      if (!menu) {
        return res.status(404).json({
          success: false,
          message: 'Menu not found. Please provide valid menuId or date+mealType'
        });
      }

      // Map dietaryType to Schema 'type'
      let itemType = 'Veg';
      if (dietaryType) itemType = dietaryType;
      else if (isVeg !== undefined) itemType = isVeg ? 'Veg' : 'Non-Veg';

      // Map price to Schema structure
      const priceObj = typeof price === 'object' ? price : { regular: Number(price) || 0 };

      const item = await MenuItem.create({
        menuId,
        itemName,
        price: priceObj,
        type: itemType,
        description,
        category: category?.charAt(0).toUpperCase() + category?.slice(1).toLowerCase(), // Ensure Title Case
        nutritionalInfo,
        allergens,
        ecoScore,
        isAvailable: true
      });

      res.status(201).json({
        success: true,
        message: 'Menu item created successfully',
        data: item
      });
    } catch (error) {
      const fs = require('fs');
      try {
        fs.appendFileSync('debug_menu.log', `Error: ${error.message}\nStack: ${error.stack}\nBody: ${JSON.stringify(req.body)}\n---\n`);
      } catch (e) { console.error('Logging failed', e); }
      next(error);
    }
  },

  // Update a menu item (Admin only)
  updateMenuItem: async (req, res, next) => {
    try {
      const { itemId } = req.params;
      const { itemName, isVeg, description, category, nutritionalInfo, price, portionSize, dietaryType, allergens, ecoScore, isAvailable } = req.body;

      // Map fields
      const updateData = {
        itemName,
        description,
        nutritionalInfo,
        allergens,
        ecoScore,
        isAvailable
      };

      if (category) updateData.category = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
      if (dietaryType) updateData.type = dietaryType;
      else if (isVeg !== undefined) updateData.type = isVeg ? 'Veg' : 'Non-Veg';

      if (price !== undefined) {
        updateData.price = typeof price === 'object' ? price : { regular: Number(price) };
      }

      const item = await MenuItem.findByIdAndUpdate(
        itemId,
        updateData,
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
      // Check if DB has items, otherwise seed default items
      const count = await MenuItem.countDocuments();

      if (count === 0) {
        // Seed Default Items matching frontend mock
        const defaultItems = [
          { itemName: 'Chicken Biryani', price: { small: 120, regular: 180 }, category: 'Lunch', type: 'Non-Veg', allergens: [], ecoScore: 40, imageColor: 'bg-red-100', tags: [] },
          { itemName: 'Veg Meals', price: { regular: 80 }, category: 'Lunch', type: 'Veg', isJain: true, allergens: ['Dairy'], ecoScore: 80, imageColor: 'bg-green-100', tags: [] },
          { itemName: 'Paneer Butter Masala', price: { small: 90, regular: 150 }, category: 'Lunch', type: 'Veg', allergens: ['Dairy', 'Nuts'], ecoScore: 60, imageColor: 'bg-orange-50', tags: [] },
          { itemName: 'Vegan Salad', price: { regular: 120 }, category: 'Lunch', type: 'Vegan', isJain: true, allergens: [], ecoScore: 95, tags: ['Eco'], imageColor: 'bg-green-50' },
          { itemName: 'Masala Dosa', price: { regular: 60 }, category: 'Breakfast', type: 'Veg', isJain: true, allergens: [], ecoScore: 70, imageColor: 'bg-orange-100' },
          { itemName: 'Samosa', price: { regular: 20 }, category: 'Snacks', type: 'Veg', allergens: ['Gluten'], ecoScore: 50, imageColor: 'bg-yellow-100' }
        ];
        await MenuItem.insertMany(defaultItems);
      }

      // Return all items
      const items = await MenuItem.find({}).sort({ category: 1, itemName: 1 });
      res.json(items);

    } catch (error) {
      console.error('Error fetching menu:', error);
      res.status(500).json({ message: 'Error fetching menu', error: error.message });
    }
  }
};

module.exports = menuController;
