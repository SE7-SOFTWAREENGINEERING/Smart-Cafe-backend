const express = require("express");
const router = express.Router();
const { systemController } = require("../controllers");
const { authenticate, isAdmin, validate } = require("../middlewares");
const { systemValidation } = require("../validations");

// Public route for booking/walk-in status
router.get("/public", systemController.getPublicSettings);

// All other routes require admin authentication
router.use(authenticate, isAdmin);

router.post("/backup", systemController.runBackup);
router.get("/audit", systemController.getAuditLogs);

router.get(
  "/",
  validate(systemValidation.getSettings),
  systemController.getAllSettings,
);
router.get("/grouped", systemController.getSettingsGrouped);
router.post(
  "/",
  validate(systemValidation.upsertSetting),
  systemController.upsertSetting,
);
router.post(
  "/bulk",
  validate(systemValidation.bulkUpdate),
  systemController.bulkUpdateSettings,
);
router.get("/:key", systemController.getSetting);
router.patch(
  "/:key",
  validate(systemValidation.updateSettingValue),
  systemController.updateSettingValue,
);
router.delete("/:key", systemController.deleteSetting);

module.exports = router;
