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

    // Usa Luigi Bianchi (44444444-4444-4444-4444-444444444444) che non ha pacchetti seed in 2026-10
    const stuRes = await db.query(
      `SELECT id FROM students WHERE id = '44444444-4444-4444-4444-444444444444'`
    );
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

  it('PUT /api/payments/tariffs/:assignmentId updates scheduled_weekdays, start_date and notes', async () => {
    const assignRes = await request(app)
      .post('/api/payments/assign-tariff')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        student_id: studentId,
        year: 2026,
        month: 9,
        package_id: package1Id,
        scheduled_weekdays: [1],
        start_date: '2026-09-01',
        notes: 'Pianificazione iniziale'
      });

    expect(assignRes.status).toBe(201);
    expect(assignRes.body.data.scheduled_weekdays).toEqual([1]);
    expect(assignRes.body.data.start_date).toBe('2026-09-01');
    const assignmentId = assignRes.body.data.id;

    const updateRes = await request(app)
      .put(`/api/payments/tariffs/${assignmentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        scheduled_weekdays: [4, 2, 2],
        start_date: '2026-09-07',
        notes: 'Spostato a martedì e giovedì'
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.success).toBe(true);
    expect(updateRes.body.data.scheduled_weekdays).toEqual([2, 4]);
    expect(updateRes.body.data.start_date).toBe('2026-09-07');
    expect(updateRes.body.data.notes).toBe('Spostato a martedì e giovedì');
  });

  it('GET /api/payments/monthly exposes closures and previous_month_pending for unpaid previous month meals/extras', async () => {
    // In memoryDb seed for 2026-11: Sofia (55555555-...) has 1 meal not settled, Mario (33333333-...) has 2 meals settled
    const decBillingRes = await request(app)
      .get('/api/payments/monthly?year=2026&month=12')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(decBillingRes.status).toBe(200);
    expect(Array.isArray(decBillingRes.body.data.closures)).toBe(true);
    expect(decBillingRes.body.data.closures.some(c => c.date === '2026-12-07')).toBe(true);

    const sofia = decBillingRes.body.data.students.find(
      s => s.student_id === '55555555-5555-5555-5555-555555555555'
    );
    expect(sofia).toBeDefined();
    expect(sofia.previous_month_pending).toBeDefined();
    expect(sofia.previous_month_pending.year).toBe(2026);
    expect(sofia.previous_month_pending.month).toBe(11);
    expect(sofia.previous_month_pending.meals_count).toBe(1);
    expect(sofia.previous_month_pending.meals_paid).toBe(false);
    expect(sofia.previous_month_pending.has_pending).toBe(true);
    expect(sofia.previous_month_pending.total_pending).toBeGreaterThan(0);

    const mario = decBillingRes.body.data.students.find(
      s => s.student_id === '33333333-3333-3333-3333-333333333333'
    );
    expect(mario).toBeDefined();
    expect(mario.previous_month_pending.meals_paid).toBe(true);
    expect(mario.previous_month_pending.has_pending).toBe(false);
    expect(mario.previous_month_pending.total_pending).toBe(0);
  });

  it('schedules student in calendar and attendances only from start_date on scheduled_weekdays, skipping holidays (Dec 2026 Tuesday scenario - D11)', async () => {
    // Creiamo uno studente dedicato per testare il caso utente del 2 Dicembre 2026 (Mercoledì)
    // Pacchetto 1_DAY_WEEK (4 ingressi coperti), scelto Martedì ([2]), start_date = 2026-12-02
    const newStuRes = await db.query(
      `INSERT INTO students (nome, cognome, data_nascita, luogo_nascita, residenza, scuola, giorni_abbonamento)
       VALUES ('Chiara', 'Galli', '2016-08-14', 'Bologna', 'Via Zamboni 12', 'Scuola Rodari', '{}')
       RETURNING id`
    );
    const chiaraId = newStuRes.rows[0].id;

    const assignRes = await request(app)
      .post('/api/payments/assign-tariff')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        student_id: chiaraId,
        year: 2026,
        month: 12,
        package_id: package1Id,
        scheduled_weekdays: [2], // Martedì
        start_date: '2026-12-02', // Pagato mercoledì 2 dicembre
        notes: 'Abbonamento 1 giorno/settimana (Martedì) pagato il 02/12'
      });

    expect(assignRes.status).toBe(201);
    expect(assignRes.body.data.covered_days).toBe(4);
    expect(assignRes.body.data.scheduled_weekdays).toEqual([2]);
    expect(assignRes.body.data.start_date).toBe('2026-12-02');

    // 1. Martedì 2026-12-01 (precedente a start_date 2026-12-02) -> NON attesa
    const expDec01 = await request(app)
      .get('/api/attendances/expected?date=2026-12-01')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(expDec01.status).toBe(200);
    expect(expDec01.body.data.map(s => s.student_id)).not.toContain(chiaraId);

    // 2. Martedì 2026-12-08 (Immacolata Concezione - festivo nazionale) -> NON attesa
    const expDec08 = await request(app)
      .get('/api/attendances/expected?date=2026-12-08')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(expDec08.status).toBe(200);
    expect(expDec08.body.data.map(s => s.student_id)).not.toContain(chiaraId);

    // 3. Martedì 2026-12-15, 2026-12-22, 2026-12-29 -> ATTESA sia in /api/attendances/expected sia in /api/afterschool/week-summary
    for (const tuesdayDate of ['2026-12-15', '2026-12-22', '2026-12-29']) {
      const expRes = await request(app)
        .get(`/api/attendances/expected?date=${tuesdayDate}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(expRes.status).toBe(200);
      expect(expRes.body.data.map(s => s.student_id)).toContain(chiaraId);
    }

    // Verifica anche nel calendario settimanale /api/afterschool/week-summary
    const week1Res = await request(app)
      .get('/api/afterschool/week-summary?startDate=2026-11-30')
      .set('Authorization', `Bearer ${adminToken}`);
    const dayDec01 = week1Res.body.data.days.find(d => d.date === '2026-12-01');
    expect(dayDec01.students.map(s => s.student_id)).not.toContain(chiaraId);

    const week2Res = await request(app)
      .get('/api/afterschool/week-summary?startDate=2026-12-07')
      .set('Authorization', `Bearer ${adminToken}`);
    const dayDec08 = week2Res.body.data.days.find(d => d.date === '2026-12-08');
    expect(dayDec08.holiday).toEqual({ name: 'Immacolata Concezione', isHoliday: true });
    expect(dayDec08.students.map(s => s.student_id)).not.toContain(chiaraId);

    const week3Res = await request(app)
      .get('/api/afterschool/week-summary?startDate=2026-12-14')
      .set('Authorization', `Bearer ${adminToken}`);
    const dayDec15 = week3Res.body.data.days.find(d => d.date === '2026-12-15');
    expect(dayDec15.students.map(s => s.student_id)).toContain(chiaraId);

    // Pulizia dello studente creato nel test
    await db.query('DELETE FROM student_monthly_tariffs WHERE student_id = $1', [chiaraId]);
    await db.query('DELETE FROM students WHERE id = $1', [chiaraId]);
  });
});
