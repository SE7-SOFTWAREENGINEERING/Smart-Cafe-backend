const { Booking, Slot, MenuItem, SystemSetting, User } = require("../models");
const {
  parsePagination,
  paginateResponse,
  getDayBounds,
} = require("../utils/helpers");
const slotService = require("./slot.service");
const notificationService = require("./notification.service");
const ApiError = require("../utils/ApiError");

const POLICY_KEYS = {
  maxBookingsPerDay: "MAX_BOOKINGS_PER_STUDENT_PER_DAY",
  peakBookingWindow: "PEAK_BOOKING_WINDOW_MINS",
  tokenExpiry: "TOKEN_EXPIRY_DURATION_MINS",
  noShowGrace: "NO_SHOW_GRACE_PERIOD_MINS",
  noShowPenalty: "NO_SHOW_PENALTY_DAYS",
};

const SETTING_KEYS = {
  masterBookingEnabled: "MASTER_BOOKING_ENABLED",
  onlineBookingEnabled: "ONLINE_BOOKING_ENABLED",
  walkinEnabled: "WALKIN_ENABLED",
  slotDuration: "SLOT_DURATION",
  operatingSchedule: "OPERATING_SCHEDULE",
};

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const getPolicyNumber = async (key, fallback) => {
  const value = await SystemSetting.getValue(key);
  if (value === null || value === undefined || value === "") {
    return fallback;
  }
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
};

const getSettingNumber = async (key, fallback) => {
  const value = await SystemSetting.getValue(key);
  if (value === null || value === undefined || value === "") {
    return fallback;
  }
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
};

const getSettingBoolean = async (key, fallback) => {
  const value = await SystemSetting.getValue(key);
  if (value === null || value === undefined || value === "") {
    return fallback;
  }
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return Boolean(value);
};

const getSettingJson = async (key) => {
  const value = await SystemSetting.getValue(key);
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value;
};

const isSameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const parseSlotDateTime = (slot, useEndTime = false) => {
  if (!slot?.date || !slot?.time) return null;

  const slotDateTime = new Date(slot.date);
  let timeText = String(slot.time).trim();

  if (timeText.includes("-")) {
    const parts = timeText
      .split("-")
      .map((part) => part.trim())
      .filter(Boolean);
    timeText = useEndTime ? parts[1] || parts[0] : parts[0];
  }

  const match = timeText.match(/^(\d{1,2}):(\d{2})(\s*[AP]M)?$/i);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3]?.trim().toUpperCase();

  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;

  slotDateTime.setHours(hours, minutes, 0, 0);
  return slotDateTime;
};

const parseTimeToMinutes = (timeText) => {
  const match = String(timeText || "").match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
};

const getOperatingStatus = async (date = new Date()) => {
  const schedule = await getSettingJson(SETTING_KEYS.operatingSchedule);
  if (!Array.isArray(schedule)) {
    return { isOpen: true };
  }

  const dayName = DAY_NAMES[date.getDay()];
  const entry = schedule.find((item) => item?.day === dayName);
  if (!entry) {
    return { isOpen: true };
  }

  if (entry.isHoliday) {
    return { isOpen: false, reason: `${dayName} is a holiday` };
  }

  if (entry.isOpen === false) {
    return { isOpen: false, reason: `${dayName} is closed` };
  }

  const openMinutes = parseTimeToMinutes(entry.openTime);
  const closeMinutes = parseTimeToMinutes(entry.closeTime);
  if (openMinutes === null || closeMinutes === null) {
    return { isOpen: true };
  }

  const nowMinutes = date.getHours() * 60 + date.getMinutes();
  if (nowMinutes < openMinutes || nowMinutes > closeMinutes) {
    return {
      isOpen: false,
      reason: `Service is closed. Hours: ${entry.openTime} - ${entry.closeTime}`,
    };
  }

  return { isOpen: true };
};

