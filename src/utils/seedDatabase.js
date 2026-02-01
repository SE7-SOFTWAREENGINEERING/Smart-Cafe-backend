require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/database");
const { Role, User, UserRole, SystemSettings } = require("../models");
const logger = require("../config/logger");

/**
 * Seed database with initial data
 */
const seedDatabase = async () => {
  try {
    // Connect to database
    await connectDB();

    logger.info("Starting database seeding...");

    // 1. Create Roles
    logger.info("Creating roles...");
    const roles = [
      {
        roleName: "STUDENT",
        description: "Student role - can book meals and view menus",
        permissions: ["VIEW_MENU", "BOOK_MEAL", "CANCEL_BOOKING"],
      },
      {
        roleName: "STAFF",
        description: "Staff role - can scan tokens and view capacity",
        permissions: ["SCAN_TOKEN", "VIEW_CAPACITY", "VIEW_MENU"],
      },
      {
        roleName: "MANAGER",
        description: "Manager role - can manage schedules and view forecasts",
        permissions: [
          "MANAGE_SCHEDULE",
          "VIEW_FORECAST",
          "VIEW_CAPACITY",
          "VIEW_ANALYTICS",
          "VIEW_MENU",
        ],
      },
      {
        roleName: "ADMIN",
        description: "Admin role - full system access",
        permissions: [
          "MANAGE_USERS",
          "SYSTEM_CONFIG",
          "MANAGE_SCHEDULE",
          "VIEW_FORECAST",
          "VIEW_ANALYTICS",
          "VIEW_MENU",
          "BOOK_MEAL",
          "SCAN_TOKEN",
          "VIEW_CAPACITY",
        ],
      },
    ];

    for (const roleData of roles) {
      await Role.findOneAndUpdate({ roleName: roleData.roleName }, roleData, {
        upsert: true,
        new: true,
      });
    }
    logger.info(`✅ Created ${roles.length} roles`);

    // 2. Create Admin User
    logger.info("Creating admin user...");
    const adminRole = await Role.findOne({ roleName: "ADMIN" });

    let adminUser = await User.findOne({ email: "admin@smartmess.com" });

    if (!adminUser) {
      adminUser = new User({
        fullName: "System Administrator",
        email: "admin@smartmess.com",
        passwordHash: "admin123", // plain password ON PURPOSE
        rollOrEmployeeId: "ADMIN001",
        isActive: true,
      });

      await adminUser.save(); // 🔥 THIS triggers bcrypt hashing
    }

    await UserRole.findOneAndUpdate(
      { userId: adminUser._id, roleId: adminRole._id },
      { userId: adminUser._id, roleId: adminRole._id },
      { upsert: true },
    );
    logger.info(
      "✅ Created admin user (email: admin@smartmess.com, password: admin123)",
    );

    // 3. Create Sample Student
    logger.info("Creating sample student...");
    const studentRole = await Role.findOne({ roleName: "STUDENT" });

    let studentUser = await User.findOne({ email: "student@smartmess.com" });

    if (!studentUser) {
      studentUser = new User({
        fullName: "John Doe",
        email: "student@smartmess.com",
        passwordHash: "student123",
        rollOrEmployeeId: "STU001",
        isActive: true,
      });

      await studentUser.save();
    }

    await UserRole.findOneAndUpdate(
      { userId: studentUser._id, roleId: studentRole._id },
      { userId: studentUser._id, roleId: studentRole._id },
      { upsert: true },
    );
    logger.info(
      "✅ Created sample student (email: student@smartmess.com, password: student123)",
    );

    // 4. Create Sample Staff
    logger.info("Creating sample staff...");
    const staffRole = await Role.findOne({ roleName: "STAFF" });

    let staffUser = await User.findOne({ email: "staff@smartmess.com" });

    if (!staffUser) {
      staffUser = new User({
        fullName: "Jane Smith",
        email: "staff@smartmess.com",
        passwordHash: "staff123",
        rollOrEmployeeId: "STAFF001",
        isActive: true,
      });

      await staffUser.save();
    }

    await UserRole.findOneAndUpdate(
      { userId: staffUser._id, roleId: staffRole._id },
      { userId: staffUser._id, roleId: staffRole._id },
      { upsert: true },
    );
    logger.info(
      "✅ Created sample staff (email: staff@smartmess.com, password: staff123)",
    );

    // 5. Create System Settings
    logger.info("Creating system settings...");
    const settings = [
      {
        settingKey: "DEFAULT_SLOT_CAPACITY",
        settingValue: "50",
        dataType: "NUMBER",
        description: "Default capacity for meal slots",
        category: "CAPACITY",
        isEditable: true,
      },
      {
        settingKey: "SLOT_DURATION_MINUTES",
        settingValue: "15",
        dataType: "NUMBER",
        description: "Duration of each meal slot in minutes",
        category: "BOOKING",
        isEditable: true,
      },
      {
        settingKey: "TOKEN_VALIDITY_MINUTES",
        settingValue: "15",
        dataType: "NUMBER",
        description: "Token validity duration in minutes",
        category: "BOOKING",
        isEditable: true,
      },
      {
        settingKey: "BOOKING_ADVANCE_DAYS",
        settingValue: "7",
        dataType: "NUMBER",
        description: "How many days in advance bookings can be made",
        category: "BOOKING",
        isEditable: true,
      },
      {
        settingKey: "CANCELLATION_DEADLINE_HOURS",
        settingValue: "2",
        dataType: "NUMBER",
        description: "Hours before slot when cancellation is not allowed",
        category: "BOOKING",
        isEditable: true,
      },
      {
        settingKey: "AUTO_RELEASE_NO_SHOW_MINUTES",
        settingValue: "5",
        dataType: "NUMBER",
        description:
          "Minutes after slot start to auto-release no-show bookings",
        category: "CAPACITY",
        isEditable: true,
      },
      {
        settingKey: "ENABLE_NOTIFICATIONS",
        settingValue: "true",
        dataType: "BOOLEAN",
        description: "Enable/disable notification system",
        category: "NOTIFICATION",
        isEditable: true,
      },
    ];

    for (const setting of settings) {
      await SystemSettings.findOneAndUpdate(
        { settingKey: setting.settingKey },
        setting,
        { upsert: true, new: true },
      );
    }
    logger.info(`✅ Created ${settings.length} system settings`);

    logger.info("✅ Database seeding completed successfully!");
    logger.info("\n📝 Default Credentials:");
    logger.info("   Admin: admin@smartmess.com / admin123");
    logger.info("   Student: student@smartmess.com / student123");
    logger.info("   Staff: staff@smartmess.com / staff123\n");

    process.exit(0);
  } catch (error) {
    logger.error(`❌ Database seeding failed: ${error.message}`);
    logger.error(error.stack);
    process.exit(1);
  }
};

// Run seeding
seedDatabase();
