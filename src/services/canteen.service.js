const { Canteen, Slot, Booking } = require('../models');
const { getDayBounds } = require('../utils/helpers');
const ApiError = require('../utils/ApiError');

/**
 * Compute real-time occupancy for a canteen from active bookings in today's slots.
 * Updates the canteen's occupancy & crowd fields in-place (saved to DB).
 */
const refreshOccupancy = async (canteen) => {
  const { start, end } = getDayBounds(new Date());

  // Find today's active slots for this canteen
  const slots = await Slot.find({
    canteenId: canteen.id || canteen._id.toString(),
    date: { $gte: start, $lte: end },
    status: { $ne: 'Cancelled' },
  }).select('_id');

  const slotIds = slots.map((s) => s._id);

  // Count confirmed (not yet served) bookings — these people are in the canteen queue
  const activeBookings = slotIds.length
    ? await Booking.countDocuments({
        slot: { $in: slotIds },
        status: 'confirmed',
      })
    : 0;

  canteen.occupancy = Math.min(activeBookings, canteen.capacity);

  // Auto-calculate crowd level
  const pct = (canteen.occupancy / canteen.capacity) * 100;
  if (pct < 40) canteen.crowd = 'Low';
  else if (pct < 75) canteen.crowd = 'Medium';
  else canteen.crowd = 'High';

  await canteen.save();
  return canteen;
};

/**
 * Get all canteens with optional filtering
 */
const getCanteens = async (query = {}) => {
  const { status, isActive, search } = query;
  
  const filter = {};
  
  if (status) {
    filter.status = status;
  }
  
  if (isActive !== undefined) {
    filter.isActive = isActive === 'true' || isActive === true;
  }
  
  if (search) {
    filter.$text = { $search: search };
  }
  
  const canteens = await Canteen.find(filter).sort({ name: 1 });

  // Refresh real-time occupancy/crowd for each canteen
  await Promise.all(canteens.map((c) => refreshOccupancy(c)));

  return { canteens };
};

/**
 * Get canteen by ID
 */
const getCanteenById = async (canteenId) => {
  const canteen = await Canteen.findById(canteenId);
  
  if (!canteen) {
    throw new ApiError(404, 'Canteen not found');
  }

  // Refresh real-time occupancy/crowd
  await refreshOccupancy(canteen);
  
  return canteen;
};

/**
 * Create a new canteen
 */
const createCanteen = async (data) => {
  const canteen = await Canteen.create(data);
  return canteen;
};

/**
 * Update canteen
 */
const updateCanteen = async (canteenId, data) => {
  const canteen = await Canteen.findByIdAndUpdate(
    canteenId,
    { $set: data },
    { new: true, runValidators: true }
  );
  
  if (!canteen) {
    throw new ApiError(404, 'Canteen not found');
  }
  
  return canteen;
};

/**
 * Delete canteen
 */
const deleteCanteen = async (canteenId) => {
  const canteen = await Canteen.findByIdAndDelete(canteenId);
  
  if (!canteen) {
    throw new ApiError(404, 'Canteen not found');
  }
  
  return canteen;
};

/**
 * Toggle canteen active status
 */
const toggleCanteenStatus = async (canteenId) => {
  const canteen = await Canteen.findById(canteenId);
  
  if (!canteen) {
    throw new ApiError(404, 'Canteen not found');
  }
  
  canteen.isActive = !canteen.isActive;
  await canteen.save();
  
  return canteen;
};

/**
 * Update canteen occupancy
 */
const updateOccupancy = async (canteenId, occupancy) => {
  const canteen = await Canteen.findById(canteenId);
  
  if (!canteen) {
    throw new ApiError(404, 'Canteen not found');
  }
  
  canteen.occupancy = Math.max(0, Math.min(occupancy, canteen.capacity));
  
  // Auto-update crowd level based on occupancy percentage
  const occupancyPercent = (canteen.occupancy / canteen.capacity) * 100;
  if (occupancyPercent < 40) {
    canteen.crowd = 'Low';
  } else if (occupancyPercent < 75) {
    canteen.crowd = 'Medium';
  } else {
    canteen.crowd = 'High';
  }
  
  await canteen.save();
  return canteen;
};

module.exports = {
  getCanteens,
  getCanteenById,
  createCanteen,
  updateCanteen,
  deleteCanteen,
  toggleCanteenStatus,
  updateOccupancy,
};
