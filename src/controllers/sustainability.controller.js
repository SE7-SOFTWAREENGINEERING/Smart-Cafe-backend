const sustainabilityService = require('../services/sustainability.service');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');

/**
 * Submit waste report
 * POST /api/sustainability/waste-report
 */
const submitWasteReport = catchAsync(async (req, res) => {
  const report = await sustainabilityService.submitWasteReport(req.userId, req.body);

  // Refresh eco-scores in the background after a new report
  sustainabilityService.refreshEcoScores().catch((err) =>
    console.error('Eco-score refresh error:', err.message),
  );
  
  ApiResponse.created(res, 'Waste report submitted', report);
});

/**
 * Get user's waste reports
 * GET /api/sustainability/my-reports
 */
const getMyWasteReports = catchAsync(async (req, res) => {
  const result = await sustainabilityService.getUserWasteReports(req.userId, req.query);
  
  ApiResponse.ok(res, 'Waste reports retrieved', result);
});

/**
 * Get waste statistics (Admin/Manager)
 * GET /api/sustainability/stats
 */
const getWasteStats = catchAsync(async (req, res) => {
  const result = await sustainabilityService.getWasteStats(req.query);
  
  ApiResponse.ok(res, 'Waste statistics retrieved', result);
});

/**
 * Get sustainability metrics
 * GET /api/sustainability/metrics
 */
const getSustainabilityMetrics = catchAsync(async (req, res) => {
  const result = await sustainabilityService.getSustainabilityMetrics(req.userId);
  
  ApiResponse.ok(res, 'Sustainability metrics retrieved', result);
});

module.exports = {
  submitWasteReport,
  getMyWasteReports,
  getWasteStats,
  getSustainabilityMetrics,
};
