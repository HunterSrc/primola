const { Pool, types } = require('pg');
const { createMemoryPostgres } = require('./memoryDb');

// Mantieni i campi DATE PostgreSQL (OID 1082) come stringhe 'YYYY-MM-DD' evitando lo shift UTC
if (types && typeof types.setTypeParser === 'function') {
  types.setTypeParser(1082, (val) => val);
}

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

const ensureCourseTables = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS course_students (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      nome VARCHAR(100) NOT NULL,
      cognome VARCHAR(100) NOT NULL,
      email VARCHAR(150),
      telefono VARCHAR(50),
      data_nascita DATE,
      luogo_nascita VARCHAR(150),
      indirizzo_residenza VARCHAR(255),
      citta_residenza VARCHAR(120),
      possiede_tessera BOOLEAN NOT NULL DEFAULT FALSE,
      data_scadenza_tessera DATE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS course_enrollments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      course_student_id UUID NOT NULL REFERENCES course_students(id) ON DELETE CASCADE,
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
      installments_count SMALLINT NOT NULL DEFAULT 1,
      enrolled_at DATE NOT NULL DEFAULT CURRENT_DATE,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(course_student_id, project_id)
    );

    CREATE TABLE IF NOT EXISTS course_installments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      enrollment_id UUID NOT NULL REFERENCES course_enrollments(id) ON DELETE CASCADE,
      installment_number SMALLINT NOT NULL,
      amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
      status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
      paid_at DATE,
      payment_method VARCHAR(50),
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(enrollment_id, installment_number)
    );
  `);
};

const testConnection = async () => {
  try {
    const pool = getPoolInstance();
    const client = await pool.connect();
    const res = await client.query('SELECT current_database() as db_name');
    console.log(`✅ Connesso al database PostgreSQL: ${res.rows[0].db_name}`);
    await ensureCourseTables(client);
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
  ensureCourseTables,
  _resetPool: () => { activePool = null; }
};
