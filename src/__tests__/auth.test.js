const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Mock dependencies before requiring controller
jest.mock('bcrypt');
jest.mock('jsonwebtoken');

// Create a findOne mock that returns a chainable object
const mockSort = jest.fn();
const mockFindOne = jest.fn();

jest.mock('../models/User', () => {
  return {
    findOne: jest.fn().mockImplementation(() => {
      // Return an object that can be chained with .sort() or used as a promise
      const chainable = {
        sort: mockSort,
        then: (resolve) => resolve(mockFindOne()),
        catch: (reject) => {}
      };
      return chainable;
    }),
    create: jest.fn(),
  };
});

// Set environment variable for JWT
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRE = '24h';

const User = require('../models/User');
const authController = require('../controllers/authController');

describe('Auth Controller', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFindOne.mockReset();
    mockSort.mockReset();
    mockReq = { body: {}, user: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'password123'
      };

      const mockUser = {
        user_id: 1,
        name: 'Test User',
        email: 'test@example.com',
        password: 'hashedPassword',
        role: 'User'
      };

      // For login, findOne returns user directly (no .sort())
      User.findOne.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue('mock-token');

      await authController.login(mockReq, mockRes, mockNext);

      expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedPassword');
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Login successful'
        })
      );
    });

    it('should reject login with invalid email', async () => {
      mockReq.body = {
        email: 'wrong@example.com',
        password: 'password123'
      };

      User.findOne.mockResolvedValue(null);

      await authController.login(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Invalid email or password'
        })
      );
    });

    it('should reject login with invalid password', async () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      User.findOne.mockResolvedValue({
        user_id: 1,
        email: 'test@example.com',
        password: 'hashedPassword'
      });
      bcrypt.compare.mockResolvedValue(false);

      await authController.login(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Invalid email or password'
        })
      );
    });
  });

  describe('getProfile', () => {
    it('should get user profile successfully', async () => {
      mockReq.user = { userId: 1 };

      const mockUser = {
        user_id: 1,
        name: 'Test User',
        email: 'test@example.com',
        role: 'User',
        created_at: new Date()
      };

      User.findOne.mockResolvedValue(mockUser);

      await authController.getProfile(mockReq, mockRes, mockNext);

      expect(User.findOne).toHaveBeenCalledWith({ user_id: 1 });
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            userId: 1,
            name: 'Test User'
          })
        })
      );
    });

    it('should return 404 for non-existent user', async () => {
      mockReq.user = { userId: 999 };

      User.findOne.mockResolvedValue(null);

      await authController.getProfile(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });
});
