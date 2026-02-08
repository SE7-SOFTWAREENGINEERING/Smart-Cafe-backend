const express = require("express");
const router = express.Router();
const { bookingController } = require("../controllers");
const {
  authenticate,
  isStaff,
  isManagement,
  isAdmin,
  validate,
} = require("../middlewares");
const { bookingValidation } = require("../validations");

// All routes require authentication
router.use(authenticate);

// User routes
router.get("/my", bookingController.getMyBookings);
router.get("/queue-info/:slotId", bookingController.getQueueInfo);
router.post(
  "/",
  validate(bookingValidation.createBooking),
  bookingController.createBooking,
);
router.post(
  "/:id/cancel",
  validate(bookingValidation.cancelBooking),
  bookingController.cancelBooking,
);

// Staff routes
router.get("/token/:tokenNumber", isStaff, bookingController.getBookingByToken);
router.get("/scans", isStaff, bookingController.getScanHistory);
router.post("/walkin", isStaff, bookingController.createWalkinBooking);
router.post("/:id/complete", isStaff, bookingController.completeBooking);
router.post("/:id/no-show", isStaff, bookingController.markNoShow);

// Management routes
router.get(
  "/",
  isManagement,
  validate(bookingValidation.getBookings),
  bookingController.getAllBookings,
);
router.get("/stats", isManagement, bookingController.getBookingStats);
router.post("/release-no-shows", isAdmin, bookingController.releaseNoShowSlots);
router.get("/:id", isStaff, bookingController.getBookingById);

module.exports = router;
