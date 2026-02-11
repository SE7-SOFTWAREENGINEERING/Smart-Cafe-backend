const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { errorHandler, notFound } = require('./middleware/errorHandler');
const { initializeCronJobs } = require('./utils/cronJobs');
const connectDB = require('./config/database');

// Connect to Database
connectDB();

// Import routes
// Import routes
// Import routes
const authRoutes = require('./routers/authRoutes');
const menuRoutes = require('./routers/menuRoutes');
const systemRoutes = require('./routers/systemRoutes');

// ...

const bookingRoutes = require('./routers/bookingRoutes');
const staffRoutes = require('./routers/staffRoutes');
const adminRoutes = require('./routers/adminRoutes');
const notificationRoutes = require('./routers/notificationRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Smart Cafeteria API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/system', systemRoutes);

// 404 handler
app.use(notFound);

// Error handler
app.use(errorHandler);

// Initialize cron jobs
initializeCronJobs();

// Start server
app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log(`🚀 Smart Cafeteria API Server`);
  console.log(`📍 Environment: ${process.env.NODE_ENV}`);
  console.log(`🌐 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log('='.repeat(50));
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

module.exports = app;