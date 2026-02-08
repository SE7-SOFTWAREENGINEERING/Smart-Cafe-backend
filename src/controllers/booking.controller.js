const { bookingService } = require("../services");
const catchAsync = require("../utils/catchAsync");
const ApiResponse = require("../utils/ApiResponse");

/**
 * Get user's bookings
 * GET /api/bookings/my
 */
const getMyBookings = catchAsync(async (req, res) => {
  const result = await bookingService.getUserBookings(req.userId, req.query);

  ApiResponse.ok(res, "Bookings retrieved", result);
});

/**
 * Get all bookings (Admin/Staff)
 * GET /api/bookings
 */
const getAllBookings = catchAsync(async (req, res) => {
  const result = await bookingService.getAllBookings(req.query);

  ApiResponse.ok(res, "Bookings retrieved", result);
});

/**
 * Get booking by ID
 * GET /api/bookings/:id
 */
const getBookingById = catchAsync(async (req, res) => {
  const booking = await bookingService.getBookingById(req.params.id);

  ApiResponse.ok(res, "Booking retrieved", booking);
});

/**
 * Get booking by token number
 * GET /api/bookings/token/:tokenNumber
 */
const getBookingByToken = catchAsync(async (req, res) => {
  const booking = await bookingService.getBookingByToken(
    req.params.tokenNumber,
  );

  ApiResponse.ok(res, "Booking retrieved", booking);
});

/**
 * Create new booking
 * POST /api/bookings
 */
const createBooking = catchAsync(async (req, res) => {
  const booking = await bookingService.createBooking(req.userId, req.body);

  ApiResponse.created(res, "Booking created", booking);
});

/**
 * Cancel booking
 * POST /api/bookings/:id/cancel
 */
const cancelBooking = catchAsync(async (req, res) => {
  const booking = await bookingService.cancelBooking(
    req.params.id,
    req.userId,
    req.body.reason,
  );

  ApiResponse.ok(res, "Booking cancelled", booking);
});

/**
 * Complete booking (Staff)
 * POST /api/bookings/:id/complete
 */
const completeBooking = catchAsync(async (req, res) => {
  const booking = await bookingService.completeBooking(req.params.id);

  ApiResponse.ok(res, "Booking completed", booking);
});

/**
 * Get booking statistics
 * GET /api/bookings/stats
 */
const getBookingStats = catchAsync(async (req, res) => {
  const stats = await bookingService.getBookingStats(req.query.date, req.query.canteenId);

  ApiResponse.ok(res, "Booking statistics retrieved", stats);
});

/**
 * Create walk-in booking (Staff only)
 * POST /api/bookings/walkin
 */
const createWalkinBooking = catchAsync(async (req, res) => {
  const booking = await bookingService.createWalkinBooking(req.body);

  ApiResponse.created(res, "Walk-in booking created", booking);
});

/**
 * Mark booking as no-show (Staff)
 * POST /api/bookings/:id/no-show
 */
const markNoShow = catchAsync(async (req, res) => {
  const booking = await bookingService.markNoShow(req.params.id);

  ApiResponse.ok(res, "Booking marked as no-show", booking);
});

/**
 * Get scan history (completed bookings)
 * GET /api/bookings/scans
 */
const getScanHistory = catchAsync(async (req, res) => {
  const result = await bookingService.getScanHistory(req.query);

  ApiResponse.ok(res, "Scan history retrieved", result);
});

/**
 * Release all no-show slots (Cron/Admin)
 * POST /api/bookings/release-no-shows
 */
const releaseNoShowSlots = catchAsync(async (req, res) => {
  const result = await bookingService.releaseNoShowSlots();

  ApiResponse.ok(res, "No-show slots released", result);
});

/**
 * Get real-time queue info for a slot
 * GET /api/bookings/queue-info/:slotId
 */
const getQueueInfo = catchAsync(async (req, res) => {
  const result = await bookingService.getQueueInfo(
    req.params.slotId,
    req.userId,
  );

  ApiResponse.ok(res, "Queue info retrieved", result);
});

module.exports = {
  getMyBookings,
  getAllBookings,
  getBookingById,
  getBookingByToken,
  createBooking,
  createWalkinBooking,
  cancelBooking,
  completeBooking,
  markNoShow,
  releaseNoShowSlots,
  getBookingStats,
  getScanHistory,
  getQueueInfo,
};
