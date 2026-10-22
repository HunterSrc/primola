const attendanceRepository = require('../../src/repositories/attendanceRepository');
const db = require('../../src/config/database');

jest.mock('../../src/config/database');

describe('attendanceRepository unit tests', () => {
  let mockClient;

  beforeEach(() => {
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    db.getPool = jest.fn().mockReturnValue({
      connect: jest.fn().mockResolvedValue(mockClient)
    });
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  describe('getExpectedStudents', () => {
    it('should query expected students for given date', async () => {
      const mockRows = [{ student_id: 1, first_name: 'Leo' }];
      db.query = jest.fn().mockResolvedValue({ rows: mockRows });

      const result = await attendanceRepository.getExpectedStudents('2026-10-22');

      expect(result).toEqual(mockRows);
      expect(db.query).toHaveBeenCalledWith(expect.any(String), ['2026-10-22']);
    });

    it('should throw if query fails', async () => {
      db.query = jest.fn().mockRejectedValue(new Error('Pool connection error'));

      await expect(attendanceRepository.getExpectedStudents('2026-10-22'))
        .rejects.toThrow('Pool connection error');
    });
  });

  describe('bulkUpsertAttendances', () => {
    it('should return empty array if attendancesList is empty or null', async () => {
      expect(await attendanceRepository.bulkUpsertAttendances(null)).toEqual([]);
      expect(await attendanceRepository.bulkUpsertAttendances([])).toEqual([]);
    });

    it('should upsert records inside transaction and return inserted rows', async () => {
      const records = [
        {
          student_id: '123e4567-e89b-12d3-a456-426614174000',
          date: '2026-10-22',
          is_present: true,
          is_absent_justified: false,
          canteen_used: true,
          is_extra: false
        }
      ];

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 10, student_id: records[0].student_id, date: '2026-10-22' }] }) // INSERT
        .mockResolvedValueOnce({}); // COMMIT

      const result = await attendanceRepository.bulkUpsertAttendances(records);

      expect(result.length).toBe(1);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should rollback transaction and throw error on query failure', async () => {
      const records = [{ student_id: '123', date: '2026-10-22' }];
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockRejectedValueOnce(new Error('Insert failed')); // INSERT error

      await expect(attendanceRepository.bulkUpsertAttendances(records))
        .rejects.toThrow('Insert failed');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});
