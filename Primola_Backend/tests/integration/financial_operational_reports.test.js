const request = require('supertest');
process.env.USE_MEMORY_DB = 'true';
const db = require('../../src/config/database');
const app = require('../../src/app');
const jwt = require('jsonwebtoken');

describe('Financial & Operational Reports API Tests', () => {
  const secret = process.env.JWT_SECRET || 'primola_access_secret_fallback';

  beforeAll(async () => {
    process.env.USE_MEMORY_DB = 'true';
    await db.testConnection();
  });

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
      expect(data.rates).toBeDefined();
      expect(data.rates.one_off_fee).toBeDefined();
      expect(data.rates.doposcuola_daily_fee).toBe(data.rates.one_off_fee);
      expect(data.rates.meal_fee_student).toBeDefined();
      expect(data.rates.meal_cost_provider).toBeUndefined();
      expect(data.doposcuola).toBeDefined();
      expect(data.doposcuola.revenues).toBeDefined();
      expect(typeof data.doposcuola.revenues.expected).toBe('number');
      expect(typeof data.doposcuola.revenues.actual).toBe('number');
      expect(typeof data.doposcuola.revenues.pending).toBe('number');
      expect(typeof data.doposcuola.revenues.expected_days).toBe('number');
      expect(typeof data.doposcuola.revenues.actual_days).toBe('number');
      expect(data.doposcuola.revenues.expected_meals).toBe(data.doposcuola.revenues.actual_meals);
      expect(data.doposcuola.expenses).toBeDefined();
      expect(data.doposcuola.total_meals).toBeDefined();
      expect(Array.isArray(data.doposcuola.teachers)).toBe(true);
      expect(data.courses).toBeDefined();
      expect(data.courses.revenues).toBeDefined();
      expect(data.courses.expenses).toBeDefined();
      expect(Array.isArray(data.courses.teachers)).toBe(true);
      expect(data.summary).toBeDefined();
    });

    it('calculates package-based expected/actual/pending revenues and excludes holidays & closures in 2026-11 and 2026-12', async () => {
      const novRes = await request(app)
        .get('/api/reports/financial-monthly?year=2026&month=11')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(novRes.status).toBe(200);
      const novData = novRes.body.data;
      // Nel seed di novembre (D11): Mario (200) + Luigi (130) + Sofia (90) + Emma (170) + Leonardo (200) assegnati = 790
      // Pasti: 4 * 6.00 = 24.00 (Mario 2 saldati = 12.00; Sofia 1 + Emma 1 da incassare = 12.00)
      expect(novData.doposcuola.revenues.expected).toBe(814);
      expect(novData.doposcuola.revenues.actual).toBe(802);
      expect(novData.doposcuola.revenues.pending).toBe(12);
      expect(novData.doposcuola.revenues.actual_days).toBe(5);
      expect(novData.doposcuola.revenues.expected_meals).toBe(4);
      expect(novData.doposcuola.revenues.actual_meals).toBe(4);

      // Dicembre 2026: covered_days da student_monthly_tariffs = Mario(20) + Luigi(12) + Sofia(8) + Emma(16) + Leonardo(20) = 76
      const decRes = await request(app)
        .get('/api/reports/financial-monthly?year=2026&month=12')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(decRes.status).toBe(200);
      expect(decRes.body.data.doposcuola.revenues.expected_days).toBe(76);
    });

    it('Daily & Monthly Reports exclude holidays/closures and read covered_days from student_monthly_tariffs (D2, D5)', async () => {
      const dailyNormal = await request(app)
        .get('/api/reports/attendances?date=2026-11-16')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(dailyNormal.status).toBe(200);
      // 2026-11-16 ha 3 righe in attendances (Mario, Luigi, Emma)
      expect(dailyNormal.body.data.statistics.totalExpected).toBe(3);

      const dailyHoliday = await request(app)
        .get('/api/reports/attendances?date=2026-12-25')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(dailyHoliday.status).toBe(200);
      expect(dailyHoliday.body.data.statistics.totalExpected).toBe(0);

      const dailyClosure = await request(app)
        .get('/api/reports/attendances?date=2026-12-07')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(dailyClosure.status).toBe(200);
      expect(dailyClosure.body.data.statistics.totalExpected).toBe(0);

      const monthlyRes = await request(app)
        .get('/api/reports/monthly?year=2026&month=11')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(monthlyRes.status).toBe(200);
      const mario = monthlyRes.body.data.studentsSummary.find(s => s.student_id === '33333333-3333-3333-3333-333333333333');
      expect(mario).toBeDefined();
      expect(mario.presenze_pagate).toBe(20);
      expect(mario.covered_days).toBe(20);
      expect(mario.eccedenza).toBe(0);
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

  describe('Afterschool Expenses API (/api/afterschool/expenses)', () => {
    let createdExpenseId = null;

    it('TEACHER is forbidden from creating or reading afterschool expenses', async () => {
      const getRes = await request(app)
        .get('/api/afterschool/expenses?year=2026&month=10')
        .set('Authorization', `Bearer ${teacherToken}`);
      expect(getRes.status).toBe(403);

      const postRes = await request(app)
        .post('/api/afterschool/expenses')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          expense_date: '2026-10-15',
          category: 'MENSA',
          amount: 120.50,
          description: 'Fattura mensa'
        });
      expect(postRes.status).toBe(403);
    });

    it('ADMIN and OFFICE can create, list, update, and delete afterschool expenses (MENSA & ALTRO)', async () => {
      // 1. Create MENSA expense
      const createRes = await request(app)
        .post('/api/afterschool/expenses')
        .set('Authorization', `Bearer ${officeToken}`)
        .send({
          expense_date: '2026-10-14',
          category: 'MENSA',
          amount: 240.00,
          description: 'Fattura catering ottobre'
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.success).toBe(true);
      expect(createRes.body.data.category).toBe('MENSA');
      expect(createRes.body.data.amount).toBe(240);
      expect(createRes.body.data.expense_date).toBe('2026-10-14');
      createdExpenseId = createRes.body.data.id;

      // 2. List expenses for 2026-10
      const listRes = await request(app)
        .get('/api/afterschool/expenses?year=2026&month=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.summary.total_mensa).toBeGreaterThanOrEqual(240);
      expect(listRes.body.data.expenses.some(e => e.id === createdExpenseId)).toBe(true);

      // 3. Update expense to ALTRO and change amount
      const updateRes = await request(app)
        .put(`/api/afterschool/expenses/${createdExpenseId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          category: 'ALTRO',
          amount: 85.50,
          description: 'Materiale didattico doposcuola'
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.category).toBe('ALTRO');
      expect(updateRes.body.data.amount).toBe(85.5);

      // 4. Verify operational-monthly report includes afterschool_expenses
      const opRes = await request(app)
        .get('/api/reports/operational-monthly?year=2026&month=10')
        .set('Authorization', `Bearer ${officeToken}`);

      expect(opRes.status).toBe(200);
      expect(opRes.body.data.afterschool_expenses).toBeDefined();
      expect(opRes.body.data.afterschool_expenses.summary.total_altro).toBeGreaterThanOrEqual(85.5);

      // 4b. Verify financial-monthly report uses total expenses and no meal_cost_provider
      const finRes = await request(app)
        .get('/api/reports/financial-monthly?year=2026&month=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(finRes.status).toBe(200);
      expect(finRes.body.data.rates.meal_cost_provider).toBeUndefined();
      expect(finRes.body.data.doposcuola.expenses.actual_other_expenses).toBeGreaterThanOrEqual(85.5);

      // 5. Delete expense
      const delRes = await request(app)
        .delete(`/api/afterschool/expenses/${createdExpenseId}`)
        .set('Authorization', `Bearer ${officeToken}`);

      expect(delRes.status).toBe(200);
      expect(delRes.body.success).toBe(true);
    });
  });
});
