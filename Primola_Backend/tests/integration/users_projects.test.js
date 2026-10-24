const request = require('supertest');
const app = require('../../src/app');
const jwt = require('jsonwebtoken');

describe('Users, Projects & RBAC Integration Tests', () => {
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

  const testEmail = `prof.bianchi.${Date.now()}@primola.it`;
  let createdUserId;
  let createdProjectId;

  beforeAll(async () => {
    const db = require('../../src/config/database');
    await db.query("DELETE FROM users WHERE email LIKE 'prof.bianchi.%'");
  });

  describe('User Management & Permissions', () => {
    it('ADMIN should list all users', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('ADMIN should create a user with multiple groups', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: testEmail,
          password: 'Password123!',
          first_name: 'Paolo',
          last_name: 'Bianchi',
          phone: '+39 333 1234567',
          groups: ['TEACHER', 'OFFICE']
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(testEmail);
      expect(res.body.data.groups).toContain('TEACHER');
      expect(res.body.data.groups).toContain('OFFICE');
      createdUserId = res.body.data.id;
    });

    it('OFFICE should NOT be able to assign or modify groups', async () => {
      const res = await request(app)
        .put(`/api/users/${createdUserId}`)
        .set('Authorization', `Bearer ${officeToken}`)
        .send({
          first_name: 'Paolo Modificato',
          groups: ['ADMIN']
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('OFFICE can update basic profile of an user without changing groups', async () => {
      const res = await request(app)
        .put(`/api/users/${createdUserId}`)
        .set('Authorization', `Bearer ${officeToken}`)
        .send({
          first_name: 'Paolo Aggiornato',
          phone: '+39 333 9999999'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.first_name).toBe('Paolo Aggiornato');
    });

    it('TEACHER should only see their own profile in list and detail', async () => {
      // TEACHER requesting another user's detail -> 403
      const resOther = await request(app)
        .get(`/api/users/${createdUserId}`)
        .set('Authorization', `Bearer ${teacherToken}`);
      expect(resOther.status).toBe(403);

      // TEACHER requesting list -> returns only self
      const resList = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${teacherToken}`);
      expect(resList.status).toBe(200);
      expect(resList.body.data.length).toBe(0); // teacherToken id non è ancora nel db, ritorna []
    });
  });

  describe('Projects Management & Assignments', () => {
    it('ADMIN can create a project', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Laboratorio Doposcuola Matematica',
          description: 'Attività pomeridiana per medie',
          location: 'Sede Primola Centro'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Laboratorio Doposcuola Matematica');
      createdProjectId = res.body.data.id;
    });

    it('ADMIN / OFFICE can assign teacher with rate and hours', async () => {
      const res = await request(app)
        .post(`/api/projects/${createdProjectId}/teachers`)
        .set('Authorization', `Bearer ${officeToken}`)
        .send({
          user_id: createdUserId,
          hourly_rate: 25.50,
          assigned_hours: 40
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Number(res.body.data.hourly_rate)).toBe(25.50);
      expect(Number(res.body.data.assigned_hours)).toBe(40);
    });

    it('ADMIN can view project report including costs and rates', async () => {
      const res = await request(app)
        .get('/api/reports/projects')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.summary.total_projects).toBeGreaterThanOrEqual(1);
      expect(res.body.data.summary.total_cost).toBeGreaterThanOrEqual(1020);
    });

    it('TEACHER is blocked from accessing project report', async () => {
      const res = await request(app)
        .get('/api/reports/projects')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(403);
    });
  });

  afterAll(async () => {
    const db = require('../../src/config/database');
    await db.getPool().end();
  });
});
