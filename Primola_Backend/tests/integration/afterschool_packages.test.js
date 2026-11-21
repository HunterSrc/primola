const request = require('supertest');
process.env.USE_MEMORY_DB = 'true';
const db = require('../../src/config/database');
const app = require('../../src/app');
const jwt = require('jsonwebtoken');

describe('Afterschool Packages and Tariffs API Tests', () => {
  let adminToken;
  let teacherToken;

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
  });

  it('rejects access for non-admin users', async () => {
    const res = await request(app)
      .get('/api/afterschool-packages')
      .set('Authorization', `Bearer ${teacherToken}`);
    expect(res.status).toBe(403);
  });

  it('GET /api/afterschool-packages returns seeded packages with active tariffs', async () => {
    const res = await request(app)
      .get('/api/afterschool-packages')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(6);

    const oneDay = res.body.data.find(p => p.code === '1_DAY_WEEK');
    expect(oneDay).toBeDefined();
    expect(oneDay.monthly_days).toBe(4);
    expect(Number(oneDay.current_price)).toBe(48);
    expect(oneDay.current_valid_to).toContain('9999');
  });

  it('POST /api/afterschool-packages creates a new package with tariff', async () => {
    const code = `EXTRA_${Date.now()}`;
    const payload = {
      name: 'Pacchetto Sabato Extra',
      code,
      monthly_days: 2,
      days_per_week: 1,
      price: 35.00,
      valid_from: '2026-11-01',
      valid_to: '9999-01-01',
      notes: 'Solo sabato mattina'
    };

    const res = await request(app)
      .post('/api/afterschool-packages')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Pacchetto Sabato Extra');
    expect(Number(res.body.data.current_price)).toBe(35);
    expect(res.body.data.current_valid_to).toContain('9999');
  });

  it('PUT /api/afterschool-packages/:id updates package properties', async () => {
    const listRes = await request(app)
      .get('/api/afterschool-packages')
      .set('Authorization', `Bearer ${adminToken}`);
    const pkg = listRes.body.data[0];

    const res = await request(app)
      .put(`/api/afterschool-packages/${pkg.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ monthly_days: 5, name: `${pkg.name} Updated` });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.monthly_days).toBe(5);
  });

  it('POST /api/afterschool-packages/:id/transition-tariff executes tariff change correctly', async () => {
    const listRes = await request(app)
      .get('/api/afterschool-packages')
      .set('Authorization', `Bearer ${adminToken}`);
    const pkg = listRes.body.data.find(p => p.code === '2_DAYS_WEEK');

    const transitionPayload = {
      oldTariffId: pkg.current_tariff_id,
      oldTariffValidTo: '2026-10-31',
      newPrice: 99.00,
      newTariffValidFrom: '2026-11-01',
      newTariffValidTo: '9999-01-01',
      notes: 'Aumento anno 2026-2027'
    };

    const res = await request(app)
      .post(`/api/afterschool-packages/${pkg.id}/transition-tariff`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(transitionPayload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.oldTariff.valid_to).toContain('2026-10-31');
    expect(Number(res.body.data.newTariff.price)).toBe(99);
    expect(res.body.data.newTariff.valid_to).toContain('9999-01-01');

    // Verifica storico tariffe
    const historyRes = await request(app)
      .get(`/api/afterschool-packages/${pkg.id}/tariffs`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(historyRes.status).toBe(200);
    expect(historyRes.body.data.length).toBeGreaterThanOrEqual(2);
  });

  it('POST /api/afterschool-packages/:id/transition-tariff rejects invalid date sequence', async () => {
    const listRes = await request(app)
      .get('/api/afterschool-packages')
      .set('Authorization', `Bearer ${adminToken}`);
    const pkg = listRes.body.data[0];

    const res = await request(app)
      .post(`/api/afterschool-packages/${pkg.id}/transition-tariff`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        oldTariffId: pkg.current_tariff_id,
        oldTariffValidTo: '2026-11-05',
        newPrice: 120.00,
        newTariffValidFrom: '2026-11-01' // Inizio prima della fine vecchia!
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('GET / POST / PUT /api/afterschool-packages/meal-tariffs manages meal tariff history and mid-month billing', async () => {
    const initialRes = await request(app)
      .get('/api/afterschool-packages/meal-tariffs')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(initialRes.status).toBe(200);
    expect(initialRes.body.data.active).toBeTruthy();
    expect(initialRes.body.data.history.length).toBeGreaterThanOrEqual(1);

    const activeTariff = initialRes.body.data.active;

    // Transizione inframensile a metà novembre 2026: fino al 2026-11-10 -> 5.50, dal 2026-11-11 -> 6.50
    const transRes = await request(app)
      .post('/api/afterschool-packages/meal-tariffs/transition')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        old_tariff_id: activeTariff.id,
        old_valid_to: '2026-11-10',
        new_price: 6.50,
        new_valid_from: '2026-11-11',
        notes: 'Adeguamento mensa metà novembre'
      });

    expect(transRes.status).toBe(200);
    expect(transRes.body.data.oldTariff.valid_to).toBe('2026-11-10');
    expect(Number(transRes.body.data.newTariff.price)).toBe(6.50);
    expect(transRes.body.data.newTariff.valid_from).toBe('2026-11-11');

    // Modifica note su tariffa storica
    const updRes = await request(app)
      .put(`/api/afterschool-packages/meal-tariffs/${transRes.body.data.newTariff.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ notes: 'Adeguamento confermato' });
    expect(updRes.status).toBe(200);
    expect(updRes.body.data.notes).toBe('Adeguamento confermato');

    // Verifica calcolo pagamenti su novembre 2026:
    // Nel seed ci sono pasti il 2026-11-02 (5.50) e il 2026-11-03 (5.50) e il 2026-11-12 (6.50) o simili
    const billingRes = await request(app)
      .get('/api/payments/monthly?year=2026&month=11')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(billingRes.status).toBe(200);
    expect(billingRes.body.data.unit_rates.meal_fee_student).toBe(6.50);

    // Ripristina stato originale per non impattare altri test se eseguiti in parallelo
    await request(app)
      .put(`/api/afterschool-packages/meal-tariffs/${transRes.body.data.newTariff.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ price: 5.50 });
  });
});
