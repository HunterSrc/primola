const { sendSuccess, sendError } = require('../../src/utils/responseFormat');

describe('responseFormat utils', () => {
  let mockRes;

  beforeEach(() => {
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('sendSuccess', () => {
    it('should use default status 200 when status parameter is not passed', () => {
      sendSuccess(mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: null,
        error: null
      });
    });

    it('should respond with provided status and standard payload structure', () => {
      sendSuccess(mockRes, 200, { foo: 'bar' });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { foo: 'bar' },
        error: null
      });
    });

    it('should support custom status code and default data null', () => {
      sendSuccess(mockRes, 201);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: null,
        error: null
      });
    });
  });

  describe('sendError', () => {
    it('should respond with status and error message', () => {
      sendError(mockRes, 404, 'Risorsa non trovata');
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        data: null,
        error: 'Risorsa non trovata'
      });
    });

    it('should use default status 500 and default error message', () => {
      sendError(mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        data: null,
        error: 'Internal Server Error'
      });
    });
  });
});
