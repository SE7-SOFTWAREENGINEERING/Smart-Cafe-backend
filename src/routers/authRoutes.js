const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { validateRequest, schemas } = require('../middleware/validation');

// Public routes
router.post('/register', validateRequest(schemas.register), authController.register);
router.post('/login', validateRequest(schemas.login), authController.login);
router.post('/send-otp', validateRequest(schemas.sendOtp), authController.sendOtp);
router.post('/verify-otp', validateRequest(schemas.verifyOtp), authController.verifyOtp);
router.post('/reset-password', validateRequest(schemas.resetPassword), authController.resetPassword);

// Protected routes
router.get('/profile', authenticateToken, authController.getProfile);

module.exports = router;