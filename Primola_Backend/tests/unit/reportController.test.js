const reportController = require('../../src/controllers/reportController');
const db = require('../../src/config/database');
const { getItalianHoliday, isItalianHoliday } = require('../../src/utils/holidays');

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
          rows: [{ total_expected: '10', total_present: '8', total_absent: '2' }]
        })
        .mockResolvedValueOnce({
          rows: [
            { student_id: 1, first_name: 'Luca', last_name: 'Verdi', tutor_first_name: 'Mamma', tutor_last_name: 'V', tutor_phone: '123', tutor_email: 'm@v.it' },
            { student_id: 2, first_name: 'Paolo', last_name: 'Neri', tutor_first_name: null }
          ]
        })
        .mockResolvedValueOnce({
          rows: [
            { attendance_id: 'a-1', student_id: 3, first_name: 'Stud', last_name: 'Tre', is_present: true, canteen_used: true }
          ]
        });

      await reportController.getDailyReport(mockReq, mockRes, nextFn);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          date: '2026-10-22',
          statistics: { totalExpected: 10, present: 8, extraPresent: 0, absent: 2, excused: 0, totalInserted: 1 },
          allAttendances: expect.arrayContaining([
            expect.objectContaining({ student_id: 3, studentName: 'Stud Tre', is_present: true })
          ]),
          unjustifiedAbsences: expect.any(Array)
        })
      }));
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle empty stats row falling back to 0', async () => {
      mockReq.query.date = '2026-10-22';

      mockClient.query
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

    it('should force totalExpected to 0 on Italian national holidays', async () => {
      mockReq.query.date = '2026-12-25';

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ total_expected: '5', total_present: '0', total_absent: '0' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      await reportController.getDailyReport(mockReq, mockRes, nextFn);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          statistics: expect.objectContaining({ totalExpected: 0 })
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
    it('should return 400 when parameters are missing or invalid', async () => {
      await reportController.getMensaReport(mockReq, mockRes, nextFn);
      expect(mockRes.status).toHaveBeenCalledWith(400);

      mockReq.query = { from: '2026-10-01', to: 'invalid' };
      await reportController.getMensaReport(mockReq, mockRes, nextFn);
      expect(mockRes.status).toHaveBeenCalledWith(400);

      mockReq.query = { year: '2026' };
      await reportController.getMensaReport(mockReq, mockRes, nextFn);
      expect(mockRes.status).toHaveBeenCalledWith(400);

      mockReq.query = { year: '2026', month: '15' };
      await reportController.getMensaReport(mockReq, mockRes, nextFn);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 200 with mensa breakdown, delivered regular/extra and estimated expected meals by year/month', async () => {
      mockReq.query = { year: '2026', month: '10' };

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ total_mensa: '30' }] })
        .mockResolvedValueOnce({
          rows: [
            {
              date: '2026-10-15',
              regular_mensa: '5',
              extra_mensa: '0',
              total_mensa: '5',
              students: [{ id: 's1', name: 'Mario Rossi' }]
            }
          ]
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 's1',
              first_name: 'Mario',
              last_name: 'Rossi',
              scuola: 'Rodari',
              giorni_abbonamento: [1, 3, 5],
              pasti_settimanali: 2,
              delivered_regular: '8',
              delivered_extra: '0',
              delivered_total: '8'
            },
            {
              id: 's2',
              first_name: 'Luigi',
              last_name: 'Bianchi',
              scuola: 'Rodari',
              giorni_abbonamento: [2, 4],
              pasti_settimanali: 0,
              delivered_regular: '0',
              delivered_extra: '0',
              delivered_total: '0'
            }
          ]
        });

      await reportController.getMensaReport(mockReq, mockRes, nextFn);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          year: 2026,
          month: 10,
          from: '2026-10-01',
          to: '2026-10-31',
          totalMensa: 30,
          deliveredTotal: 30,
          deliveredRegular: 30,
          deliveredExtra: 0,
          expectedMeals: 9,
          extraMensa: 0,
          dailyBreakdown: expect.any(Array),
          studentsBreakdown: expect.arrayContaining([
            expect.objectContaining({
              student_id: 's1',
              pasti_settimanali: 2,
              expectedMeals: 9,
              deliveredRegular: 8,
              deliveredExtra: 0,
              deliveredTotal: 8
            })
          ])
        })
      }));
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle empty rows in mensa report falling back to 0', async () => {
      mockReq.query = { from: '2026-10-01', to: '2026-10-22' };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      await reportController.getMensaReport(mockReq, mockRes, nextFn);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          totalMensa: 0,
          deliveredRegular: 0,
          deliveredExtra: 0,
          expectedMeals: 0,
          extraMensa: 0,
          dailyBreakdown: [],
          studentsBreakdown: []
        })
      }));
    });

    it('should call next(err) and release client when mensa query fails', async () => {
      mockReq.query = { year: '2026', month: '10' };
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
              total_unjustified_absent: '5',
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
              absent: '0',
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
              days_absent: '2',
              meals_count: '18',
              covered_days: '16'
            },
            {
              student_id: 2,
              first_name: 'Luigi',
              last_name: 'Bianchi',
              scuola: 'Collodi',
              days_present: '10',
              days_absent: '1',
              meals_count: '10',
              covered_days: '16'
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
            totalExtraPresent: 0,
            totalUnjustifiedAbsent: 5,
            totalExcused: 0,
            totalMeals: 75,
            activeDays: 20
          },
          dailyTrend: expect.any(Array),
          studentsSummary: expect.arrayContaining([
            expect.objectContaining({
              student_id: 1,
              days_present: 18,
              days_absent: 2,
              presenze_pagate: 16,
              covered_days: 16,
              eccedenza: 2 // Math.max(0, 18 - 16) = 2
            }),
            expect.objectContaining({
              student_id: 2,
              days_present: 10,
              presenze_pagate: 16,
              covered_days: 16,
              eccedenza: 0 // Math.max(0, 10 - 16) = 0
            })
          ])
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

  describe('saveMonthlyPlans', () => {
    it('should return 400 if parameters are missing or invalid', async () => {
      mockReq.body = { year: 2026 };
      await reportController.saveMonthlyPlans(mockReq, mockRes, nextFn);
      expect(mockRes.status).toHaveBeenCalledWith(400);

      mockReq.body = { year: 2026, month: 13, plans: [] };
      await reportController.saveMonthlyPlans(mockReq, mockRes, nextFn);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should upsert monthly plans and return 200', async () => {
      mockReq.body = {
        year: 2026,
        month: 10,
        plans: [
          { student_id: 's1', presenze_pagate: 20 },
          { student_id: 's2', presenze_pagate: 15 }
        ]
      };

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'p1', student_id: 's1', presenze_pagate: 20 }] })
        .mockResolvedValueOnce({ rows: [{ id: 'p2', student_id: 's2', presenze_pagate: 15 }] })
        .mockResolvedValueOnce({}); // COMMIT

      await reportController.saveMonthlyPlans(mockReq, mockRes, nextFn);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          message: '2 piani mensili aggiornati con successo.'
        })
      }));
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should rollback and call next(err) on db failure', async () => {
      mockReq.body = {
        year: 2026,
        month: 10,
        plans: [{ student_id: 's1', presenze_pagate: 20 }]
      };

      const err = new Error('Upsert plan failed');
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockRejectedValueOnce(err);

      await reportController.saveMonthlyPlans(mockReq, mockRes, nextFn);

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(nextFn).toHaveBeenCalledWith(err);
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('Italian holidays utility (Butcher-Meeus + fixed)', () => {
    it('detects all 10 fixed Italian national holidays', () => {
      const fixed = [
        '2026-01-01', '2026-01-06', '2026-04-25', '2026-05-01', '2026-06-02',
        '2026-08-15', '2026-11-01', '2026-12-08', '2026-12-25', '2026-12-26'
      ];
      for (const d of fixed) {
        expect(isItalianHoliday(d)).toBe(true);
        expect(getItalianHoliday(d)).toEqual(expect.objectContaining({ isHoliday: true, name: expect.any(String) }));
      }
    });

    it('detects Easter Sunday and Easter Monday using Butcher-Meeus algorithm', () => {
      expect(getItalianHoliday('2026-04-05')).toEqual({ name: 'Pasqua', isHoliday: true });
      expect(getItalianHoliday('2026-04-06')).toEqual({ name: "Lunedì dell'Angelo (Pasquetta)", isHoliday: true });
      expect(getItalianHoliday('2025-04-20')).toEqual({ name: 'Pasqua', isHoliday: true });
      expect(getItalianHoliday('2025-04-21')).toEqual({ name: "Lunedì dell'Angelo (Pasquetta)", isHoliday: true });
    });

    it('returns null / false for non-holidays and invalid inputs', () => {
      expect(isItalianHoliday('2026-10-22')).toBe(false);
      expect(getItalianHoliday('2026-10-22')).toBeNull();
      expect(getItalianHoliday('')).toBeNull();
      expect(getItalianHoliday(null)).toBeNull();
      expect(getItalianHoliday('invalid')).toBeNull();
    });
  });
});
