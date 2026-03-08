const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const config = require('./config');
const routes = require('./routes');
const {
  errorConverter,
  errorHandler,
  notFound,
  mongoErrorHandler,
  apiLimiter,
} = require('./middlewares');

const app = express();

// Security middleware
app.use(helmet());

// CORS - allow any localhost origin (handles Flutter web's dynamic ports)
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (e.g. mobile apps, curl)
    if (!origin) return callback(null, true);
    // Allow any localhost origin regardless of port
    if (/^http:\/\/localhost(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    // Also allow the configured frontend URL
    if (origin === config.frontendUrl) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Request logging
if (config.env !== 'test') {
  app.use(morgan('dev'));
}

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
if (config.env === 'production') {
  app.use('/api', apiLimiter);
}

// API routes
app.use('/api', routes);

// Error handling
app.use(notFound);
app.use(mongoErrorHandler);
app.use(errorConverter);
app.use(errorHandler);

module.exports = app;
