const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/config/database');

describe('Auth API Integration Tests', () => {
  beforeAll(async () => {
    process.env.USE_MEMORY_DB = 'true';
    await db.testConnection();
  });

  describe('POST /api/auth/login', () => {
    it('dovrebbe autenticare con successo con credenziali valide', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@primola.it',
          password: 'AdminPrimola2026!'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
      expect(res.body.data.user.email).toBe('admin@primola.it');
      expect(res.body.data.user.role).toBe('ADMIN');
    });

    it('dovrebbe fallire con password errata', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@primola.it',
          password: 'PasswordSbagliata'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Credenziali non valide');
    });

    it('dovrebbe fallire con email inesistente', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'non-esiste@primola.it',
          password: 'AdminPrimola2026!'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('dovrebbe validare i campi obbligatori', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/refresh', () => {
    let validRefreshToken;

    beforeEach(async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@primola.it',
          password: 'AdminPrimola2026!'
        });
      validRefreshToken = loginRes.body.data.refreshToken;
    });

    it('dovrebbe rinnovare il token con refresh token valido', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: validRefreshToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
      expect(res.body.data.user.email).toBe('admin@primola.it');
    });

    it('dovrebbe rifiutare refresh token non valido', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'token_farlocco' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('dovrebbe rifiutare refresh token assente', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/me', () => {
    let accessToken;

    beforeEach(async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@primola.it',
          password: 'AdminPrimola2026!'
        });
      accessToken = loginRes.body.data.accessToken;
    });

    it('dovrebbe restituire le informazioni utente con JWT valido', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('admin@primola.it');
    });

    it('dovrebbe rifiutare senza token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });
  });
});
