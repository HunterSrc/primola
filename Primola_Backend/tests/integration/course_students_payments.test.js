const request = require('supertest');
process.env.USE_MEMORY_DB = 'true';
const db = require('../../src/config/database');
const app = require('../../src/app');
const jwt = require('jsonwebtoken');

const offsetDate = (days) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

describe('Course Students, Enrollments, Installments & Financial Report Integration Tests', () => {
  const secret = process.env.JWT_SECRET || 'primola_access_secret_fallback';

  const adminToken = jwt.sign(
    { id: '00000000-0000-0000-0000-000000000001', email: 'admin@primola.it', groups: ['ADMIN'] },
    secret
  );

  const officeToken = jwt.sign(
    { id: '00000000-0000-0000-0000-000000000010', email: 'office@primola.it', groups: ['OFFICE'] },
    secret
  );

  const teacherToken = jwt.sign(
    { id: '00000000-0000-0000-0000-000000000011', email: 'teacher@primola.it', groups: ['TEACHER'] },
    secret
  );

  let smallCourseId;
  let studentValidId;
  let studentExpiringId;
  let studentExpiredId;
  let studentNoCardId;
  let studentValidNoDateId;
  let enrollment1Id;
  let enrollment2Id;

  beforeAll(async () => {
    process.env.USE_MEMORY_DB = 'true';
    await db.testConnection();
    await db.query('DELETE FROM course_installments');
    await db.query('DELETE FROM course_enrollments');
    await db.query('DELETE FROM course_students');
  });

  describe('RBAC Protection', () => {
    it('rejects unauthenticated requests with 401', async () => {
      const res1 = await request(app).get('/api/course-students');
      expect(res1.status).toBe(401);

      const res2 = await request(app).get('/api/course-enrollments');
      expect(res2.status).toBe(401);
    });

    it('rejects TEACHER role with 403', async () => {
      const res1 = await request(app)
        .get('/api/course-students')
        .set('Authorization', `Bearer ${teacherToken}`);
      expect(res1.status).toBe(403);

      const res2 = await request(app)
        .get('/api/course-enrollments')
        .set('Authorization', `Bearer ${teacherToken}`);
      expect(res2.status).toBe(403);
    });
  });

  describe('Course Students CRUD & Card Status', () => {
    it('validates nome and cognome required', async () => {
      const res = await request(app)
        .post('/api/course-students')
        .set('Authorization', `Bearer ${officeToken}`)
        .send({ nome: 'SoloNome' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('creates course students with all 10 fields and computes card_status accurately', async () => {
      const validRes = await request(app)
        .post('/api/course-students')
        .set('Authorization', `Bearer ${officeToken}`)
        .send({
          nome: 'Chiara',
          cognome: 'Valida',
          email: 'chiara@example.com',
          telefono: '+39 333 1111111',
          data_nascita: '1995-03-14',
          luogo_nascita: 'Bologna',
          indirizzo_residenza: 'Via Roma 1',
          citta_residenza: 'Bologna',
          possiede_tessera: true,
          data_scadenza_tessera: offsetDate(90)
        });
      expect(validRes.status).toBe(201);
      expect(validRes.body.data.card_status).toBe('VALIDA');
      expect(validRes.body.data.days_to_expiry).toBeGreaterThan(30);
      expect(validRes.body.data.data_nascita).toBe('1995-03-14');
      studentValidId = validRes.body.data.id;

      const expiringRes = await request(app)
        .post('/api/course-students')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nome: 'Luca',
          cognome: 'InScadenza',
          email: 'luca@example.com',
          telefono: '+39 333 2222222',
          possiede_tessera: true,
          data_scadenza_tessera: offsetDate(15)
        });
      expect(expiringRes.status).toBe(201);
      expect(expiringRes.body.data.card_status).toBe('IN_SCADENZA');
      expect(expiringRes.body.data.days_to_expiry).toBeGreaterThanOrEqual(0);
      expect(expiringRes.body.data.days_to_expiry).toBeLessThanOrEqual(30);
      studentExpiringId = expiringRes.body.data.id;

      const expiredRes = await request(app)
        .post('/api/course-students')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nome: 'Marco',
          cognome: 'Scaduto',
          possiede_tessera: true,
          data_scadenza_tessera: offsetDate(-5)
        });
      expect(expiredRes.status).toBe(201);
      expect(expiredRes.body.data.card_status).toBe('SCADUTA');
      expect(expiredRes.body.data.days_to_expiry).toBeLessThan(0);
      studentExpiredId = expiredRes.body.data.id;

      const noCardRes = await request(app)
        .post('/api/course-students')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nome: 'Elena',
          cognome: 'SenzaTessera',
          possiede_tessera: false
        });
      expect(noCardRes.status).toBe(201);
      expect(noCardRes.body.data.card_status).toBe('NESSUNA_TESSERA');
      expect(noCardRes.body.data.days_to_expiry).toBeNull();
      studentNoCardId = noCardRes.body.data.id;

      const validNoDateRes = await request(app)
        .post('/api/course-students')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nome: 'Giulia',
          cognome: 'SenzaScadenza',
          possiede_tessera: true,
          data_scadenza_tessera: null
        });
      expect(validNoDateRes.status).toBe(201);
      expect(validNoDateRes.body.data.card_status).toBe('VALIDA');
      expect(validNoDateRes.body.data.days_to_expiry).toBeNull();
      studentValidNoDateId = validNoDateRes.body.data.id;
    });

    it('lists course students with summary and supports search & card_status filters', async () => {
      const listRes = await request(app)
        .get('/api/course-students')
        .set('Authorization', `Bearer ${officeToken}`);
      expect(listRes.status).toBe(200);
      expect(listRes.body.data.students.length).toBe(5);
      expect(listRes.body.data.summary).toEqual({
        total: 5,
        valid: 2,
        expiring_soon: 1,
        expired: 1,
        no_card: 1
      });

      const filteredStatus = await request(app)
        .get('/api/course-students?card_status=SCADUTA')
        .set('Authorization', `Bearer ${officeToken}`);
      expect(filteredStatus.status).toBe(200);
      expect(filteredStatus.body.data.students.length).toBe(1);
      expect(filteredStatus.body.data.students[0].id).toBe(studentExpiredId);

      const filteredSearch = await request(app)
        .get('/api/course-students?search=chiara')
        .set('Authorization', `Bearer ${officeToken}`);
      expect(filteredSearch.status).toBe(200);
      expect(filteredSearch.body.data.students.length).toBe(1);
      expect(filteredSearch.body.data.students[0].id).toBe(studentValidId);
    });

    it('updates a course student', async () => {
      const res = await request(app)
        .put(`/api/course-students/${studentNoCardId}`)
        .set('Authorization', `Bearer ${officeToken}`)
        .send({
          citta_residenza: 'Modena',
          possiede_tessera: true,
          data_scadenza_tessera: offsetDate(60)
        });
      expect(res.status).toBe(200);
      expect(res.body.data.citta_residenza).toBe('Modena');
      expect(res.body.data.card_status).toBe('VALIDA');
    });
  });

  describe('Course Enrollments, Installments (1-4), Over-Capacity & Project Sync', () => {
    it('creates a small course (max_enrolled=1, enrollment_fee=100) for testing', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Corso Ceramica Test',
          type: 'CORSO',
          enrollment_fee: 100.00,
          max_enrolled: 1,
          start_date: '2026-10-01',
          end_date: '2026-12-20',
          location: 'Atelier 1'
        });
      expect(res.status).toBe(201);
      smallCourseId = res.body.data.id;
    });

    it('rejects invalid installments_count outside 1..4', async () => {
      const res0 = await request(app)
        .post('/api/course-enrollments')
        .set('Authorization', `Bearer ${officeToken}`)
        .send({ course_student_id: studentValidId, project_id: smallCourseId, installments_count: 0 });
      expect(res0.status).toBe(400);

      const res5 = await request(app)
        .post('/api/course-enrollments')
        .set('Authorization', `Bearer ${officeToken}`)
        .send({ course_student_id: studentValidId, project_id: smallCourseId, installments_count: 5 });
      expect(res5.status).toBe(400);
    });

    it('creates enrollment defaulting total_amount to enrollment_fee and splitting 3 installments with remainder on last', async () => {
      const res = await request(app)
        .post('/api/course-enrollments')
        .set('Authorization', `Bearer ${officeToken}`)
        .send({
          course_student_id: studentValidId,
          project_id: smallCourseId,
          installments_count: 3,
          enrolled_at: '2026-10-05',
          notes: 'Iscrizione in 3 rate'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.over_capacity).toBe(false);
      expect(res.body.data.actual_enrolled).toBe(1);
      expect(res.body.data.max_enrolled).toBe(1);

      const enrollment = res.body.data.enrollment;
      expect(enrollment.total_amount).toBe(100);
      expect(enrollment.paid_amount).toBe(0);
      expect(enrollment.remaining_amount).toBe(100);
      expect(enrollment.payment_status).toBe('PENDING');
      expect(enrollment.installments.length).toBe(3);
      expect(enrollment.installments.map(i => i.amount)).toEqual([33.33, 33.33, 33.34]);
      enrollment1Id = enrollment.id;
    });

    it('returns 409 on duplicate (course_student_id, project_id)', async () => {
      const res = await request(app)
        .post('/api/course-enrollments')
        .set('Authorization', `Bearer ${officeToken}`)
        .send({
          course_student_id: studentValidId,
          project_id: smallCourseId,
          installments_count: 1
        });
      expect(res.status).toBe(409);
    });

    it('allows over-capacity enrollment with over_capacity=true and syncs projects.actual_enrolled', async () => {
      const res = await request(app)
        .post('/api/course-enrollments')
        .set('Authorization', `Bearer ${officeToken}`)
        .send({
          course_student_id: studentExpiringId,
          project_id: smallCourseId,
          total_amount: 120,
          installments_count: 2,
          enrolled_at: '2026-10-06'
        });
      expect(res.status).toBe(201);
      expect(res.body.data.over_capacity).toBe(true);
      expect(res.body.data.actual_enrolled).toBe(2);
      expect(res.body.data.max_enrolled).toBe(1);
      expect(res.body.data.enrollment.installments.map(i => i.amount)).toEqual([60, 60]);
      enrollment2Id = res.body.data.enrollment.id;

      // Verify dynamic actual_enrolled on GET /api/projects and GET /api/projects/:id
      const projDetail = await request(app)
        .get(`/api/projects/${smallCourseId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(projDetail.status).toBe(200);
      expect(Number(projDetail.body.data.actual_enrolled)).toBe(2);

      const projList = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(projList.status).toBe(200);
      const found = projList.body.data.find(p => p.id === smallCourseId);
      expect(found).toBeDefined();
      expect(Number(found.actual_enrolled)).toBe(2);
    });

    it('updates a pending installment and recalculates enrollment total_amount', async () => {
      const listRes = await request(app)
        .get(`/api/course-enrollments?course_student_id=${studentValidId}`)
        .set('Authorization', `Bearer ${officeToken}`);
      const inst1 = listRes.body.data.enrollments[0].installments[0];

      const updRes = await request(app)
        .put(`/api/course-enrollments/installments/${inst1.id}`)
        .set('Authorization', `Bearer ${officeToken}`)
        .send({ amount: 40.00, notes: 'Prima rata maggiorata' });

      expect(updRes.status).toBe(200);
      expect(updRes.body.data.installment.amount).toBe(40);
      expect(updRes.body.data.installment.notes).toBe('Prima rata maggiorata');
      // 40 + 33.33 + 33.34 = 106.67
      expect(updRes.body.data.enrollment.total_amount).toBe(106.67);
    });

    it('pays, blocks editing paid, unpays, and settles installments', async () => {
      const detailStudent = await request(app)
        .get(`/api/course-students/${studentValidId}`)
        .set('Authorization', `Bearer ${officeToken}`);
      expect(detailStudent.status).toBe(200);
      expect(detailStudent.body.data.enrollments.length).toBe(1);
      const inst1 = detailStudent.body.data.enrollments[0].installments[0];

      // Pay installment 1 in October 2026
      const payRes = await request(app)
        .post(`/api/course-enrollments/installments/${inst1.id}/pay`)
        .set('Authorization', `Bearer ${officeToken}`)
        .send({
          paid_at: '2026-10-12',
          payment_method: 'BONIFICO',
          notes: 'Ricevuto bonifico'
        });
      expect(payRes.status).toBe(200);
      expect(payRes.body.data.installment.status).toBe('PAID');
      expect(payRes.body.data.installment.paid_at).toBe('2026-10-12');
      expect(payRes.body.data.installment.payment_method).toBe('BONIFICO');
      expect(payRes.body.data.enrollment.paid_amount).toBe(40);
      expect(payRes.body.data.enrollment.remaining_amount).toBe(66.67);
      expect(payRes.body.data.enrollment.payment_status).toBe('PENDING');

      // Cannot edit PAID installment
      const editPaidRes = await request(app)
        .put(`/api/course-enrollments/installments/${inst1.id}`)
        .set('Authorization', `Bearer ${officeToken}`)
        .send({ amount: 50 });
      expect(editPaidRes.status).toBe(400);

      // Unpay installment 1
      const unpayRes = await request(app)
        .post(`/api/course-enrollments/installments/${inst1.id}/unpay`)
        .set('Authorization', `Bearer ${officeToken}`);
      expect(unpayRes.status).toBe(200);
      expect(unpayRes.body.data.installment.status).toBe('PENDING');
      expect(unpayRes.body.data.installment.paid_at).toBeNull();
      expect(unpayRes.body.data.installment.payment_method).toBeNull();
      expect(unpayRes.body.data.enrollment.paid_amount).toBe(0);

      // Re-pay installment 1 in October 2026
      await request(app)
        .post(`/api/course-enrollments/installments/${inst1.id}/pay`)
        .set('Authorization', `Bearer ${officeToken}`)
        .send({ paid_at: '2026-10-15', payment_method: 'POS' });

      // Settle enrollment 2 completely in October 2026 (120 EUR)
      const settleRes = await request(app)
        .post(`/api/course-enrollments/${enrollment2Id}/settle`)
        .set('Authorization', `Bearer ${officeToken}`)
        .send({ paid_at: '2026-10-20', payment_method: 'CONTANTI', notes: 'Saldo totale' });
      expect(settleRes.status).toBe(200);
      expect(settleRes.body.data.settled_count).toBe(2);
      expect(settleRes.body.data.enrollment.payment_status).toBe('PAID');
      expect(settleRes.body.data.enrollment.paid_amount).toBe(120);
      expect(settleRes.body.data.enrollment.remaining_amount).toBe(0);
    });

    it('filters enrollments by payment_status and computes summary', async () => {
      const paidList = await request(app)
        .get(`/api/course-enrollments?project_id=${smallCourseId}&payment_status=PAID`)
        .set('Authorization', `Bearer ${officeToken}`);
      expect(paidList.status).toBe(200);
      expect(paidList.body.data.enrollments.length).toBe(1);
      expect(paidList.body.data.summary).toEqual({
        total_enrollments: 1,
        total_amount: 120,
        total_paid: 120,
        total_remaining: 0
      });

      const pendingList = await request(app)
        .get(`/api/course-enrollments?project_id=${smallCourseId}&payment_status=PENDING`)
        .set('Authorization', `Bearer ${officeToken}`);
      expect(pendingList.status).toBe(200);
      expect(pendingList.body.data.enrollments.length).toBe(1);
      expect(pendingList.body.data.summary).toEqual({
        total_enrollments: 1,
        total_amount: 106.67,
        total_paid: 40,
        total_remaining: 66.67
      });
    });

    it('reflects real paid & remaining course installments in /api/reports/financial-monthly', async () => {
      // In October 2026: enrollment1 paid 40.00 (remaining 66.67), enrollment2 paid 120.00 (remaining 0)
      // Total actual course revenues in Oct 2026 = 160.00, remaining = 66.67
      const finRes = await request(app)
        .get('/api/reports/financial-monthly?year=2026&month=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(finRes.status).toBe(200);
      const data = finRes.body.data;
      expect(data.courses.revenues.expected).toBeNull();
      expect(data.courses.revenues.actual).toBe(160);
      expect(data.courses.revenues.remaining).toBe(66.67);
      expect(data.courses.margin.expected).toBeNull();
      expect(data.courses.margin.actual).toBe(
        Number((160 - data.courses.expenses.actual).toFixed(2))
      );

      expect(data.summary.total_expected_revenues).toBe(data.doposcuola.revenues.expected);
      expect(data.summary.total_actual_revenues).toBe(
        Number((data.doposcuola.revenues.actual + 160).toFixed(2))
      );
      expect(data.summary.total_courses_remaining).toBe(66.67);
      expect(data.summary.total_pending_revenues).toBe(
        Number((data.doposcuola.revenues.pending + 66.67).toFixed(2))
      );
      expect(data.summary.total_expected_margin).toBe(
        Number(
          (
            data.doposcuola.revenues.expected -
            (data.doposcuola.expenses.expected + data.courses.expenses.expected)
          ).toFixed(2)
        )
      );
    });

    it('deletes enrollment and student and keeps projects.actual_enrolled in sync', async () => {
      const delEnroll = await request(app)
        .delete(`/api/course-enrollments/${enrollment2Id}`)
        .set('Authorization', `Bearer ${officeToken}`);
      expect(delEnroll.status).toBe(200);
      expect(delEnroll.body.data.actual_enrolled).toBe(1);

      const delStudent = await request(app)
        .delete(`/api/course-students/${studentValidId}`)
        .set('Authorization', `Bearer ${officeToken}`);
      expect(delStudent.status).toBe(200);

      const projAfter = await request(app)
        .get(`/api/projects/${smallCourseId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(projAfter.status).toBe(200);
      expect(Number(projAfter.body.data.actual_enrolled)).toBe(0);

      // Clean up remaining test students & course
      await request(app).delete(`/api/course-students/${studentExpiringId}`).set('Authorization', `Bearer ${adminToken}`);
      await request(app).delete(`/api/course-students/${studentExpiredId}`).set('Authorization', `Bearer ${adminToken}`);
      await request(app).delete(`/api/course-students/${studentNoCardId}`).set('Authorization', `Bearer ${adminToken}`);
      await request(app).delete(`/api/course-students/${studentValidNoDateId}`).set('Authorization', `Bearer ${adminToken}`);
      await request(app).delete(`/api/projects/${smallCourseId}`).set('Authorization', `Bearer ${adminToken}`);
    });
  });
});
