// Token controller imports from models/index.js
jest.mock('../models', () => ({
  Token: {
    findOne: jest.fn(),
    cleanupExpired: jest.fn(),
  },
  Booking: {},
  MealSlot: {},
  CapacityLog: {},
  AuditLog: {
    log: jest.fn(),
  },
  User: {},
}));

jest.mock('../config/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

const { Token, AuditLog } = require('../models');
const tokenController = require('../controllers/tokenController');

describe('Token Controller', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {
      body: {},
      params: {},
      user: { id: 'canteenstaff123', role: 'CANTEEN_STAFF' },
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('test-agent')
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  describe('getTokenByBooking', () => {
    it('should get token for valid booking', async () => {
      mockReq.params = { bookingId: 'booking123' };

      const mockToken = {
        _id: 'token123',
        tokenCode: 'TOKEN123',
        qrCodeData: 'base64qrcode...',
        isUsed: false,
        usedAt: null,
        expiresAt: new Date(Date.now() + 3600000),
        isValid: true,
        bookingId: { _id: 'booking123' }
      };

      Token.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockToken)
      });

      await tokenController.getTokenByBooking(mockReq, mockRes, mockNext);

      expect(Token.findOne).toHaveBeenCalledWith({ bookingId: 'booking123' });
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            tokenCode: 'TOKEN123'
          })
        })
      );
    });

    it('should return 404 for booking without token', async () => {
      mockReq.params = { bookingId: 'booking123' };

      Token.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(null)
      });

      await tokenController.getTokenByBooking(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          errorCode: 'TOKEN_NOT_FOUND'
        })
      );
    });
  });

  describe('getTokenByCode', () => {
    it('should get token by code', async () => {
      mockReq.params = { tokenCode: 'TOKEN123' };

      const mockToken = {
        _id: 'token123',
        tokenCode: 'TOKEN123',
        qrCodeData: 'base64qrcode...',
        isUsed: false,
        expiresAt: new Date(Date.now() + 3600000),
        validateToken: jest.fn().mockReturnValue({ valid: true, reason: null }),
        bookingId: { _id: 'booking123' }
      };

      Token.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockToken)
      });

      await tokenController.getTokenByCode(mockReq, mockRes, mockNext);

      expect(Token.findOne).toHaveBeenCalledWith({ tokenCode: 'TOKEN123' });
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            token: expect.objectContaining({
              tokenCode: 'TOKEN123'
            })
          })
        })
      );
    });

    it('should return 404 for non-existent token code', async () => {
      mockReq.params = { tokenCode: 'INVALID123' };

      Token.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(null)
      });

      await tokenController.getTokenByCode(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('should cleanup expired tokens', async () => {
      Token.cleanupExpired.mockResolvedValue({ modifiedCount: 5 });

      await tokenController.cleanupExpiredTokens(mockReq, mockRes, mockNext);

      expect(Token.cleanupExpired).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Expired tokens cleaned up successfully',
          data: { invalidatedCount: 5 }
        })
      );
    });
  });
});
