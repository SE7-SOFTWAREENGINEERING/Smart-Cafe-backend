const authenticate = require('./authenticate');
const authorize = require('./authorize');
const validate = require('./validate');
const errorHandler = require('./errorHandler');

module.exports = {
  authenticate,
  authorize,
  validate,
  errorHandler
};