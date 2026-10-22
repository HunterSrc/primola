const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const studentRepository = require('../../src/repositories/studentRepository');
const attendanceRepository = require('../../src/repositories/attendanceRepository');

jest.mock('../../src/repositories/studentRepository');
jest.mock('../../src/repositories/attendanceRepository');
jest.mock('../../src/config/database', () => ({
  testConnection: jest.fn(),
  getPool: jest.fn(() => ({
    connect: jest.fn()
  }))
}));

describe('API Integration Endpoints', () => {
  const SECRET = 'test-secret';
  let adminToken;
  let staffToken;

  beforeAll(() => {
    process.env.JWT_SECRET = SECRET;
    adminToken = jwt.sign({ id: 1, role: 'ADMIN' }, SECRET);
    staffToken = jwt.sign({ id: 2, role: 'STAFF' }, SECRET);
  });

  describe('GET /api/health', () => {
    it('should return 200 { status: "ok" } without auth', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok' });
    });
  });

  describe('GET /api/students', () => {
    it('should return 401 when Authorization header is missing', async () => {
      const res = await request(app).get('/api/students');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should allow STAFF to access students', async () => {
      studentRepository.getStudentsWithTutors.mockResolvedValue([]);
      const res = await request(app)
        .get('/api/students')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should allow ADMIN to access students', async () => {
      studentRepository.getStudentsWithTutors.mockResolvedValue([{ id: 1 }]);
      const res = await request(app)
        .get('/api/students')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
    });
  });

  describe('POST /api/students', () => {
    it('should allow ADMIN or STAFF to register student', async () => {
      const payload = {
        student: { first_name: 'Mario', last_name: 'Rossi' },
        tutors: [{ first_name: 'P', last_name: 'R', phone: '123' }]
      };
      studentRepository.createStudentWithTutors.mockResolvedValue({ id: 5, ...payload.student });

      const res = await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/students/:id', () => {
    it('should return 200 with student details', async () => {
      studentRepository.getStudentById.mockResolvedValue({ id: 's1', nome: 'Mario' });
      const res = await request(app)
        .get('/api/students/s1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('s1');
    });

    it('should return 404 when student not found', async () => {
      studentRepository.getStudentById.mockResolvedValue(null);
      const res = await request(app)
        .get('/api/students/non-existent')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/students/:id', () => {
    it('should return 200 when student updated', async () => {
      const payload = {
        student: { first_name: 'Mario Modificato', last_name: 'Rossi' },
        tutors: []
      };
      studentRepository.updateStudentWithTutors.mockResolvedValue({ student: { id: 's1', ...payload.student }, tutors: [] });

      const res = await request(app)
        .put('/api/students/s1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 400 if validation fails on PUT', async () => {
      const res = await request(app)
        .put('/api/students/s1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ student: { first_name: 'Solo' } });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/attendances/expected', () => {
    it('should return 400 when date parameter is missing', async () => {
      const res = await request(app)
        .get('/api/attendances/expected')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(400);
    });

    it('should return 200 with attendances list', async () => {
      attendanceRepository.getExpectedStudents.mockResolvedValue([{ student_id: 1 }]);
      const res = await request(app)
        .get('/api/attendances/expected?date=2026-10-22')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
    });
  });

  describe('POST /api/attendances/bulk', () => {
    it('should return 200 on successful bulk upsert', async () => {
      const records = [{ student_id: 1, is_present: true, date: '2026-10-22' }];
      attendanceRepository.bulkUpsertAttendances.mockResolvedValue(records);

      const res = await request(app)
        .post('/api/attendances/bulk')
        .set('Authorization', `Bearer ${staffToken}`)
        .send(records);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/reports/attendances', () => {
    it('should return 403 for STAFF (ADMIN only)', async () => {
      const res = await request(app)
        .get('/api/reports/attendances?date=2026-10-22')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(403);
    });
  });
});
