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

  describe('POST /api/auth/register & Workflow Approvazione Admin', () => {
    const testDocente = {
      email: 'nuovo.docente@primola.it',
      password: 'DocentePassword2026!',
      first_name: 'Paolo',
      last_name: 'Verdi',
      phone: '+39 340 1234567'
    };

    let adminToken;
    let registeredUserId;

    beforeAll(async () => {
      const adminLogin = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@primola.it',
          password: 'AdminPrimola2026!'
        });
      adminToken = adminLogin.body.data.accessToken;
    });

    it('dovrebbe registrare con successo un nuovo utente con stato PENDING e ruolo TEACHER', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testDocente);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('PENDING');
      expect(res.body.data.userId).toBeDefined();
      registeredUserId = res.body.data.userId;
    });

    it('dovrebbe rifiutare registrazione con email duplicata', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testDocente);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('già registrato');
    });

    it('dovrebbe validare campi obbligatori per la registrazione', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'mancante@primola.it' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('dovrebbe bloccare il login con 403 se l\'utente è in stato PENDING', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testDocente.email,
          password: testDocente.password
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('attesa di approvazione');
    });

    it('amministratore dovrebbe poter approvare l\'utente via PATCH /api/users/:id/status', async () => {
      const res = await request(app)
        .patch(`/api/users/${registeredUserId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'APPROVED' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('APPROVED');
      expect(res.body.data.groups).toContain('TEACHER');
    });

    it('dovrebbe consentire il login dopo che l\'amministratore ha approvato l\'account', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testDocente.email,
          password: testDocente.password
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('TEACHER');
      expect(res.body.data.user.groups).toContain('TEACHER');
    });

    it('dovrebbe bloccare con 403 se l\'amministratore imposta lo stato su REJECTED', async () => {
      const statusRes = await request(app)
        .patch(`/api/users/${registeredUserId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'REJECTED' });

      expect(statusRes.status).toBe(200);
      expect(statusRes.body.data.status).toBe('REJECTED');

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: testDocente.email,
          password: testDocente.password
        });

      expect(loginRes.status).toBe(403);
      expect(loginRes.body.error).toContain('disabilitato o respinto');
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
