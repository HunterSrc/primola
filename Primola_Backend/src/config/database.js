const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

pool.on('error', (err, client) => {
  console.error('❌ Errore inaspettato sul client in idle:', err);
  process.exit(-1);
});

// Funzione helper per testare la connessione all'avvio
const testConnection = async () => {
  try {
    const client = await pool.connect();
    const res = await client.query('SELECT current_database() as db_name');
    console.log(`✅ Connesso al database PostgreSQL: ${res.rows[0].db_name}`);
    client.release();
  } catch (err) {
    console.error('❌ Errore di connessione al database PostgreSQL:', err.message);
  }
};

module.exports = {
  query: (text, params) => pool.query(text, params),
  getPool: () => pool,
  testConnection
};
