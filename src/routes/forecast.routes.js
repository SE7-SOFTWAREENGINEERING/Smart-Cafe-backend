const express = require('express');
const router = express.Router();
const forecastController = require('../controllers/forecast.controller');
const { authenticate, isManagement, isAdmin } = require('../middlewares');

// All routes require authentication
router.use(authenticate);

// Manager routes - Forecast viewing
router.get('/daily', isManagement, forecastController.getDailyForecast);
router.get('/weekly', isManagement, forecastController.getWeeklyForecast);
router.get('/accuracy', isManagement, forecastController.getAccuracyMetrics);

// Admin routes - Record actuals
router.post('/record-actual', isAdmin, forecastController.recordActual);

module.exports = router;