const ensureServiceOpen = async (mode) => {
  const masterEnabled = await getSettingBoolean(
    SETTING_KEYS.masterBookingEnabled,
    true,
  );
  if (!masterEnabled) {
    throw ApiError.forbidden("System under maintenance");
  }

  if (mode === "online") {
    const enabled = await getSettingBoolean(
      SETTING_KEYS.onlineBookingEnabled,
      true,
    );
    if (!enabled) {
      throw ApiError.forbidden("Online booking is currently disabled");
    }
  }

  if (mode === "walkin") {
    const enabled = await getSettingBoolean(SETTING_KEYS.walkinEnabled, true);
    if (!enabled) {
      throw ApiError.forbidden("Walk-in service is currently disabled");
    }
  }

  const status = await getOperatingStatus(new Date());
  if (!status.isOpen) {
    throw ApiError.forbidden(status.reason || "Service is closed");
  }
};

const getSlotEndTime = async (slot) => {
  if (!slot) return null;
  const endTime = parseSlotDateTime(slot, true);
  if (endTime) return endTime;
  const startTime = parseSlotDateTime(slot, false);
  if (!startTime) return null;
  const durationMins = await getSettingNumber(SETTING_KEYS.slotDuration, 15);
  return new Date(startTime.getTime() + durationMins * 60000);
};

const ensureSameDayBooking = (slotDate) => {
  const now = new Date();
  if (!isSameDay(slotDate, now)) {
    throw ApiError.badRequest("Bookings are allowed only for today's slots");
  }
};

/**
 * Get user's bookings
 */
const getUserBookings = async (userId, query) => {
  const { page, limit, skip } = parsePagination(query);

  const filter = { user: userId };

  if (query.status) {
    filter.status = query.status;
  }

  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .populate("slot")
      .populate("items.menuItem")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Booking.countDocuments(filter),
  ]);

  return paginateResponse(bookings, total, page, limit);
};

/**
 * Get all bookings (Admin/Staff)
 */
const getAllBookings = async (query) => {
  const { page, limit, skip } = parsePagination(query);

  const filter = {};

  if (query.status) {
    filter.status = query.status;
  }

  if (query.slotId) {
    filter.slot = query.slotId;
  }

  if (query.date) {
    const { start, end } = getDayBounds(query.date);
    const slotsForDate = await Slot.find({
      date: { $gte: start, $lte: end },
    }).select("_id");
    const slotIds = slotsForDate.map((slot) => slot._id.toString());

    if (filter.slot && !slotIds.includes(filter.slot.toString())) {
      return paginateResponse([], 0, page, limit);
    }

    filter.slot = {
      $in: slotIds,
    };
  }

  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .populate("user", "fullName email")
      .populate("slot")
      .populate("items.menuItem")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Booking.countDocuments(filter),
  ]);

  return paginateResponse(bookings, total, page, limit);
};

/**
 * Get booking by ID
 */
const getBookingById = async (id) => {
  const booking = await Booking.findById(id)
    .populate("user", "fullName email")
    .populate("slot")
    .populate("items.menuItem");

  if (!booking) {
    throw ApiError.notFound("Booking not found");
  }

  return booking;
};

/**
 * Get booking by token number
 */
const getBookingByToken = async (tokenNumber) => {
  const booking = await Booking.findOne({ tokenNumber })
    .populate("user", "fullName email")
    .populate("slot")
    .populate("items.menuItem");

  if (!booking) {
    throw ApiError.notFound("Booking not found");
  }

  const tokenExpiryMins = await getPolicyNumber(POLICY_KEYS.tokenExpiry, null);

  if (tokenExpiryMins && booking?.slot) {
    const slotEndTime = await getSlotEndTime(booking.slot);
    if (slotEndTime) {
      const expiryTime = new Date(
        slotEndTime.getTime() + tokenExpiryMins * 60000,
      );
      if (new Date() > expiryTime) {
        throw ApiError.badRequest("Token has expired");
      }
    }
  }

  return booking;
};

/**
 * Create new booking
 */
