const db = require('../config/database');

class UserRepository {
  /**
   * Cerca un utente tramite email
   * @param {string} email 
   * @returns {Promise<Object|null>}
   */
  async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1';
    const result = await db.query(query, [email.trim()]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Cerca un utente tramite ID
   * @param {string} id 
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    const query = 'SELECT id, email, nome, cognome, role, created_at FROM users WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Crea un nuovo utente
   * @param {Object} userData 
   * @returns {Promise<Object>}
   */
  async create({ email, password_hash, nome, cognome, role = 'STAFF' }) {
    const query = `
      INSERT INTO users (email, password_hash, nome, cognome, role)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, email, nome, cognome, role, created_at
    `;
    const result = await db.query(query, [email.toLowerCase().trim(), password_hash, nome, cognome, role]);
    return result.rows[0];
  }
}

module.exports = new UserRepository();
