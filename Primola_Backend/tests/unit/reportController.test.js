const reportController = require('../../src/controllers/reportController');
const db = require('../../src/config/database');

jest.mock('../../src/config/database');

describe('reportController unit tests', () => {
  let mockReq;
  let mockRes;
  let nextFn;
  let mockClient;

  beforeEach(() => {
    mockReq = {
      query: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    nextFn = jest.fn();

    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };

    db.getPool = jest.fn().mockReturnValue({
      connect: jest.fn().mockResolvedValue(mockClient)
    });
  });

  describe('getDailyReport', () => {
    it('should return 400 when date is missing or invalid', async () => {
      await reportController.getDailyReport(mockReq, mockRes, nextFn);
      expect(mockRes.status).toHaveBeenCalledWith(400);

      mockReq.query.date = 'invalid';
      await reportController.getDailyReport(mockReq, mockRes, nextFn);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 200 with calculated stats and unjustified absentees (with and without tutor)', async () => {
      mockReq.query.date = '2026-10-22';

      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ total_expected: '10', total_present: '8', total_extra_present: '2', total_absent: '2', total_excused: '1' }]
        })
        .mockResolvedValueOnce({
          rows: [
            { student_id: 1, first_name: 'Luca', last_name: 'Verdi', tutor_first_name: 'Mamma', tutor_last_name: 'V', tutor_phone: '123', tutor_email: 'm@v.it' },
            { student_id: 2, first_name: 'Paolo', last_name: 'Neri', tutor_first_name: null }
          ]
        })
        .mockResolvedValueOnce({
          rows: [
            { student_id: 3, first_name: 'Extra', last_name: 'Stud', scuola: 'Scuola A', has_meal: true, tutor_first_name: 'Papa', tutor_last_name: 'S', tutor_phone: '456' }
          ]
        })
        .mockResolvedValueOnce({
          rows: [
            { attendance_id: 'a-1', student_id: 3, first_name: 'Extra', last_name: 'Stud', is_present: true, is_extra: true, canteen_used: true }
          ]
        });

      await reportController.getDailyReport(mockReq, mockRes, nextFn);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          date: '2026-10-22',
          statistics: { totalExpected: 10, present: 8, extraPresent: 2, absent: 2, excused: 1, totalInserted: 1 },
          allAttendances: expect.arrayContaining([
            expect.objectContaining({ student_id: 3, studentName: 'Extra Stud', is_present: true, is_extra: true })
          ]),
          extraStudents: expect.arrayContaining([
            expect.objectContaining({ student_id: 3, studentName: 'Extra Stud', has_meal: true })
          ])
        })
      }));
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle empty stats row falling back to 0', async () => {
      mockReq.query.date = '2026-10-22';

      mockClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      await reportController.getDailyReport(mockReq, mockRes, nextFn);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          statistics: { totalExpected: 0, present: 0, extraPresent: 0, absent: 0, excused: 0, totalInserted: 0 },
          extraStudents: [],
          allAttendances: []
        })
      }));
    });

    it('should call next(err) and release client on query failure', async () => {
      mockReq.query.date = '2026-10-22';
      const err = new Error('Database Query Error');
      mockClient.query.mockRejectedValue(err);

      await reportController.getDailyReport(mockReq, mockRes, nextFn);

      expect(nextFn).toHaveBeenCalledWith(err);
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('getMensaReport', () => {
    it('should return 400 when from or to are missing or invalid', async () => {
      await reportController.getMensaReport(mockReq, mockRes, nextFn);
      expect(mockRes.status).toHaveBeenCalledWith(400);

      mockReq.query = { from: '2026-10-01', to: 'invalid' };
      await reportController.getMensaReport(mockReq, mockRes, nextFn);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 200 with mensa breakdown and total meals', async () => {
      mockReq.query = { from: '2026-10-01', to: '2026-10-22' };

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ total_mensa: '30' }] })
        .mockResolvedValueOnce({ rows: [{ expected_mensa: '25' }] })
        .mockResolvedValueOnce({ rows: [{ extra_mensa: '5' }] })
        .mockResolvedValueOnce({
          rows: [
            {
              date: '2026-10-15',
              regular_mensa: '5',
              extra_mensa: '1',
              total_mensa: '6'
            }
          ]
        });

      await reportController.getMensaReport(mockReq, mockRes, nextFn);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          totalMensa: 30,
          expectedMensa: 25,
          extraMensa: 5,
          dailyBreakdown: expect.any(Array)
        })
      }));
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle empty rows in mensa report falling back to 0', async () => {
      mockReq.query = { from: '2026-10-01', to: '2026-10-22' };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      await reportController.getMensaReport(mockReq, mockRes, nextFn);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          totalMensa: 0,
          expectedMensa: 0,
          extraMensa: 0,
          dailyBreakdown: []
        })
      }));
    });

    it('should call next(err) and release client when mensa query fails', async () => {
      mockReq.query = { from: '2026-10-01', to: '2026-10-22' };
      const err = new Error('Mensa query error');
      mockClient.query.mockRejectedValue(err);

      await reportController.getMensaReport(mockReq, mockRes, nextFn);

      expect(nextFn).toHaveBeenCalledWith(err);
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('getMonthlyReport', () => {
    it('should return 400 when year or month are missing or invalid', async () => {
      mockReq.query = {};
      await reportController.getMonthlyReport(mockReq, mockRes, nextFn);
      expect(mockRes.status).toHaveBeenCalledWith(400);

      mockReq.query = { year: '2026', month: '13' };
      await reportController.getMonthlyReport(mockReq, mockRes, nextFn);
      expect(mockRes.status).toHaveBeenCalledWith(400);

      mockReq.query = { year: 'abc', month: '10' };
      await reportController.getMonthlyReport(mockReq, mockRes, nextFn);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 200 with monthly summary, daily trend and student details', async () => {
      mockReq.query = { year: '2026', month: '10' };

      mockClient.query
        .mockResolvedValueOnce({
          rows: [
            {
              total_present: '80',
              total_extra_present: '10',
              total_unjustified_absent: '5',
              total_excused: '3',
              total_meals: '75',
              active_days: '20'
            }
          ]
        })
        .mockResolvedValueOnce({
          rows: [
            {
              date: '2026-10-01',
              present: '4',
              extra: '1',
              absent: '0',
              excused: '0',
              meals: '4'
            }
          ]
        })
        .mockResolvedValueOnce({
          rows: [
            {
              student_id: 1,
              first_name: 'Mario',
              last_name: 'Rossi',
              scuola: 'Rodari',
              days_present: '18',
              extra_days: '2',
              days_absent: '1',
              days_excused: '1',
              meals_count: '18'
            }
          ]
        });

      await reportController.getMonthlyReport(mockReq, mockRes, nextFn);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          year: 2026,
          month: 10,
          summary: {
            totalPresent: 80,
            totalExtraPresent: 10,
            totalUnjustifiedAbsent: 5,
            totalExcused: 3,
            totalMeals: 75,
            activeDays: 20
          },
          dailyTrend: expect.any(Array),
          studentsSummary: expect.any(Array)
        })
      }));
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should call next(err) and release client when monthly query fails', async () => {
      mockReq.query = { year: '2026', month: '10' };
      const err = new Error('Monthly query error');
      mockClient.query.mockRejectedValue(err);

      await reportController.getMonthlyReport(mockReq, mockRes, nextFn);

      expect(nextFn).toHaveBeenCalledWith(err);
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});