const createBooking = async (userId, data) => {
  // Check slot availability
  const slot = await Slot.findById(data.slotId);

  if (!slot) {
    throw ApiError.notFound("Slot not found");
  }

  if (slot.status === "Cancelled") {
    throw ApiError.badRequest("This slot has been cancelled");
  }

  if (slot.booked >= slot.capacity) {
    throw ApiError.badRequest("This slot is fully booked");
  }

  // Priority Segment Check
  const user = await User.findById(userId);
  if (user && user.segment === 'student') {
    // Fetch reserved counts
    const facultyReserved = await getPolicyNumber("FACULTY_RESERVED_SLOTS", 0);
    const guestReserved = await getPolicyNumber("GUEST_RESERVED_SLOTS", 0);
    const totalReserved = facultyReserved + guestReserved;

    // Calculate effective capacity for students
    const studentCapacity = Math.max(0, slot.capacity - totalReserved);

    if (slot.booked >= studentCapacity) {
      throw ApiError.badRequest("Slot is full (Reserved slots are for Faculty/Guests only)");
    }
  }

  await ensureServiceOpen("online");

  ensureSameDayBooking(slot.date);

  const peakWindowMins = await getPolicyNumber(
    POLICY_KEYS.peakBookingWindow,
    null,
  );
  const slotDateTime = parseSlotDateTime(slot);
  if (slotDateTime && new Date() >= slotDateTime) {
    throw ApiError.badRequest("Cannot book a past time slot");
  }

  if (slotDateTime && peakWindowMins && peakWindowMins > 0) {
    const windowStart = new Date(
      slotDateTime.getTime() - peakWindowMins * 60000,
    );
    if (new Date() < windowStart) {
      throw ApiError.badRequest(
        `Bookings open ${peakWindowMins} minutes before slot time`,
      );
    }
  }

  const maxBookingsPerDay = await getPolicyNumber(
    POLICY_KEYS.maxBookingsPerDay,
    null,
  );
  if (maxBookingsPerDay && maxBookingsPerDay > 0) {
    const { start, end } = getDayBounds(new Date());
    const slotIds = await Slot.find({
      date: { $gte: start, $lte: end },
    }).select("_id");
    const todaySlotIds = slotIds.map((s) => s._id);
    const bookingsToday = await Booking.countDocuments({
      user: userId,
      slot: { $in: todaySlotIds },
      status: { $ne: "cancelled" },
    });

    if (bookingsToday >= maxBookingsPerDay) {
      throw ApiError.badRequest(
        `Max ${maxBookingsPerDay} bookings allowed per day`,
      );
    }
  }

  const noShowPenaltyDays = await getPolicyNumber(
    POLICY_KEYS.noShowPenalty,
    null,
  );
  if (noShowPenaltyDays && noShowPenaltyDays > 0) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - noShowPenaltyDays);

    const recentNoShow = await Booking.findOne({
      user: userId,
      status: "no_show",
      cancelledAt: { $gte: cutoff },
    }).select("_id");

    if (recentNoShow) {
      throw ApiError.forbidden(
        `Booking blocked for ${noShowPenaltyDays} days due to no-show`,
      );
    }
  }

  // Check for existing booking for same slot
  const existingBooking = await Booking.findOne({
    user: userId,
    slot: data.slotId,
    status: "confirmed",
  });

  if (existingBooking) {
    throw ApiError.conflict("You already have a booking for this slot");
  }

  // Fetch menu items and calculate prices
  const bookingItems = [];
  let totalAmount = 0;

  for (const item of data.items) {
    const menuItem = await MenuItem.findById(item.menuItemId);

    if (!menuItem) {
      throw ApiError.badRequest(`Menu item not found: ${item.menuItemId}`);
    }

    if (!menuItem.isAvailable) {
      throw ApiError.badRequest(`${menuItem.itemName} is not available`);
    }

    const quantity = item.quantity || 1;
    const itemTotal = menuItem.price * quantity;

    bookingItems.push({
      menuItem: menuItem._id,
      quantity,
      price: menuItem.price,
    });

    totalAmount += itemTotal;
  }

  // Create booking
  const booking = await Booking.create({
    user: userId,
    slot: data.slotId,
    items: bookingItems,
    totalAmount,
    notes: data.notes,
  });

  // Increment slot booking count
  await slotService.incrementBooking(data.slotId);

  // Populate and return
  await booking.populate([{ path: "slot" }, { path: "items.menuItem" }]);

  // Send confirmation notification
  await notificationService.createNotification({
    userId,
    title: "Booking Confirmed!",
    message: `Your booking (Token: ${booking.tokenNumber}) for ${slot.time} is confirmed.`,
    type: "order",
    link: `/student/booking?id=${booking._id}`,
  });

  return booking;
};

