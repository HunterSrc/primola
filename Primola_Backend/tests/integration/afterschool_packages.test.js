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
});
