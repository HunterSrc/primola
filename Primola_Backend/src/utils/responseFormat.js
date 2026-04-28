const sendSuccess = (res, status = 200, data = null) => {
  return res.status(status).json({
    success: true,
    data: data,
    error: null
  });
};

const sendError = (res, status = 500, message = 'Internal Server Error') => {
  return res.status(status).json({
    success: false,
    data: null,
    error: message
  });
};

module.exports = {
  sendSuccess,
  sendError
};