/**
 * Cancel booking
 */
const cancelBooking = async (id, userId, reason) => {
  const booking = await Booking.findById(id);

  if (!booking) {
    throw ApiError.notFound("Booking not found");
  }

  // Check ownership (unless admin)
  if (booking.user.toString() !== userId.toString()) {
    throw ApiError.forbidden("Not authorized to cancel this booking");
  }

  if (booking.status !== "confirmed") {
    throw ApiError.badRequest("Booking cannot be cancelled");
  }

  booking.status = "cancelled";
  booking.cancelledAt = new Date();
  booking.cancellationReason = reason;
  await booking.save();

  // Decrement slot booking count
  await slotService.decrementBooking(booking.slot);

  // Send cancellation notification
  await notificationService.createNotification({
    userId: booking.user,
    title: "Booking Cancelled",
    message: `Your booking (Token: ${booking.tokenNumber}) has been cancelled.`,
    type: "alert",
  });

  return booking;
};

/**
 * Complete booking (Staff)
 */
const completeBooking = async (id) => {
  const booking = await Booking.findById(id);

  if (!booking) {
    throw ApiError.notFound("Booking not found");
  }

  if (booking.status !== "confirmed") {
    throw ApiError.badRequest("Booking cannot be completed");
  }

  if (booking?.slot) {
    const tokenExpiryMins = await getPolicyNumber(
      POLICY_KEYS.tokenExpiry,
      null,
    );
    if (tokenExpiryMins) {
      const slotEndTime = await getSlotEndTime(booking.slot);
      if (slotEndTime) {
        const expiryTime = new Date(
          slotEndTime.getTime() + tokenExpiryMins * 60000,
        );
        if (new Date() > expiryTime) {
          throw ApiError.badRequest("Token has expired");
        }
      }
    }
  }

  booking.status = "completed";
  booking.completedAt = new Date();
  await booking.save();

  // Send completion notification
  await notificationService.createNotification({
    userId: booking.user,
    title: "Order Ready!",
    message: `Your order ${booking.tokenNumber} is ready for pickup!`,
    type: "order",
    isUrgent: true,
  });

  return booking;
};

/**
 * Get booking statistics
 */
const getBookingStats = async (date, canteenId) => {
  const { start, end } = getDayBounds(date || new Date());

  // Build match stage - lookup slot if canteenId filter is provided
  const pipeline = [];
  
  // Match by date
  pipeline.push({
    $match: {
      createdAt: { $gte: start, $lte: end },
    },
  });
  
  // If canteenId is provided, lookup slot and filter by canteenId
  if (canteenId) {
    pipeline.push(
      {
        $lookup: {
          from: 'slots',
          localField: 'slot',
          foreignField: '_id',
          as: 'slotData',
        },
      },
      { $unwind: '$slotData' },
      {
        $match: {
          'slotData.canteenId': new (require('mongoose').Types.ObjectId)(canteenId),
        },
      }
    );
  }
  
  // Group by status
  pipeline.push({
    $group: {
      _id: "$status",
      count: { $sum: 1 },
      totalAmount: { $sum: "$totalAmount" },
    },
  });

  const stats = await Booking.aggregate(pipeline);

  const totalBookings = stats.reduce((acc, s) => acc + s.count, 0);
  const totalRevenue = stats
    .filter((s) => s._id === "completed")
    .reduce((acc, s) => acc + s.totalAmount, 0);
  
  // Extract individual status counts for frontend compatibility
  const confirmed = stats.find(s => s._id === 'confirmed')?.count || 0;
  const completed = stats.find(s => s._id === 'completed')?.count || 0;
  const cancelled = stats.find(s => s._id === 'cancelled')?.count || 0;
  const expired = stats.find(s => s._id === 'expired' || s._id === 'no_show')?.count || 0;

  return {
    date: start.toISOString().split("T")[0],
    total: totalBookings,
    totalBookings,
    totalRevenue,
    confirmed,
    completed,
    cancelled,
    expired,
    byStatus: stats,
  };
};

