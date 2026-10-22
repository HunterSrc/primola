const errorHandler = require('../../src/middlewares/errorHandler');

describe('errorHandler middleware', () => {
  let mockReq;
  let mockRes;
  let nextFn;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    nextFn = jest.fn();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  it('should format error with status and message', () => {
    const error = { status: 400, message: 'Bad request payload' };
    errorHandler(error, mockReq, mockRes, nextFn);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      data: null,
      error: 'Bad request payload'
    });
  });

  it('should fallback to 500 and default message when status/message are absent', () => {
    const error = {};
    errorHandler(error, mockReq, mockRes, nextFn);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      data: null,
      error: 'Internal Server Error'
    });
  });
});
