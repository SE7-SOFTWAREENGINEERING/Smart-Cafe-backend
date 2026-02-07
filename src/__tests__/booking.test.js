// Mock mongoose before importing controller
jest.mock('mongoose', () => ({
  startSession: jest.fn(() => ({
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    abortTransaction: jest.fn(),
    endSession: jest.fn(),
  })),
}));

// Mock dependencies
jest.mock('../models/Booking', () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  countDocuments: jest.fn(),
  updateMany: jest.fn(),
}));
jest.mock('../models/Token', () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  updateMany: jest.fn(),
}));
jest.mock('../models/Capacity', () => ({
  findOne: jest.fn(),
  find: jest.fn(),
}));
jest.mock('../models/User', () => ({
  findOne: jest.fn(),
}));
jest.mock('../models/Notification', () => ({
  findOne: jest.fn(),
  create: jest.fn(),
}));
jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,mock'),
}));

const Booking = require('../models/Booking');
const Token = require('../models/Token');
const User = require('../models/User');
const bookingController = require('../controllers/bookingController');

describe('Booking Controller', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {
      body: {},
      params: {},
      query: {},
      user: { userId: 1, role: 'User' }
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  describe('getMyBookings', () => {
    it('should get user bookings successfully', async () => {
      const mockBookings = [
        { booking_id: 1, user_id: 1, slot_time: new Date(), meal_type: 'Lunch', status: 'Booked', queue_position: 1 },
        { booking_id: 2, user_id: 1, slot_time: new Date(), meal_type: 'Dinner', status: 'Consumed', queue_position: 2 }
      ];

      Booking.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockBookings)
      });
      Token.findOne.mockResolvedValue({ token_id: 1, qr_code: 'abc123', status: 'Active' });

      await bookingController.getMyBookings(mockReq, mockRes, mockNext);

      expect(Booking.find).toHaveBeenCalledWith({ user_id: 1 });
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            count: 2
          })
        })
      );
    });

    it('should filter bookings by status', async () => {
      mockReq.query = { status: 'Booked' };
      
      Booking.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue([])
      });
      Token.findOne.mockResolvedValue(null);
      
      await bookingController.getMyBookings(mockReq, mockRes, mockNext);

      expect(Booking.find).toHaveBeenCalledWith(expect.objectContaining({ status: 'Booked' }));
    });
  });

  describe('getBookingById', () => {
    it('should get booking by ID for owner', async () => {
      mockReq.params = { bookingId: '1' };

      const mockBooking = {
        booking_id: 1,
        user_id: 1,
        slot_time: new Date(),
        meal_type: 'Lunch',
        status: 'Booked',
        queue_position: 1
      };

      Booking.findOne.mockResolvedValue(mockBooking);
      Token.findOne.mockResolvedValue({ token_id: 1, qr_code: 'abc123', status: 'Active' });
      User.findOne.mockResolvedValue({ user_id: 1, name: 'Test User', email: 'test@example.com' });

      await bookingController.getBookingById(mockReq, mockRes, mockNext);

      expect(Booking.findOne).toHaveBeenCalledWith({ booking_id: '1' });
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            bookingId: 1
          })
        })
      );
    });

    it('should return 404 for non-existent booking', async () => {
      mockReq.params = { bookingId: '999' };

      Booking.findOne.mockResolvedValue(null);

      await bookingController.getBookingById(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should deny access for non-owner', async () => {
      mockReq.params = { bookingId: '1' };

      const mockBooking = { booking_id: 1, user_id: 999 }; // Different user

      Booking.findOne.mockResolvedValue(mockBooking);

      await bookingController.getBookingById(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });
  });

  describe('getAvailableSlots', () => {
    it('should get available slots', async () => {
      const Capacity = require('../models/Capacity');
      
      Capacity.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue([
          { slot_time: new Date(), max_capacity: 100 }
        ])
      });
      Booking.countDocuments.mockResolvedValue(50);

      await bookingController.getAvailableSlots(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true
        })
      );
    });
  });
});