/**
 * Create walk-in booking (Staff only - no user required)
 */
const createWalkinBooking = async (data) => {
  // Check slot availability
  const slot = await Slot.findById(data.slotId);

  if (!slot) {
    throw ApiError.notFound("Slot not found");
  }

  if (slot.status === "Cancelled") {
    throw ApiError.badRequest("This slot has been cancelled");
  }

  if (slot.booked >= slot.capacity) {
    throw ApiError.badRequest("This slot is fully booked");
  }

  await ensureServiceOpen("walkin");

  ensureSameDayBooking(slot.date);

  const slotDateTime = parseSlotDateTime(slot);
  if (slotDateTime && new Date() >= slotDateTime) {
    throw ApiError.badRequest("Cannot book a past time slot");
  }

  // Fetch menu items and calculate prices
  const bookingItems = [];
  let totalAmount = 0;

  for (const item of data.items) {
    const menuItem = await MenuItem.findById(item.menuItemId);

    if (!menuItem) {
      throw ApiError.badRequest(`Menu item not found: ${item.menuItemId}`);
    }

    if (!menuItem.isAvailable) {
      throw ApiError.badRequest(`${menuItem.itemName} is not available`);
    }

    const quantity = item.quantity || 1;
    // Apply portion size discount (Small = 80%)
    const portionMultiplier = item.portionSize === "Small" ? 0.8 : 1;
    const price = Math.round(menuItem.price * portionMultiplier);
    const itemTotal = price * quantity;

    bookingItems.push({
      menuItem: menuItem._id,
      quantity,
      price,
      portionSize: item.portionSize || "Regular",
    });

    totalAmount += itemTotal;
  }

  // Create walk-in booking (no user association)
  const booking = await Booking.create({
    slot: data.slotId,
    items: bookingItems,
    totalAmount,
    notes: data.notes,
    isWalkin: true,
    guestName: data.guestName || "Walk-in Guest",
  });

  // Increment slot booking count
  await slotService.incrementBooking(data.slotId);

  // Populate and return
  await booking.populate([{ path: "slot" }, { path: "items.menuItem" }]);

  return booking;
};

/**
 * Mark booking as no-show
 */
const markNoShow = async (id) => {
  const booking = await Booking.findById(id);

  if (!booking) {
    throw ApiError.notFound("Booking not found");
  }

  if (booking.status !== "confirmed") {
    throw ApiError.badRequest(
      "Only confirmed bookings can be marked as no-show",
    );
  }

  booking.status = "no_show";
  booking.cancelledAt = new Date();
  booking.cancellationReason = "No-show - auto marked";
  await booking.save();

  // Release the slot
  await slotService.decrementBooking(booking.slot);

  // Send no-show notification
  await notificationService.createNotification({
    userId: booking.user,
    title: "Booking Missed",
    message: `You missed your booking (Token: ${booking.tokenNumber}). Please arrive on time next time.`,
    type: "alert",
  });

  return booking;
};

/**
 * Release no-show slots after grace period (Cron job)
 * Grace period is 15 minutes after slot time
 */
