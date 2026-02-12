const express = require("express");
const router = express.Router();
const staffController = require("../controllers/staff.controller");
const { authenticate, isStaff } = require("../middlewares");

// All staff routes require authentication + staff role
router.use(authenticate);
router.use(isStaff);

// Announcements
router.get("/announcement", staffController.getAnnouncements);
router.post("/announcement", staffController.sendAnnouncement);

// Queue monitoring
router.get("/queue-status", staffController.getQueueStatus);

module.exports = router;
