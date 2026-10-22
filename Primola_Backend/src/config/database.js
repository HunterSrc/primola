const { Pool } = require('pg');
const { createMemoryPostgres } = require('./memoryDb');

let activePool = null;

function getPoolInstance() {
  if (activePool) return activePool;

  if (process.env.USE_MEMORY_DB === 'true' || !process.env.DATABASE_URL) {
    activePool = createMemoryPostgres();
    return activePool;
  }

  activePool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  activePool.on('error', (err, client) => {
    console.error('❌ Errore inaspettato sul client in idle:', err);
    process.exit(-1);
  });

  return activePool;
}

const testConnection = async () => {
  try {
    const pool = getPoolInstance();
    const client = await pool.connect();
    const res = await client.query('SELECT current_database() as db_name');
    console.log(`✅ Connesso al database PostgreSQL: ${res.rows[0].db_name}`);
    client.release();
  } catch (err) {
    console.warn(`⚠️ Impossibile connettersi al PostgreSQL esterno (${err.message}). Attivazione automatica di PostgreSQL Engine in-memory...`);
    activePool = createMemoryPostgres();
    const client = await activePool.connect();
    const res = await client.query('SELECT current_database() as db_name');
    console.log(`✅ PostgreSQL Memory Database pronto: ${res.rows[0].db_name}`);
    client.release();
  }
};

module.exports = {
  query: (text, params) => getPoolInstance().query(text, params),
  getPool: () => getPoolInstance(),
  testConnection,
  _resetPool: () => { activePool = null; }
};
