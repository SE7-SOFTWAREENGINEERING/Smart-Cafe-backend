const forecastService = require('../services/forecast.service');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');

/**
 * Get daily forecast
 * GET /api/forecast/daily
 */
const getDailyForecast = catchAsync(async (req, res) => {
  const date = req.query.date || new Date();
  const result = await forecastService.getDailyForecast(date);
  
  ApiResponse.ok(res, 'Daily forecast retrieved', result);
});

/**
 * Get weekly forecast
 * GET /api/forecast/weekly
 */
const getWeeklyForecast = catchAsync(async (req, res) => {
  const startDate = req.query.startDate || new Date();
  const result = await forecastService.getWeeklyForecast(startDate);
  
  ApiResponse.ok(res, 'Weekly forecast retrieved', result);
});

/**
 * Record actual consumption
 * POST /api/forecast/record-actual
 */
const recordActual = catchAsync(async (req, res) => {
  const { date, mealType, actualCount } = req.body;
  const forecast = await forecastService.recordActual(date, mealType, actualCount);
  
  ApiResponse.ok(res, 'Actual consumption recorded', forecast);
});

/**
 * Get accuracy metrics
 * GET /api/forecast/accuracy
 */
const getAccuracyMetrics = catchAsync(async (req, res) => {
  const result = await forecastService.getAccuracyMetrics(req.query);
  
  ApiResponse.ok(res, 'Accuracy metrics retrieved', result);
});

module.exports = {
  getDailyForecast,
  getWeeklyForecast,
  recordActual,
  getAccuracyMetrics,
};
