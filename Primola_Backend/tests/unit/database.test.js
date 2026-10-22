let mockPool;
let mockClient;

jest.mock('pg', () => {
  mockClient = {
    query: jest.fn(),
    release: jest.fn()
  };
  mockPool = {
    query: jest.fn(),
    connect: jest.fn(),
    on: jest.fn()
  };
  return {
    Pool: jest.fn(() => mockPool)
  };
});

describe('database config unit tests', () => {
  let db;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.DATABASE_URL = 'postgresql://localhost:5432/primola';
    process.env.USE_MEMORY_DB = 'false';

    db = require('../../src/config/database');
    db._resetPool();

    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
    console.error.mockRestore();
    console.warn.mockRestore();
  });

  it('should delegate query calls to pool.query', async () => {
    mockPool.query.mockResolvedValue({ rows: [1, 2] });

    const res = await db.query('SELECT 1', []);
    expect(res).toEqual({ rows: [1, 2] });
    expect(mockPool.query).toHaveBeenCalledWith('SELECT 1', []);
  });

  it('should return the underlying pool instance via getPool', () => {
    expect(db.getPool()).toBe(mockPool);
  });

  it('should test connection successfully and release client', async () => {
    mockPool.connect.mockResolvedValue(mockClient);
    mockClient.query.mockResolvedValue({ rows: [{ db_name: 'primola_test' }] });

    await db.testConnection();

    expect(mockPool.connect).toHaveBeenCalled();
    expect(mockClient.query).toHaveBeenCalledWith('SELECT current_database() as db_name');
    expect(mockClient.release).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith('✅ Connesso al database PostgreSQL: primola_test');
  });

  it('should fallback to memory postgres when testConnection fails on external db', async () => {
    mockPool.connect.mockRejectedValue(new Error('Connection timeout'));

    await db.testConnection();

    expect(console.warn).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('PostgreSQL Memory Database pronto'));
  });

  it('should trigger process.exit when pool emits idle error', () => {
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});

    db.getPool(); // istanzia pool
    const errorCall = mockPool.on.mock.calls.find(call => call[0] === 'error');
    expect(errorCall).toBeDefined();

    const errorHandler = errorCall[1];
    errorHandler(new Error('Idle client crash'), {});

    expect(console.error).toHaveBeenCalledWith('❌ Errore inaspettato sul client in idle:', expect.any(Error));
    expect(exitSpy).toHaveBeenCalledWith(-1);
    exitSpy.mockRestore();
  });
});
