const request = require('supertest');
process.env.USE_MEMORY_DB = 'true';
const db = require('../../src/config/database');
const app = require('../../src/app');
const jwt = require('jsonwebtoken');
const userRepository = require('../../src/repositories/userRepository');
const groupRepository = require('../../src/repositories/groupRepository');
const afterschoolRepository = require('../../src/repositories/afterschoolRepository');

describe('Afterschool Assignments API Tests', () => {
  const secret = process.env.JWT_SECRET || 'primola_access_secret_fallback';
  let adminToken;
  let officeToken;
  let teacherToken;
  let teacherUser;
  let adminUser;

  beforeAll(async () => {
    process.env.USE_MEMORY_DB = 'true';
    await db.testConnection();
    // Recupera o crea admin
    adminUser = await userRepository.findByEmail('admin@primola.it');
    adminToken = jwt.sign(
      { id: adminUser.id, email: adminUser.email, groups: ['ADMIN'] },
      secret
    );

    officeToken = jwt.sign(
      { id: '00000000-0000-0000-0000-000000000002', email: 'office@primola.it', groups: ['OFFICE'] },
      secret
    );

    const email = `teacher.afterschool.${Date.now()}@primola.it`;
    teacherUser = await userRepository.create({
      email,
      password: 'Password123!',
      first_name: 'Docente',
      last_name: 'Doposcuola',
      role: 'TEACHER'
    });
    await groupRepository.setUserGroups(teacherUser.id, ['TEACHER']);

    teacherToken = jwt.sign(
      { id: teacherUser.id, email: teacherUser.email, groups: ['TEACHER'] },
      secret
    );
  });

  describe('RBAC & Security', () => {
    it('TEACHER cannot access GET /api/afterschool/assignments (403)', async () => {
      const res = await request(app)
        .get('/api/afterschool/assignments')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(403);
    });

    it('TEACHER cannot assign or modify afterschool assignment (403)', async () => {
      const res = await request(app)
        .post('/api/afterschool/assignments')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          user_id: teacherUser.id,
          hourly_rate: 25.0
        });

      expect(res.status).toBe(403);
    });

    it('TEACHER cannot see afterschool_assignment in GET /api/users/:id', async () => {
      // First assign it as admin
      await afterschoolRepository.upsert(teacherUser.id, 22.50, 'Tariffa standard doposcuola');

      const res = await request(app)
        .get(`/api/users/${teacherUser.id}`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.afterschool_assignment).toBeNull();
    });

    it('ADMIN can see afterschool_assignment in GET /api/users/:id', async () => {
      const res = await request(app)
        .get(`/api/users/${teacherUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.afterschool_assignment).toBeDefined();
      expect(Number(res.body.data.afterschool_assignment.hourly_rate)).toBe(22.50);
    });
  });

  describe('Management CRUD (ADMIN & OFFICE)', () => {
    it('ADMIN can assign afterschool rate to TEACHER', async () => {
      const res = await request(app)
        .post('/api/afterschool/assignments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          user_id: teacherUser.id,
          hourly_rate: 30.00,
          notes: 'Doposcuola pomeridiano'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Number(res.body.data.hourly_rate)).toBe(30.00);
    });

    it('OFFICE can list assignments and view teacher assignment', async () => {
      const res = await request(app)
        .get('/api/afterschool/assignments')
        .set('Authorization', `Bearer ${officeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      const found = res.body.data.find(a => a.user_id === teacherUser.id);
      expect(found).toBeDefined();
      expect(Number(found.hourly_rate)).toBe(30.00);
    });

    it('Only 1 afterschool assignment per teacher: updating overwrites rather than duplicates', async () => {
      const res = await request(app)
        .post('/api/afterschool/assignments')
        .set('Authorization', `Bearer ${officeToken}`)
        .send({
          user_id: teacherUser.id,
          hourly_rate: 35.00,
          notes: 'Tariffa aggiornata'
        });

      expect(res.status).toBe(200);
      expect(Number(res.body.data.hourly_rate)).toBe(35.00);

      const listRes = await request(app)
        .get('/api/afterschool/assignments')
        .set('Authorization', `Bearer ${adminToken}`);

      const filtered = listRes.body.data.filter(a => a.user_id === teacherUser.id);
      expect(filtered.length).toBe(1);
    });

    it('Fails if assigning to non-TEACHER user', async () => {
      const res = await request(app)
        .post('/api/afterschool/assignments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          user_id: adminUser.id,
          hourly_rate: 20.00
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/TEACHER/);
    });

    it('ADMIN / OFFICE can delete afterschool assignment', async () => {
      const res = await request(app)
        .delete(`/api/afterschool/assignments/${teacherUser.id}`)
        .set('Authorization', `Bearer ${officeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const check = await afterschoolRepository.findByUserId(teacherUser.id);
      expect(check).toBeNull();
    });
  });

  describe('Teacher Shifts & Week Summary Calendar', () => {
    let shiftId;

    it('TEACHER can view week summary (GET /api/afterschool/week-summary)', async () => {
      const res = await request(app)
        .get('/api/afterschool/week-summary?startDate=2026-10-26')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.week_start).toBe('2026-10-26');
      expect(res.body.data.days.length).toBe(5);
    });

    it('TEACHER cannot create shifts (403)', async () => {
      const res = await request(app)
        .post('/api/afterschool/shifts')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          user_id: teacherUser.id,
          shift_date: '2026-10-26',
          start_time: '14:00',
          end_time: '17:30'
        });

      expect(res.status).toBe(403);
    });

    it('ADMIN can create a teacher shift', async () => {
      const res = await request(app)
        .post('/api/afterschool/shifts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          user_id: teacherUser.id,
          shift_date: '2026-10-26',
          start_time: '14:00',
          end_time: '17:30',
          notes: 'Supporto compiti primaria'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.user_id).toBe(teacherUser.id);
      shiftId = res.body.data.id;
    });

    it('Week summary reflects the created shift and calculates hours', async () => {
      const res = await request(app)
        .get('/api/afterschool/week-summary?startDate=2026-10-26')
        .set('Authorization', `Bearer ${officeToken}`);

      expect(res.status).toBe(200);
      const monday = res.body.data.days.find(d => d.date === '2026-10-26');
      expect(monday).toBeDefined();
      expect(monday.shifts.length).toBe(1);
      expect(monday.shifts[0].id).toBe(shiftId);
      expect(monday.shifts[0].hours).toBe(3.5);
      expect(monday.total_teacher_hours).toBe(3.5);
    });

    it('OFFICE can update shift times', async () => {
      const res = await request(app)
        .put(`/api/afterschool/shifts/${shiftId}`)
        .set('Authorization', `Bearer ${officeToken}`)
        .send({
          start_time: '14:30',
          end_time: '17:30',
          notes: 'Orario posticipato'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.start_time).toContain('14:30');
    });

    it('OFFICE can delete a shift', async () => {
      const res = await request(app)
        .delete(`/api/afterschool/shifts/${shiftId}`)
        .set('Authorization', `Bearer ${officeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verifichiamo che non compaia più nel riepilogo
      const summaryRes = await request(app)
        .get('/api/afterschool/week-summary?startDate=2026-10-26')
        .set('Authorization', `Bearer ${teacherToken}`);

      const monday = summaryRes.body.data.days.find(d => d.date === '2026-10-26');
      expect(monday.shifts.length).toBe(0);
    });
  });

  describe('Closure Days & Italian Holidays (Admin & Office - D5, D6b)', () => {
    let closureId;
    let officeClosureId;

    it('TEACHER cannot create or delete closure days (403)', async () => {
      const resTeacher = await request(app)
        .post('/api/afterschool/closures')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ date: '2026-10-28', title: 'Assemblea' });
      expect(resTeacher.status).toBe(403);

      const delTeacher = await request(app)
        .delete('/api/afterschool/closures/00000000-0000-0000-0000-000000000099')
        .set('Authorization', `Bearer ${teacherToken}`);
      expect(delTeacher.status).toBe(403);
    });

    it('OFFICE can create and delete closure days (D6b)', async () => {
      const createRes = await request(app)
        .post('/api/afterschool/closures')
        .set('Authorization', `Bearer ${officeToken}`)
        .send({
          date: '2026-10-29',
          title: 'Assemblea sindacale',
          notes: 'Chiusura inserita da Office'
        });
      expect(createRes.status).toBe(201);
      expect(createRes.body.success).toBe(true);
      officeClosureId = createRes.body.data.id;

      const delRes = await request(app)
        .delete(`/api/afterschool/closures/${officeClosureId}`)
        .set('Authorization', `Bearer ${officeToken}`);
      expect(delRes.status).toBe(200);
      expect(delRes.body.success).toBe(true);
    });

    it('ADMIN can create a closure day and week-summary shows 0 expected students by default (D5)', async () => {
      const res = await request(app)
        .post('/api/afterschool/closures')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          date: '2026-10-28',
          title: 'Festa del Patrono',
          notes: 'Doposcuola sospeso'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      closureId = res.body.data.id;

      // Verifica in week summary (accessibile anche a Teacher)
      const weekRes = await request(app)
        .get('/api/afterschool/week-summary?startDate=2026-10-26')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(weekRes.status).toBe(200);
      const wednesday = weekRes.body.data.days.find(d => d.date === '2026-10-28');
      expect(wednesday).toBeDefined();
      expect(wednesday.closure).toBeDefined();
      expect(wednesday.closure.title).toBe('Festa del Patrono');
      expect(wednesday.expected_students_count).toBe(0);
      expect(wednesday.students).toEqual([]);
    });

    it('Week summary detects Italian national holidays with day.holiday and 0 expected students (D5, D7)', async () => {
      const weekRes = await request(app)
        .get('/api/afterschool/week-summary?startDate=2026-12-21')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(weekRes.status).toBe(200);
      const christmas = weekRes.body.data.days.find(d => d.date === '2026-12-25');
      expect(christmas).toBeDefined();
      expect(christmas.holiday).toEqual({ name: 'Natale', isHoliday: true });
      expect(christmas.expected_students_count).toBe(0);
      expect(christmas.students).toEqual([]);

      const normalDay = weekRes.body.data.days.find(d => d.date === '2026-12-22');
      expect(normalDay.holiday).toBeNull();
      expect(normalDay.expected_students_count).toBeGreaterThan(0);
      expect(normalDay.students.every(st => st.has_meal === false)).toBe(true);
    });

    it('ADMIN can list and delete a closure day', async () => {
      const listRes = await request(app)
        .get('/api/afterschool/closures')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.some(c => c.id === closureId)).toBe(true);

      const delRes = await request(app)
        .delete(`/api/afterschool/closures/${closureId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(delRes.status).toBe(200);
      expect(delRes.body.success).toBe(true);
    });
  });

  describe('Attendances Expected & Delete API (D1, D5, D6a, D7)', () => {
    const testStudentId = '33333333-3333-3333-3333-333333333333'; // Mario Rossi {1,2,3,4,5}
    const holidayDate = '2026-12-25';

    it('GET /api/attendances/expected pre-populates subscribed students on normal weekday without pre-activating meals', async () => {
      const res = await request(app)
        .get('/api/attendances/expected?date=2026-10-28') // Mercoledì
        .set('Authorization', `Bearer ${officeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const ids = res.body.data.map(s => s.student_id);
      expect(ids).toContain(testStudentId);
      // Sofia Ferrari ha solo {2,4} (Mar, Gio), non mercoledì
      expect(ids).not.toContain('55555555-5555-5555-5555-555555555555');
      expect(res.body.data.every(s => s.canteen_used === false)).toBe(true);
    });

    it('GET /api/attendances/expected returns 0 students on closure_days and Italian holidays unless manually registered', async () => {
      const resHoliday = await request(app)
        .get(`/api/attendances/expected?date=${holidayDate}`)
        .set('Authorization', `Bearer ${officeToken}`);
      expect(resHoliday.status).toBe(200);
      expect(resHoliday.body.data).toEqual([]);

      const resClosure = await request(app)
        .get('/api/attendances/expected?date=2026-12-07')
        .set('Authorization', `Bearer ${officeToken}`);
      expect(resClosure.status).toBe(200);
      expect(resClosure.body.data).toEqual([]);
    });

    it('OFFICE/ADMIN can delete an attendance record via DELETE /api/attendances/:date/:studentId while TEACHER gets 403', async () => {
      // Salva presenza su festivo come OFFICE
      const bulkRes = await request(app)
        .post('/api/attendances/bulk')
        .set('Authorization', `Bearer ${officeToken}`)
        .send([{ student_id: testStudentId, date: holidayDate, is_present: true, canteen_used: true }]);
      expect(bulkRes.status).toBe(200);

      // Verifica che ora appaia in expected
      const afterInsert = await request(app)
        .get(`/api/attendances/expected?date=${holidayDate}`)
        .set('Authorization', `Bearer ${officeToken}`);
      expect(afterInsert.body.data.length).toBe(1);

      // TEACHER non può eliminare (403)
      const teacherDel = await request(app)
        .delete(`/api/attendances/${holidayDate}/${testStudentId}`)
        .set('Authorization', `Bearer ${teacherToken}`);
      expect(teacherDel.status).toBe(403);

      // OFFICE elimina definitivamente
      const officeDel = await request(app)
        .delete(`/api/attendances/${holidayDate}/${testStudentId}`)
        .set('Authorization', `Bearer ${officeToken}`);
      expect(officeDel.status).toBe(200);
      expect(officeDel.body.success).toBe(true);

      const afterDelete = await request(app)
        .get(`/api/attendances/expected?date=${holidayDate}`)
        .set('Authorization', `Bearer ${officeToken}`);
      expect(afterDelete.body.data).toEqual([]);
    });
  });
});


