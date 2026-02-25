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

// CORS
app.use(cors({
  origin: config.frontendUrl,
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

