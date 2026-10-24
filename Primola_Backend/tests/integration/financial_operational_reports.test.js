const request = require('supertest');
const app = require('../../src/app');
const jwt = require('jsonwebtoken');

describe('Financial & Operational Reports API Tests', () => {
  const secret = process.env.JWT_SECRET || 'primola_access_secret_fallback';

  const adminToken = jwt.sign(
    { id: '00000000-0000-0000-0000-000000000001', email: 'admin@primola.it', groups: ['ADMIN'] },
    secret
  );

  const officeToken = jwt.sign(
    { id: '00000000-0000-0000-0000-000000000002', email: 'office@primola.it', groups: ['OFFICE'] },
    secret
  );

  const teacherToken = jwt.sign(
    { id: '00000000-0000-0000-0000-000000000003', email: 'teacher@primola.it', groups: ['TEACHER'] },
    secret
  );

  describe('System Settings API (/api/settings)', () => {
    it('ADMIN can read system settings', async () => {
      const res = await request(app)
        .get('/api/settings')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.settings).toBeDefined();
      expect(res.body.data.settings.doposcuola_daily_fee).toBeDefined();
    });

    it('OFFICE can read system settings', async () => {
      const res = await request(app)
        .get('/api/settings')
        .set('Authorization', `Bearer ${officeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('TEACHER cannot access system settings', async () => {
      const res = await request(app)
        .get('/api/settings')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(403);
    });

    it('ADMIN can update system settings', async () => {
      const res = await request(app)
        .put('/api/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          doposcuola_daily_fee: 14.50,
          meal_fee_student: 6.00
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.settings.doposcuola_daily_fee).toBe(14.50);
      expect(res.body.data.settings.meal_fee_student).toBe(6.00);
    });

    it('OFFICE cannot update system settings', async () => {
      const res = await request(app)
        .put('/api/settings')
        .set('Authorization', `Bearer ${officeToken}`)
        .send({ doposcuola_daily_fee: 20 });

      expect(res.status).toBe(403);
    });
  });

  describe('Financial Monthly Report (/api/reports/financial-monthly)', () => {
    it('ADMIN can retrieve financial monthly report', async () => {
      const res = await request(app)
        .get('/api/reports/financial-monthly?year=2026&month=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const data = res.body.data;
      expect(data.year).toBe(2026);
      expect(data.month).toBe(10);
      expect(data.doposcuola).toBeDefined();
      expect(data.doposcuola.revenues).toBeDefined();
      expect(data.doposcuola.expenses).toBeDefined();
      expect(data.doposcuola.total_meals).toBeDefined();
      expect(Array.isArray(data.doposcuola.teachers)).toBe(true);
      expect(data.courses).toBeDefined();
      expect(data.courses.revenues).toBeDefined();
      expect(data.courses.expenses).toBeDefined();
      expect(Array.isArray(data.courses.teachers)).toBe(true);
      expect(data.summary).toBeDefined();
    });

    it('OFFICE is forbidden from financial monthly report', async () => {
      const res = await request(app)
        .get('/api/reports/financial-monthly?year=2026&month=10')
        .set('Authorization', `Bearer ${officeToken}`);

      expect(res.status).toBe(403);
    });

    it('TEACHER is forbidden from financial monthly report', async () => {
      const res = await request(app)
        .get('/api/reports/financial-monthly?year=2026&month=10')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('Operational Monthly Report (/api/reports/operational-monthly)', () => {
    it('ADMIN and OFFICE can retrieve operational monthly report', async () => {
      const resAdmin = await request(app)
        .get('/api/reports/operational-monthly?year=2026&month=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(resAdmin.status).toBe(200);
      expect(resAdmin.body.success).toBe(true);
      const data = resAdmin.body.data;
      expect(Array.isArray(data.students_meals)).toBe(true);
      expect(data.afterschool_teachers).toBeDefined();
      expect(Array.isArray(data.afterschool_teachers.teachers)).toBe(true);
      expect(data.finished_courses_teachers).toBeDefined();
      expect(Array.isArray(data.finished_courses_teachers.courses)).toBe(true);

      const resOffice = await request(app)
        .get('/api/reports/operational-monthly?year=2026&month=10')
        .set('Authorization', `Bearer ${officeToken}`);

      expect(resOffice.status).toBe(200);
      expect(resOffice.body.success).toBe(true);
    });

    it('TEACHER is forbidden from operational monthly report', async () => {
      const res = await request(app)
        .get('/api/reports/operational-monthly?year=2026&month=10')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(403);
    });
  });
});
