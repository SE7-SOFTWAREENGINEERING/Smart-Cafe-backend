const express = require("express");
const router = express.Router();

const authRoutes = require("./auth.routes");
const userRoutes = require("./user.routes");
const menuRoutes = require("./menu.routes");
const menuItemRoutes = require("./menuItem.routes");
const slotRoutes = require("./slot.routes");
const bookingRoutes = require("./booking.routes");
const systemRoutes = require("./system.routes");
const dashboardRoutes = require("./dashboard.routes");
const notificationRoutes = require("./notification.routes");
const forecastRoutes = require("./forecast.routes");
const sustainabilityRoutes = require("./sustainability.routes");
const holidayRoutes = require("./holiday.routes");
const stockRoutes = require("./stock.routes");
const financialRoutes = require("./financial.routes");
const canteenRoutes = require("./canteen.routes");
const staffRoutes = require("./staff.routes");

// Health check
router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "API is running",
    timestamp: new Date().toISOString(),
  });
});

// Mount routes
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/menus", menuRoutes);
router.use("/menu-items", menuItemRoutes);
router.use("/slots", slotRoutes);
router.use("/bookings", bookingRoutes);
router.use("/system", systemRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/notifications", notificationRoutes);
router.use("/forecast", forecastRoutes);
router.use("/sustainability", sustainabilityRoutes);
router.use("/holidays", holidayRoutes);
router.use("/stock", stockRoutes);
router.use("/financial", financialRoutes);
router.use("/canteens", canteenRoutes);
router.use("/staff", staffRoutes);
router.use("/alerts", require("./alert.routes"));

module.exports = router;
