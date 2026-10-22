const jwt = require('jsonwebtoken');
const { verifyToken, requireRole } = require('../../src/middlewares/authMiddleware');

describe('authMiddleware', () => {
  let mockReq;
  let mockRes;
  let nextFn;
  const SECRET = 'test-secret';

  beforeEach(() => {
    process.env.JWT_SECRET = SECRET;
    mockReq = {
      headers: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    nextFn = jest.fn();
  });

  describe('verifyToken', () => {
    it('should return 401 if authorization header is missing', () => {
      verifyToken(mockReq, mockRes, nextFn);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(nextFn).not.toHaveBeenCalled();
    });

    it('should return 401 if authorization header does not start with Bearer', () => {
      mockReq.headers.authorization = 'Basic xyz';
      verifyToken(mockReq, mockRes, nextFn);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(nextFn).not.toHaveBeenCalled();
    });

    it('should decode valid JWT and set req.user', () => {
      const payload = { id: 1, role: 'ADMIN' };
      const token = jwt.sign(payload, SECRET);
      mockReq.headers.authorization = `Bearer ${token}`;

      verifyToken(mockReq, mockRes, nextFn);
      expect(mockReq.user).toMatchObject(payload);
      expect(nextFn).toHaveBeenCalled();
    });

    it('should return 401 if token is expired', () => {
      const payload = { id: 1, role: 'ADMIN' };
      const token = jwt.sign(payload, SECRET, { expiresIn: -10 }); // Expired in the past
      mockReq.headers.authorization = `Bearer ${token}`;

      verifyToken(mockReq, mockRes, nextFn);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Token scaduto. Effettua nuovamente il login.'
      }));
      expect(nextFn).not.toHaveBeenCalled();
    });

    it('should return 403 if token is invalid or tampered with', () => {
      mockReq.headers.authorization = 'Bearer invalid-token';

      verifyToken(mockReq, mockRes, nextFn);
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Token non valido.'
      }));
      expect(nextFn).not.toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    it('should return 403 if req.user is undefined or missing role', () => {
      const middleware = requireRole(['ADMIN']);
      middleware(mockReq, mockRes, nextFn);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(nextFn).not.toHaveBeenCalled();
    });

    it('should return 403 if user role is not in allowedRoles list', () => {
      mockReq.user = { id: 2, role: 'STAFF' };
      const middleware = requireRole(['ADMIN']);
      middleware(mockReq, mockRes, nextFn);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Accesso riservato ai ruoli: ADMIN.'
      }));
      expect(nextFn).not.toHaveBeenCalled();
    });

    it('should call next() if user role is allowed', () => {
      mockReq.user = { id: 1, role: 'ADMIN' };
      const middleware = requireRole(['ADMIN', 'STAFF']);
      middleware(mockReq, mockRes, nextFn);

      expect(nextFn).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });
});
