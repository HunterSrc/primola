const { sendError } = require('../utils/responseFormat');

const errorHandler = (err, req, res, next) => {
  console.error('[Error]:', err);
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  return sendError(res, status, message);
};

module.exports = errorHandler;
