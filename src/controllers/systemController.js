const SystemSettings = require('../models/SystemSettings');

const systemController = {
  // Get all system settings
  getAllSettings: async (req, res, next) => {
    try {
      const { category } = req.query;
      let query = {};

      if (category) {
        query.category = category.toUpperCase();
      }

      const settings = await SystemSettings.find(query)
        .populate('updatedBy', 'name email')
        .sort({ category: 1, settingKey: 1 });

      res.json({
        success: true,
        data: {
          count: settings.length,
          settings
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Get a single setting by key
  getSetting: async (req, res, next) => {
    try {
      const { key } = req.params;

      const setting = await SystemSettings.findOne({ 
        settingKey: key.toUpperCase() 
      }).populate('updatedBy', 'name email');

      if (!setting) {
        return res.status(404).json({
          success: false,
          message: 'Setting not found'
        });
      }

      res.json({
        success: true,
        data: {
          ...setting.toObject(),
          typedValue: setting.getTypedValue()
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Create or update a setting
  upsertSetting: async (req, res, next) => {
    try {
      const { settingKey, settingValue, dataType, description, category, isEditable } = req.body;
      const userId = req.user.userId;

      const setting = await SystemSettings.findOneAndUpdate(
        { settingKey: settingKey.toUpperCase() },
        {
          settingValue: String(settingValue),
          dataType: dataType?.toUpperCase() || 'STRING',
          description,
          category: category?.toUpperCase(),
          isEditable,
          updatedBy: userId
        },
        { new: true, upsert: true, runValidators: true }
      );

      res.json({
        success: true,
        message: 'Setting saved successfully',
        data: setting
      });
    } catch (error) {
      next(error);
    }
  },

  // Update a setting value (quick update)
  updateSettingValue: async (req, res, next) => {
    try {
      const { key } = req.params;
      const { value } = req.body;
      const userId = req.user.userId;

      const setting = await SystemSettings.findOne({ settingKey: key.toUpperCase() });

      if (!setting) {
        return res.status(404).json({
          success: false,
          message: 'Setting not found'
        });
      }

      if (!setting.isEditable) {
        return res.status(403).json({
          success: false,
          message: 'This setting cannot be modified'
        });
      }

      setting.settingValue = String(value);
      setting.updatedBy = userId;
      await setting.save();

      res.json({
        success: true,
        message: 'Setting updated successfully',
        data: setting
      });
    } catch (error) {
      next(error);
    }
  },

  // Delete a setting
  deleteSetting: async (req, res, next) => {
    try {
      const { key } = req.params;

      const setting = await SystemSettings.findOneAndDelete({ 
        settingKey: key.toUpperCase() 
      });

      if (!setting) {
        return res.status(404).json({
          success: false,
          message: 'Setting not found'
        });
      }

      res.json({
        success: true,
        message: 'Setting deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // Bulk update settings
  bulkUpdateSettings: async (req, res, next) => {
    try {
      const { settings } = req.body;
      const userId = req.user.userId;

      if (!Array.isArray(settings)) {
        return res.status(400).json({
          success: false,
          message: 'Settings must be an array'
        });
      }

      const results = await Promise.all(
        settings.map(async ({ key, value }) => {
          return SystemSettings.updateSetting(key, value, userId);
        })
      );

      res.json({
        success: true,
        message: `${results.length} settings updated successfully`,
        data: results
      });
    } catch (error) {
      next(error);
    }
  },

  // Get settings grouped by category
  getSettingsByCategory: async (req, res, next) => {
    try {
      const settings = await SystemSettings.find()
        .sort({ category: 1, settingKey: 1 });

      const grouped = settings.reduce((acc, setting) => {
        const cat = setting.category || 'GENERAL';
        if (!acc[cat]) {
          acc[cat] = [];
        }
        acc[cat].push({
          ...setting.toObject(),
          typedValue: setting.getTypedValue()
        });
        return acc;
      }, {});

      res.json({
        success: true,
        data: grouped
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = systemController;
