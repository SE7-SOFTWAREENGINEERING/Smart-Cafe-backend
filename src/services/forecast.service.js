const Forecast = require('../models/Forecast');
const { Booking, Slot } = require('../models');
const { getDayBounds } = require('../utils/helpers');
const ApiError = require('../utils/ApiError');

// Environment variable for Python forecasting service (optional integration)
const FORECAST_SERVICE_URL = process.env.FORECAST_SERVICE_URL;

/**
 * Generate forecast for a date (uses historical average algorithm)
 * Can be enhanced to proxy to Python ML service if FORECAST_SERVICE_URL is set
 */
const generateForecast = async (date, mealType) => {
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  
  // Check if forecast already exists
  const existing = await Forecast.findOne({
    date: targetDate,
    mealType,
  });
  
  if (existing) {
    return existing;
  }
  
  // Use historical average algorithm for prediction
  const predictedCount = await calculateHistoricalAverage(mealType, targetDate);
  const weatherCondition = 'Unknown'; // Can integrate with Weather API later
  
  // Check for special periods
  const dayOfWeek = targetDate.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  
  // Create forecast record
  const forecast = await Forecast.create({
    date: targetDate,
    mealType,
    predictedCount,
    weatherCondition,
    isSpecialPeriod: isWeekend,
    specialPeriodType: isWeekend ? 'Weekend' : 'Normal',
  });
  
  return forecast;
};


/**
 * Calculate historical average for fallback forecasting
 */
const calculateHistoricalAverage = async (mealType, targetDate) => {
  const dayOfWeek = targetDate.getDay();
  
  // Get bookings from last 4 weeks on the same day
  const fourWeeksAgo = new Date(targetDate);
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
  
  const historicalDates = [];
  for (let i = 1; i <= 4; i++) {
    const pastDate = new Date(targetDate);
    pastDate.setDate(pastDate.getDate() - (7 * i));
    historicalDates.push(pastDate);
  }
  
  // Count bookings for those dates
  let totalBookings = 0;
  let validDays = 0;
  
  for (const date of historicalDates) {
    const { start, end } = getDayBounds(date);
    
    const slots = await Slot.find({
      date: { $gte: start, $lte: end },
      mealType,
    });
    
    if (slots.length > 0) {
      const bookings = slots.reduce((sum, slot) => sum + slot.booked, 0);
      totalBookings += bookings;
      validDays++;
    }
  }
  
  return validDays > 0 ? Math.round(totalBookings / validDays) : 50; // Default to 50 if no data
};

/**
 * Get daily forecast
 */
const getDailyForecast = async (date) => {
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  
  const mealTypes = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACKS'];
  const forecasts = await Promise.all(
    mealTypes.map(mealType => generateForecast(targetDate, mealType))
  );
  
  return {
    date: targetDate.toISOString().split('T')[0],
    forecasts,
  };
};

/**
 * Get weekly forecast
 */
const getWeeklyForecast = async (startDate) => {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  
  const weeklyForecasts = [];
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(start);
    date.setDate(date.getDate() + i);
    
    const dailyForecast = await getDailyForecast(date);
    weeklyForecasts.push(dailyForecast);
  }
  
  return weeklyForecasts;
};

/**
 * Record actual consumption (for accuracy tracking)
 */
const recordActual = async (date, mealType, actualCount) => {
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  
  const forecast = await Forecast.findOne({
    date: targetDate,
    mealType,
  });
  
  if (!forecast) {
    throw ApiError.notFound('Forecast not found for this date');
  }
  
  forecast.actualCount = actualCount;
  forecast.calculateAccuracy();
  await forecast.save();
  
  return forecast;
};

/**
 * Get forecast accuracy metrics
 */
const getAccuracyMetrics = async (query = {}) => {
  const { startDate, endDate, mealType } = query;
  
  const matchStage = {
    actualCount: { $exists: true },
    accuracy: { $exists: true },
  };
  
  if (startDate && endDate) {
    matchStage.date = {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    };
  }
  
  if (mealType) {
    matchStage.mealType = mealType;
  }
  
  const accuracyStats = await Forecast.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$mealType',
        averageAccuracy: { $avg: '$accuracy' },
        minAccuracy: { $min: '$accuracy' },
        maxAccuracy: { $max: '$accuracy' },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);
  
  // Overall accuracy
  const overall = await Forecast.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        overallAccuracy: { $avg: '$accuracy' },
        totalForecasts: { $sum: 1 },
      },
    },
  ]);
  
  return {
    byMealType: accuracyStats,
    overall: overall[0] || { overallAccuracy: 0, totalForecasts: 0 },
  };
};

module.exports = {
  generateForecast,
  getDailyForecast,
  getWeeklyForecast,
  recordActual,
  getAccuracyMetrics,
};
