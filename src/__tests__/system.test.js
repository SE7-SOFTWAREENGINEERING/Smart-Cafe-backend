// Mock dependencies
jest.mock('../models/SystemSettings', () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  findOneAndDelete: jest.fn(),
  updateSetting: jest.fn(),
}));

const SystemSettings = require('../models/SystemSettings');
const systemController = require('../controllers/systemController');

describe('System Controller', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = { query: {}, params: {}, body: {}, user: { userId: 'admin123' } };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  describe('getAllSettings', () => {
    it('should get all settings', async () => {
      const mockSettings = [
        { settingKey: 'BOOKING_LIMIT', settingValue: '5' },
        { settingKey: 'MAX_CAPACITY', settingValue: '100' }
      ];

      SystemSettings.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockSettings)
      });

      await systemController.getAllSettings(mockReq, mockRes, mockNext);

      expect(SystemSettings.find).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ count: 2 })
        })
      );
    });

    it('should filter by category', async () => {
      mockReq.query = { category: 'BOOKING' };

      SystemSettings.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue([])
      });

      await systemController.getAllSettings(mockReq, mockRes, mockNext);

      expect(SystemSettings.find).toHaveBeenCalledWith({ category: 'BOOKING' });
    });
  });

  describe('getSetting', () => {
    it('should get setting by key', async () => {
      mockReq.params = { key: 'MAX_CAPACITY' };
      const mockSetting = {
        settingKey: 'MAX_CAPACITY',
        settingValue: '100',
        getTypedValue: jest.fn().mockReturnValue(100),
        toObject: jest.fn().mockReturnValue({ settingKey: 'MAX_CAPACITY', settingValue: '100' })
      };

      SystemSettings.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockSetting)
      });

      await systemController.getSetting(mockReq, mockRes, mockNext);

      expect(SystemSettings.findOne).toHaveBeenCalledWith({ settingKey: 'MAX_CAPACITY' });
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('should return 404 for non-existent setting', async () => {
      mockReq.params = { key: 'INVALID' };

      SystemSettings.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(null)
      });

      await systemController.getSetting(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('upsertSetting', () => {
    it('should create or update a setting', async () => {
      mockReq.body = {
        settingKey: 'NEW_SETTING',
        settingValue: 'test value',
        category: 'GENERAL'
      };

      SystemSettings.findOneAndUpdate.mockResolvedValue({
        settingKey: 'NEW_SETTING',
        settingValue: 'test value'
      });

      await systemController.upsertSetting(mockReq, mockRes, mockNext);

      expect(SystemSettings.findOneAndUpdate).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Setting saved successfully'
        })
      );
    });
  });

  describe('deleteSetting', () => {
    it('should delete a setting', async () => {
      mockReq.params = { key: 'OLD_SETTING' };

      SystemSettings.findOneAndDelete.mockResolvedValue({ settingKey: 'OLD_SETTING' });

      await systemController.deleteSetting(mockReq, mockRes, mockNext);

      expect(SystemSettings.findOneAndDelete).toHaveBeenCalledWith({ settingKey: 'OLD_SETTING' });
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('should return 404 for non-existent setting', async () => {
      mockReq.params = { key: 'INVALID' };

      SystemSettings.findOneAndDelete.mockResolvedValue(null);

      await systemController.deleteSetting(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('bulkUpdateSettings', () => {
    it('should bulk update settings', async () => {
      mockReq.body = {
        settings: [
          { key: 'SETTING_1', value: 'value1' },
          { key: 'SETTING_2', value: 'value2' }
        ]
      };

      SystemSettings.updateSetting.mockResolvedValue({ settingKey: 'TEST' });

      await systemController.bulkUpdateSettings(mockReq, mockRes, mockNext);

      expect(SystemSettings.updateSetting).toHaveBeenCalledTimes(2);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: '2 settings updated successfully'
        })
      );
    });

    it('should reject non-array settings', async () => {
      mockReq.body = { settings: 'not an array' };

      await systemController.bulkUpdateSettings(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });
});