const releaseNoShowSlots = async () => {
  const now = new Date();
  const gracePeriodMinutes = await getPolicyNumber(POLICY_KEYS.noShowGrace, 15);

  // Find slots that ended grace period ago
  const cutoffTime = new Date(now.getTime() - gracePeriodMinutes * 60 * 1000);

  // Get today's slots that have passed
  const { start, end } = getDayBounds(now);

  const expiredSlots = await Slot.find({
    date: { $gte: start, $lte: end },
    status: { $in: ["Open", "FastFilling", "Full"] },
  });

  let releasedCount = 0;

  for (const slot of expiredSlots) {
    // Parse slot time and compare with cutoff
    const slotEndTime = await getSlotEndTime(slot);
    if (!slotEndTime) continue;

    const slotCutoff = new Date(
      slotEndTime.getTime() + gracePeriodMinutes * 60 * 1000,
    );

    if (now >= slotCutoff) {
      // Mark all confirmed bookings for this slot as no-show
      const confirmedBookings = await Booking.find({
        slot: slot._id,
        status: "confirmed",
      }).select("_id");

      if (confirmedBookings.length === 0) continue;

      const noShowBookings = await Booking.updateMany(
        { _id: { $in: confirmedBookings.map((b) => b._id) } },
        {
          $set: {
            status: "no_show",
            cancelledAt: now,
            cancellationReason: "Auto-released after grace period",
          },
        },
      );

      const released = noShowBookings.modifiedCount || 0;
      releasedCount += released;

      if (released > 0) {
        await slotService.decrementBookingBy(slot._id, released);
      }
    }
  }

  return { releasedCount, processedAt: now };
};

/**
 * Get scan history (completed bookings) for staff
 */
const getScanHistory = async (query) => {
  const { page, limit, skip } = parsePagination(query);
  const filter = { status: "completed" };

  if (query.date) {
    const { start, end } = getDayBounds(query.date);
    filter.completedAt = { $gte: start, $lte: end };
  }

  if (query.canteenId) {
    const slots = await Slot.find({ canteenId: query.canteenId }).select("_id");
    const slotIds = slots.map((slot) => slot._id);
    filter.slot = { $in: slotIds };
  }

  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .populate("user", "fullName email")
      .populate("slot")
      .sort({ completedAt: -1 })
      .skip(skip)
      .limit(limit),
    Booking.countDocuments(filter),
  ]);

  return paginateResponse(bookings, total, page, limit);
};

/**
 * Get real-time queue info for a slot (optionally for a specific user)
 */
const getQueueInfo = async (slotId, userId) => {
  const slot = await Slot.findById(slotId);
  if (!slot) {
    throw ApiError.notFound("Slot not found");
  }

  // All confirmed (waiting) bookings for this slot, ordered by creation time
  const confirmedBookings = await Booking.find({
    slot: slotId,
    status: "confirmed",
  })
    .sort({ createdAt: 1 })
    .select("_id user createdAt");

  const totalInQueue = confirmedBookings.length;

  // Determine the user's position (1-based) in queue
  let position = 0;
  if (userId) {
    const idx = confirmedBookings.findIndex(
      (b) => b.user && b.user.toString() === userId.toString(),
    );
    position = idx >= 0 ? idx + 1 : 0;
  }
  const peopleAhead = Math.max(0, position - 1);

  // Compute average service time from today's completed bookings for this slot
  const completedBookings = await Booking.find({
    slot: slotId,
    status: "completed",
    completedAt: { $exists: true },
  }).select("createdAt completedAt");

  let avgServiceTimeMins = 2.5; // default fallback
  if (completedBookings.length > 0) {
    const totalMins = completedBookings.reduce((sum, b) => {
      const diff =
        (new Date(b.completedAt).getTime() -
          new Date(b.createdAt).getTime()) /
        60000;
      return sum + Math.max(0, diff);
    }, 0);
    avgServiceTimeMins = totalMins / completedBookings.length;
    // Clamp to reasonable range
    avgServiceTimeMins = Math.max(0.5, Math.min(avgServiceTimeMins, 30));
  }

  const estimatedWaitMins = Math.ceil(peopleAhead * avgServiceTimeMins);

  return {
    slotId: slot._id,
    totalInQueue,
    completed: completedBookings.length,
    position,
    peopleAhead,
    avgServiceTimeMins: Math.round(avgServiceTimeMins * 10) / 10,
    estimatedWaitMins,
  };
};

module.exports = {
  getUserBookings,
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
