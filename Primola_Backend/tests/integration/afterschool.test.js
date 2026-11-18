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
      expect(normalDay.expected_students_count).toBe(0);
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

    it('GET /api/attendances/expected returns students registered in attendances for that date', async () => {
      const res = await request(app)
        .get('/api/attendances/expected?date=2026-11-16') // Lunedì con seed in attendances
        .set('Authorization', `Bearer ${officeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const ids = res.body.data.map(s => s.student_id);
      expect(ids).toContain(testStudentId);
      // Sofia Ferrari non è presente in attendances il 2026-11-16
      expect(ids).not.toContain('55555555-5555-5555-5555-555555555555');
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

  describe('Weekly Copy Endpoints (copy-previous-students & copy-previous-teachers)', () => {
    const marioId = '33333333-3333-3333-3333-333333333333';
    const luigiId = '44444444-4444-4444-4444-444444444444';

    afterAll(async () => {
      await db.query(
        `DELETE FROM attendances WHERE date BETWEEN '2026-11-30' AND '2026-12-11'`
      );
      await db.query(
        `DELETE FROM teacher_shifts WHERE shift_date BETWEEN '2026-11-30' AND '2026-12-11'`
      );
    });

    it('TEACHER gets 403 on copy-previous-students and copy-previous-teachers', async () => {
      const resStudents = await request(app)
        .post('/api/afterschool/copy-previous-students')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ weekStartDate: '2026-12-07' });
      expect(resStudents.status).toBe(403);

      const resTeachers = await request(app)
        .post('/api/afterschool/copy-previous-teachers')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ weekStartDate: '2026-12-07' });
      expect(resTeachers.status).toBe(403);
    });

    it('OFFICE/ADMIN can copy students from previous week preserving canteen_used, setting is_present=false, skipping holidays/closures, and not duplicating', async () => {
      // Popola settimana precedente: 2026-11-30 (Lun), 2026-12-01 (Mar), 2026-12-02 (Mer)
      await db.query(
        `INSERT INTO attendances (student_id, date, is_present, canteen_used, notes)
         VALUES
           ($1, '2026-11-30', true, true, 'Nota vecchia'),
           ($1, '2026-12-01', true, false, 'Nota mar'),
           ($1, '2026-12-02', true, true, 'Nota mer'),
           ($2, '2026-12-02', true, false, '')`,
        [marioId, luigiId]
      );

      // Pre-inserisci Luigi su 2026-12-09 (Mer) con is_present=true per verificare no overwrite
      await db.query(
        `INSERT INTO attendances (student_id, date, is_present, canteen_used, notes)
         VALUES ($1, '2026-12-09', true, true, 'Gia presente')`,
        [luigiId]
      );

      // Copia su settimana 2026-12-07:
      // - 2026-12-07 (Lun) è closure_days -> saltato
      // - 2026-12-08 (Mar) è Immacolata Concezione (holiday) -> saltato
      // - 2026-12-09 (Mer) normale -> Mario copiato, Luigi non sovrascritto
      const copyRes = await request(app)
        .post('/api/afterschool/copy-previous-students')
        .set('Authorization', `Bearer ${officeToken}`)
        .send({ weekStartDate: '2026-12-07' });

      expect(copyRes.status).toBe(200);
      expect(copyRes.body.success).toBe(true);
      expect(copyRes.body.data.copied_count).toBe(1);
      expect(copyRes.body.data.skipped_dates).toEqual(['2026-12-07', '2026-12-08']);

      // Verifica 2026-12-09
      const dec09Res = await request(app)
        .get('/api/attendances/expected?date=2026-12-09')
        .set('Authorization', `Bearer ${officeToken}`);
      expect(dec09Res.status).toBe(200);
      const mario = dec09Res.body.data.find(s => s.student_id === marioId);
      const luigi = dec09Res.body.data.find(s => s.student_id === luigiId);
      expect(mario).toBeDefined();
      expect(mario.is_present).toBe(false);
      expect(mario.canteen_used).toBe(true);
      expect(mario.notes).toBe('');
      expect(luigi.is_present).toBe(true);
      expect(luigi.notes).toBe('Gia presente');

      // Verifica 2026-12-07 e 2026-12-08 vuoti
      const dec07Res = await request(app)
        .get('/api/attendances/expected?date=2026-12-07')
        .set('Authorization', `Bearer ${officeToken}`);
      expect(dec07Res.body.data).toEqual([]);

      const dec08Res = await request(app)
        .get('/api/attendances/expected?date=2026-12-08')
        .set('Authorization', `Bearer ${officeToken}`);
      expect(dec08Res.body.data).toEqual([]);

      // Seconda chiamata idempotente: 0 copiati
      const secondCopy = await request(app)
        .post('/api/afterschool/copy-previous-students')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ weekStartDate: '2026-12-07' });
      expect(secondCopy.status).toBe(200);
      expect(secondCopy.body.data.copied_count).toBe(0);
    });

    it('OFFICE/ADMIN can copy teacher shifts from previous week skipping holidays/closures and not duplicating', async () => {
      // Turni settimana precedente: 2026-11-30 (Lun), 2026-12-01 (Mar), 2026-12-03 (Gio)
      await db.query(
        `INSERT INTO teacher_shifts (user_id, shift_date, start_time, end_time, notes)
         VALUES
           ($1, '2026-11-30', '14:00', '17:00', 'Lun'),
           ($1, '2026-12-01', '14:00', '17:00', 'Mar'),
           ($1, '2026-12-03', '14:30', '18:00', 'Gio')`,
        [teacherUser.id]
      );

      // Copia su settimana 2026-12-07 (Lun 07 closure, Mar 08 holiday, Gio 10 copiato)
      const copyRes = await request(app)
        .post('/api/afterschool/copy-previous-teachers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ weekStartDate: '2026-12-07' });

      expect(copyRes.status).toBe(200);
      expect(copyRes.body.success).toBe(true);
      expect(copyRes.body.data.copied_count).toBe(1);
      expect(copyRes.body.data.skipped_dates).toEqual(['2026-12-07', '2026-12-08']);

      // Seconda chiamata: nessun duplicato
      const secondCopy = await request(app)
        .post('/api/afterschool/copy-previous-teachers')
        .set('Authorization', `Bearer ${officeToken}`)
        .send({ weekStartDate: '2026-12-07' });
      expect(secondCopy.status).toBe(200);
      expect(secondCopy.body.data.copied_count).toBe(0);

      // Verifica week-summary
      const summaryRes = await request(app)
        .get('/api/afterschool/week-summary?startDate=2026-12-07')
        .set('Authorization', `Bearer ${officeToken}`);
      expect(summaryRes.status).toBe(200);
      const thu = summaryRes.body.data.days.find(d => d.date === '2026-12-10');
      expect(thu.shifts.length).toBe(1);
      expect(thu.shifts[0].start_time).toBe('14:30');
      expect(thu.shifts[0].end_time).toBe('18:00');
    });
  });
});


