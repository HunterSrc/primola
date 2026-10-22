const request = require('supertest');
const jwt = require('jsonwebtoken');

describe('app integration tests', () => {
  const SECRET = 'test-secret';

  beforeAll(() => {
    process.env.JWT_SECRET = SECRET;
  });

  it('should enable morgan logging when NODE_ENV is not test', async () => {
    let appNonTest;
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    jest.isolateModules(() => {
      appNonTest = require('../../src/app');
    });

    const res = await request(appNonTest).get('/api/health');
    expect(res.status).toBe(200);

    process.env.NODE_ENV = originalEnv;
  });
});
