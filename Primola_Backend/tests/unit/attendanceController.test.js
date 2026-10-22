const attendanceController = require('../../src/controllers/attendanceController');
const attendanceRepository = require('../../src/repositories/attendanceRepository');

jest.mock('../../src/repositories/attendanceRepository');

describe('attendanceController unit tests', () => {
  let mockReq;
  let mockRes;
  let nextFn;

  beforeEach(() => {
    mockReq = {
      query: {},
      body: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    nextFn = jest.fn();
  });

  describe('getExpected', () => {
    it('should return 400 if date query param is missing', async () => {
      await attendanceController.getExpected(mockReq, mockRes, nextFn);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: "Parametro 'date' mancante o formato non valido (richiesto YYYY-MM-DD)."
      }));
    });

    it('should return 400 if date format is invalid', async () => {
      mockReq.query.date = 'invalid-date';
      await attendanceController.getExpected(mockReq, mockRes, nextFn);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 200 with expected students on valid date', async () => {
      mockReq.query.date = '2026-10-22';
      const expected = [{ student_id: 1, name: 'Student 1' }];
      attendanceRepository.getExpectedStudents.mockResolvedValue(expected);

      await attendanceController.getExpected(mockReq, mockRes, nextFn);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expected,
        error: null
      });
    });

    it('should call next(err) when repository throws', async () => {
      mockReq.query.date = '2026-10-22';
      const err = new Error('Query error');
      attendanceRepository.getExpectedStudents.mockRejectedValue(err);

      await attendanceController.getExpected(mockReq, mockRes, nextFn);
      expect(nextFn).toHaveBeenCalledWith(err);
    });
  });

  describe('bulkUpsert', () => {
    it('should return 400 if body is not an array or empty', async () => {
      mockReq.body = {};
      await attendanceController.bulkUpsert(mockReq, mockRes, nextFn);
      expect(mockRes.status).toHaveBeenCalledWith(400);

      mockReq.body = [];
      await attendanceController.bulkUpsert(mockReq, mockRes, nextFn);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 200 with result message when bulk upsert succeeds', async () => {
      const records = [{ student_id: 1, date: '2026-10-22', is_present: true }];
      mockReq.body = records;
      attendanceRepository.bulkUpsertAttendances.mockResolvedValue(records);

      await attendanceController.bulkUpsert(mockReq, mockRes, nextFn);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          message: '1 presenze elaborate (inserite o aggiornate).',
          records: records
        },
        error: null
      });
    });

    it('should call next(err) if bulkUpsertAttendances rejects', async () => {
      mockReq.body = [{ student_id: 1 }];
      const err = new Error('Upsert error');
      attendanceRepository.bulkUpsertAttendances.mockRejectedValue(err);

      await attendanceController.bulkUpsert(mockReq, mockRes, nextFn);
      expect(nextFn).toHaveBeenCalledWith(err);
    });
  });
});
