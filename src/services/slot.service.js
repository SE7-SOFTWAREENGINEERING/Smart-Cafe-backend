const { Slot } = require("../models");
const {
  parsePagination,
  paginateResponse,
  getDayBounds,
} = require("../utils/helpers");
const ApiError = require("../utils/ApiError");

const SLOT_CREATION_BUFFER_MINUTES = 10;

const parseSlotDateTime = (dateValue, timeValue) => {
  if (!dateValue || !timeValue) return null;

  const slotDateTime = new Date(dateValue);
  let timeText = String(timeValue).trim();

  if (timeText.includes("-")) {
    timeText = timeText.split("-")[0].trim();
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

const isSameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/**
 * Get all slots with filters
 */
const getSlots = async (query) => {
  const { page, limit, skip } = parsePagination(query);

  const filter = {};

  if (query.date) {
    const { start, end } = getDayBounds(query.date);
    filter.date = { $gte: start, $lte: end };
  }

  if (query.mealType) {
    filter.mealType = query.mealType;
  }

  if (query.status) {
    filter.status = query.status;
  }

  if (query.canteenId) {
    filter.canteenId = query.canteenId;
  }

  const [slots, total] = await Promise.all([
    Slot.find(filter).sort({ date: 1, time: 1 }).skip(skip).limit(limit),
    Slot.countDocuments(filter),
  ]);

  return paginateResponse(slots, total, page, limit);
};

/**
 * Get slot by ID
 */
const getSlotById = async (id) => {
  const slot = await Slot.findById(id);

  if (!slot) {
    throw ApiError.notFound("Slot not found");
  }

  return slot;
};

/**
 * Create new slot
 */
const createSlot = async (data) => {
  const slotDateTime = parseSlotDateTime(data.date, data.time);
  if (slotDateTime) {
    const now = new Date();
    const minTime = new Date(
      now.getTime() + SLOT_CREATION_BUFFER_MINUTES * 60000,
    );

    if (isSameDay(slotDateTime, now) && slotDateTime <= minTime) {
      throw ApiError.badRequest(
        `Slot time must be at least ${SLOT_CREATION_BUFFER_MINUTES} minutes from now`,
      );
    }

    // Validate against Operating Schedule
    const { SystemSetting } = require("../models"); // Lazy load to avoid potential circular dependency issues if any
    const scheduleJson = await SystemSetting.getValue("OPERATING_SCHEDULE");
    if (scheduleJson) {
      try {
        const schedule = JSON.parse(scheduleJson);
        const days = [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ];
        const dayName = days[slotDateTime.getDay()];
        const dayConfig = schedule.find((d) => d.day === dayName);

        if (dayConfig) {
          if (!dayConfig.isOpen) {
            throw ApiError.badRequest(
              `Shop is closed on ${dayName}s. Cannot create slot.`,
            );
          }

          if (dayConfig.openTime && dayConfig.closeTime) {
            const [openHour, openMin] = dayConfig.openTime
              .split(":")
              .map(Number);
            const [closeHour, closeMin] = dayConfig.closeTime
              .split(":")
              .map(Number);

            const slotHour = slotDateTime.getHours();
            const slotMin = slotDateTime.getMinutes();

            const slotTimeMinutes = slotHour * 60 + slotMin;
            const openTimeMinutes = openHour * 60 + openMin;
            const closeTimeMinutes = closeHour * 60 + closeMin;

            if (
              slotTimeMinutes < openTimeMinutes ||
              slotTimeMinutes >= closeTimeMinutes
            ) {
              throw ApiError.badRequest(
                `Slot time ${data.time} is outside operating hours (${dayConfig.openTime} - ${dayConfig.closeTime})`,
              );
            }
          }
        }
      } catch (e) {
        // Skip validation if schedule is invalid or parse error, but log it
        console.error("Failed to validate operating schedule:", e);
        if (e instanceof ApiError) throw e;
      }
    }
  }

  const slot = await Slot.create(data);
  return slot;
};

/**
 * Update slot
 */
const updateSlot = async (id, data) => {
  const slot = await Slot.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });

  if (!slot) {
    throw ApiError.notFound("Slot not found");
  }

  return slot;
};

/**
 * Update slot capacity
 */
const updateCapacity = async (id, capacity) => {
  const slot = await Slot.findById(id);

  if (!slot) {
    throw ApiError.notFound("Slot not found");
  }

  const parsedCapacity = Number(capacity);
  if (!Number.isFinite(parsedCapacity) || !Number.isInteger(parsedCapacity)) {
    throw ApiError.badRequest("Capacity must be a whole number");
  }
  if (parsedCapacity < 1) {
    throw ApiError.badRequest("Capacity must be at least 1");
  }

  if (parsedCapacity < slot.booked) {
    throw ApiError.badRequest("Capacity cannot be less than current bookings");
  }

  slot.capacity = parsedCapacity;
  slot.updateStatus();
  await slot.save();

  return slot;
};

/**
 * Cancel slot
 */
const cancelSlot = async (id) => {
  const slot = await Slot.findById(id);

  if (!slot) {
    throw ApiError.notFound("Slot not found");
  }

  slot.status = "Cancelled";
  await slot.save();

  // TODO: Notify users with bookings for this slot

  return slot;
};

/**
 * Delete slot
 */
const deleteSlot = async (id) => {
  const slot = await Slot.findByIdAndDelete(id);

  if (!slot) {
    throw ApiError.notFound("Slot not found");
  }

  return slot;
};

/**
 * Increment slot bookings
 */
const incrementBooking = async (id) => {
  const slot = await Slot.findById(id);

  if (!slot) {
    throw ApiError.notFound("Slot not found");
  }

  if (slot.status === "Cancelled") {
    throw ApiError.badRequest("Slot has been cancelled");
  }

  if (slot.booked >= slot.capacity) {
    throw ApiError.badRequest("Slot is fully booked");
  }

  slot.booked += 1;
  slot.updateStatus();
  await slot.save();

  return slot;
};

/**
 * Decrement slot bookings
 */
const decrementBooking = async (id) => {
  const slot = await Slot.findById(id);

  if (!slot) {
    throw ApiError.notFound("Slot not found");
  }

  if (slot.booked > 0) {
    slot.booked -= 1;
    slot.updateStatus();
    await slot.save();
  }

  return slot;
};

/**
 * Decrement slot bookings by a specific count
 */
const decrementBookingBy = async (id, count) => {
  const slot = await Slot.findById(id);

  if (!slot) {
    throw ApiError.notFound("Slot not found");
  }

  const decrementBy = Math.max(0, Number(count) || 0);
  if (decrementBy === 0) return slot;

  slot.booked = Math.max(0, slot.booked - decrementBy);
  slot.updateStatus();
  await slot.save();

  return slot;
};

/**
 * Get slots for today
 */
const getTodaySlots = async (canteenId) => {
  const { start, end } = getDayBounds(new Date());

  const filter = {
    date: { $gte: start, $lte: end },
    status: { $ne: "Cancelled" },
  };

  if (canteenId) {
    filter.canteenId = canteenId;
  }

  const slots = await Slot.find(filter).sort({ time: 1 });

  return slots;
};

module.exports = {
  getSlots,
  getSlotById,
  createSlot,
  updateSlot,
  updateCapacity,
  cancelSlot,
  deleteSlot,
  incrementBooking,
  decrementBooking,
  decrementBookingBy,
  getTodaySlots,
};
