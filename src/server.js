const app = require("./app");
const config = require("./config");
const connectDB = require("./config/database");
const logger = require("./utils/logger");
const { systemService, backupService, bookingService } = require("./services");
const { AuditLog } = require("./models");

const startServer = async () => {
  try {
    // Connect to database
    await connectDB();

    // Initialize default settings
    await systemService.initializeDefaults();
    logger.info("System settings initialized");

    const parseBoolean = (value, fallback) => {
      if (value === null || value === undefined || value === "")
        return fallback;
      if (typeof value === "boolean") return value;
      if (typeof value === "string") return value.toLowerCase() === "true";
      return Boolean(value);
    };

    let lastBackupDate = null;
    setInterval(async () => {
      try {
        const enabledValue = await systemService.getSettingValue(
          "AUTO_BACKUP_ENABLED",
        );
        const enabled = parseBoolean(enabledValue, true);
        if (!enabled) return;

        const now = new Date();
        if (now.getHours() !== 2 || now.getMinutes() !== 0) return;

        const todayKey = now.toISOString().slice(0, 10);
        if (lastBackupDate === todayKey) return;

        const result = await backupService.runBackup({ source: "auto" });
        await AuditLog.log({
          action: "Auto backup created",
          userName: "System",
          userRole: "system",
          resource: "Backup",
          details: {
            fileName: result.fileName,
          },
        });
        lastBackupDate = todayKey;
        logger.info(`Auto backup completed: ${result.fileName}`);
      } catch (error) {
        logger.error("Auto backup failed:", error);
      }
    }, 60000);

    setInterval(async () => {
      try {
        await bookingService.releaseNoShowSlots();
      } catch (error) {
        logger.error("No-show release failed:", error);
      }
    }, 60000);

    // Start server
    const server = app.listen(config.port, () => {
      logger.info(
        `Server running in ${config.env} mode on port ${config.port}`,
      );
      logger.info(`API available at http://localhost:${config.port}/api`);
    });

    // Handle unhandled promise rejections
    process.on("unhandledRejection", (err) => {
      logger.error("Unhandled Rejection:", err);
      server.close(() => {
        process.exit(1);
      });
    });

    // Handle uncaught exceptions
    process.on("uncaughtException", (err) => {
      logger.error("Uncaught Exception:", err);
      process.exit(1);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
