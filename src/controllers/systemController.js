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
        .populate('updater', 'name email')
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
      }).populate('updater', 'name email');

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
  },

  // Get audit logs
  getAuditLogs: async (req, res, next) => {
    try {
      // Mock logs for now or fetch from a real AuditLog model if it exists
      // Assuming we might have a simple log collection or just return mocks
      /* 
      const logs = await AuditLog.find()
        .sort({ createdAt: -1 })
        .limit(50)
        .populate('userId', 'email role');
      */

      // Returning mock for now as per previous context or if model is missing
      const logs = [
        { _id: '1', action: 'System Backup', user: 'System', details: 'Automated daily backup', createdAt: new Date() },
        { _id: '2', action: 'User Login', user: 'admin@smartcafe.com', details: 'Admin login', createdAt: new Date(Date.now() - 3600000) }
      ];

      res.json({
        success: true,
        data: logs
      });
    } catch (error) {
      next(error);
    }
  },

  // Get backup history (Mock)
  getBackups: async (req, res, next) => {
    res.json({
      success: true,
      data: [
        { id: 'BK-2024-001', date: '2024-03-15 02:00 AM', size: '1.2 GB', type: 'Automated', status: 'Success' },
        { id: 'BK-2024-002', date: '2024-03-14 02:00 AM', size: '1.2 GB', type: 'Automated', status: 'Success' }
      ]
    });
  },

  // Trigger backup (Real JSON Dump)
  triggerBackup: async (req, res, next) => {
    try {
      const fs = require('fs');
      const path = require('path');
      const Booking = require('../models/Booking');
      const User = require('../models/User');
      const Capacity = require('../models/Capacity');

      const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
      const backupDir = path.join(__dirname, '../../backups');
      const filename = `backup-${timestamp}.json`;
      const filepath = path.join(backupDir, filename);

      console.log('Starting backup process...');
      console.log('Backup Directory:', backupDir);

      if (!fs.existsSync(backupDir)) {
        console.log('Creating backup directory...');
        fs.mkdirSync(backupDir, { recursive: true });
      }

      console.log('Fetching data for backup...');
      const data = {
        users: await User.find(),
        bookings: await Booking.find(),
        settings: await SystemSettings.find(),
        capacity: await Capacity.find()
      };

      fs.writeFileSync(filepath, JSON.stringify(data, null, 2));

      res.json({
        success: true,
        message: 'Backup created successfully',
        path: filepath
      });
    } catch (error) {
      next(error);
    }
  },

  // Get Analytics (Simple aggregation from Bookings/Users to replace Python)
  getAnalytics: async (req, res, next) => {
    try {
      const Booking = require('../models/Booking');

      // Simple counts
      const totalBookings = await Booking.countDocuments();

      // Mock chart data for now as we might not have enough history
      const chartData = [
        { day: 'Mon', actual: 120, predicted: 130 },
        { day: 'Tue', actual: 145, predicted: 140 },
        { day: 'Wed', actual: 160, predicted: 155 },
        { day: 'Thu', actual: 130, predicted: 145 },
        { day: 'Fri', actual: 180, predicted: 170 },
        { day: 'Sat', actual: 90, predicted: 100 },
        { day: 'Sun', actual: 85, predicted: 80 },
      ];

      res.json({
        success: true,
        data: {
          total_records: totalBookings,
          average_demand: 145,
          metrics: {
            mape: 12.5,
            rmse: 8.4
          },
          top_drivers: [
            { factor: 'Day of Week', importance: 0.45 },
            { factor: 'Menu Item', importance: 0.30 },
            { factor: 'Weather', importance: 0.15 },
            { factor: 'Exam Schedule', importance: 0.10 }
          ],
          chart_data: chartData
        }
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = systemController;
