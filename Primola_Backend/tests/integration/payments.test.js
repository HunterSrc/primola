const request = require('supertest');
process.env.USE_MEMORY_DB = 'true';
const db = require('../../src/config/database');
const app = require('../../src/app');
const jwt = require('jsonwebtoken');

describe('Payments & Student Monthly Tariffs API Tests', () => {
  let adminToken;
  let teacherToken;
  let studentId;
  let package1Id;
  let packageOneOffId;

  beforeAll(async () => {
    process.env.USE_MEMORY_DB = 'true';
    if (db._resetPool) db._resetPool();
    await db.testConnection();
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'testsecret123';

    adminToken = jwt.sign(
      { id: '11111111-1111-1111-1111-111111111111', role: 'ADMIN', email: 'admin@primola.it' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    teacherToken = jwt.sign(
      { id: '22222222-2222-2222-2222-222222222222', role: 'DOCENTE', email: 'teacher@primola.it' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Recupera studente o inseriscine uno
    const stuRes = await db.query('SELECT id FROM students LIMIT 1');
    if (stuRes.rows.length > 0) {
      studentId = stuRes.rows[0].id;
    } else {
      const inserted = await db.query(
        `INSERT INTO students (nome, cognome, data_nascita, luogo_nascita, residenza, scuola)
         VALUES ('Mario', 'Rossi', '2015-05-10', 'Milano', 'Via Roma 1', 'Scuola Elementare Manzoni')
         RETURNING id`
      );
      studentId = inserted.rows[0].id;
    }

    // Recupera pacchetto 1 giorno e una tantum
    const pkgsRes = await db.query('SELECT id, code FROM afterschool_packages');
    const p1 = pkgsRes.rows.find(p => p.code === '1_DAY_WEEK');
    const pOff = pkgsRes.rows.find(p => p.code === 'ONE_OFF');
    package1Id = p1 ? p1.id : '11111111-1111-1111-1111-111111111101';
    packageOneOffId = pOff ? pOff.id : '11111111-1111-1111-1111-111111111106';
  });

  it('rejects access to payments endpoints for non-admin/office users', async () => {
    const res = await request(app)
      .get('/api/payments/monthly?year=2026&month=10')
      .set('Authorization', `Bearer ${teacherToken}`);
    expect(res.status).toBe(403);
  });

  it('GET /api/payments/monthly returns billing structure', async () => {
    const res = await request(app)
      .get('/api/payments/monthly?year=2026&month=10')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.year).toBe(2026);
    expect(res.body.data.month).toBe(10);
    expect(res.body.data.totals).toBeDefined();
    expect(Array.isArray(res.body.data.students)).toBe(true);
  });

  it('POST /api/payments/assign-tariff assigns package to student', async () => {
    const res = await request(app)
      .post('/api/payments/assign-tariff')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        student_id: studentId,
        year: 2026,
        month: 10,
        package_id: package1Id,
        notes: 'Primo pacchetto mensile'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.package_id).toBe(package1Id);
    expect(Number(res.body.data.covered_days)).toBe(4);
    expect(Number(res.body.data.amount_paid)).toBe(48);

    // Assegna anche un secondo pacchetto per lo stesso studente nello stesso mese
    const res2 = await request(app)
      .post('/api/payments/assign-tariff')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        student_id: studentId,
        year: 2026,
        month: 10,
        package_id: packageOneOffId,
        notes: 'Integrazione una tantum'
      });

    expect(res2.status).toBe(201);
    expect(res2.body.success).toBe(true);
    expect(Number(res2.body.data.covered_days)).toBe(1);

    // Verifica nel riepilogo che i pacchetti siano 2 e giorni coperti siano 5 (4 + 1)
    const billingRes = await request(app)
      .get('/api/payments/monthly?year=2026&month=10')
      .set('Authorization', `Bearer ${adminToken}`);

    const stuBilling = billingRes.body.data.students.find(s => s.student_id === studentId);
    expect(stuBilling).toBeDefined();
    expect(stuBilling.assigned_packages.length).toBe(2);
    expect(stuBilling.total_covered_days).toBe(5);
    expect(stuBilling.total_paid_packages).toBe(63); // 48 + 15
  });

  it('calculates extra days when attendances exceed covered days', async () => {
    // Inserisci 7 presenze per questo studente nel mese di ottobre 2026 (copertura = 5)
    for (let day = 1; day <= 7; day++) {
      const dStr = `2026-10-${String(day).padStart(2, '0')}`;
      await db.query(
        `INSERT INTO attendances (student_id, date, is_present, canteen_used)
         VALUES ($1, $2, true, true)
         ON CONFLICT (student_id, date) DO UPDATE SET is_present = true, canteen_used = true`,
        [studentId, dStr]
      );
    }

    const billingRes = await request(app)
      .get('/api/payments/monthly?year=2026&month=10')
      .set('Authorization', `Bearer ${adminToken}`);

    const stuBilling = billingRes.body.data.students.find(s => s.student_id === studentId);
    expect(stuBilling.days_present).toBe(7);
    expect(stuBilling.total_covered_days).toBe(5);
    expect(stuBilling.extra_days_count).toBe(2); // 7 - 5 = 2 giorni extra
    expect(stuBilling.extra_days_total).toBe(30); // 2 * 15€ = 30€
    expect(stuBilling.meals_count).toBe(7);
    expect(stuBilling.meals_total).toBe(38.5); // 7 * 5.50€ = 38.5€
  });

  it('POST /api/payments/settle settles extras and meals', async () => {
    const res = await request(app)
      .post('/api/payments/settle')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        student_id: studentId,
        year: 2026,
        month: 10,
        settle_extra: true,
        settle_meals: true,
        notes: 'Saldato tramite bonifico'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.extra_paid).toBe(true);
    expect(res.body.data.meals_paid).toBe(true);

    // Verifica nel prospetto
    const billingRes = await request(app)
      .get('/api/payments/monthly?year=2026&month=10')
      .set('Authorization', `Bearer ${adminToken}`);

    const stuBilling = billingRes.body.data.students.find(s => s.student_id === studentId);
    expect(stuBilling.extra_paid).toBe(true);
    expect(stuBilling.meals_paid).toBe(true);
  });
});
