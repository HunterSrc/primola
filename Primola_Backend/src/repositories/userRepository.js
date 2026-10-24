const db = require('../config/database');
const bcrypt = require('bcryptjs');
const groupRepository = require('./groupRepository');

class UserRepository {
  /**
   * Cerca un utente tramite email comprensivo di gruppi associati
   * @param {string} email 
   * @returns {Promise<Object|null>}
   */
  async findByEmail(email) {
    const query = `
      SELECT u.id, u.email, u.password_hash, 
             COALESCE(u.first_name, u.nome) AS first_name,
             COALESCE(u.last_name, u.cognome) AS last_name,
             u.phone, u.role, u.created_at, u.updated_at
      FROM users u
      WHERE LOWER(u.email) = LOWER($1)
      LIMIT 1
    `;
    const result = await db.query(query, [email.trim()]);
    if (result.rows.length === 0) return null;

    const user = result.rows[0];
    user.nome = user.first_name || '';
    user.cognome = user.last_name || '';
    user.groups = await groupRepository.getUserGroups(user.id);
    if (user.groups.length === 0 && user.role) {
      user.groups = [user.role === 'STAFF' ? 'TEACHER' : user.role];
    }
    return user;
  }

  /**
   * Cerca un utente tramite ID comprensivo di gruppi
   * @param {string} id 
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    const query = `
      SELECT u.id, u.email,
             COALESCE(u.first_name, u.nome) AS first_name,
             COALESCE(u.last_name, u.cognome) AS last_name,
             u.phone, u.role, u.created_at, u.updated_at
      FROM users u
      WHERE u.id = $1
    `;
    const result = await db.query(query, [id]);
    if (result.rows.length === 0) return null;

    const user = result.rows[0];
    user.nome = user.first_name || '';
    user.cognome = user.last_name || '';
    user.groups = await groupRepository.getUserGroups(user.id);
    if (user.groups.length === 0 && user.role) {
      user.groups = [user.role === 'STAFF' ? 'TEACHER' : user.role];
    }
    return user;
  }

  /**
   * Lista tutti gli utenti con i loro gruppi
   * @returns {Promise<Array>}
   */
  async findAll() {
    const query = `
      SELECT u.id, u.email,
             COALESCE(u.first_name, u.nome) AS first_name,
             COALESCE(u.last_name, u.cognome) AS last_name,
             u.phone, u.role, u.created_at, u.updated_at
      FROM users u
      ORDER BY COALESCE(u.last_name, u.cognome) ASC, COALESCE(u.first_name, u.nome) ASC
    `;
    const result = await db.query(query);
    const users = [];
    for (const row of result.rows) {
      row.nome = row.first_name || '';
      row.cognome = row.last_name || '';
      row.groups = await groupRepository.getUserGroups(row.id);
      if (row.groups.length === 0 && row.role) {
        row.groups = [row.role === 'STAFF' ? 'TEACHER' : row.role];
      }
      users.push(row);
    }
    return users;
  }

  /**
   * Crea un nuovo utente con eventuale password e lista gruppi
   */
  async create({ email, password, password_hash, first_name, last_name, phone, nome, cognome, role = 'TEACHER', groups = [] }) {
    const fn = first_name || nome || '';
    const ln = last_name || cognome || '';
    const hash = password_hash || (password ? await bcrypt.hash(password, 10) : await bcrypt.hash('Primola2026!', 10));

    const client = await db.getClient ? await db.getClient() : null;
    const query = `
      INSERT INTO users (email, password_hash, first_name, last_name, phone, nome, cognome, role)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, email, first_name, last_name, phone, created_at, updated_at
    `;
    const params = [email.toLowerCase().trim(), hash, fn, ln, phone || null, fn, ln, role];

    try {
      if (client) await client.query('BEGIN');
      const executor = client || db;
      const result = await executor.query(query, params);
      const user = result.rows[0];
      user.nome = user.first_name;
      user.cognome = user.last_name;

      const assignedGroups = groups && groups.length > 0 ? groups : [role];
      user.groups = await groupRepository.setUserGroups(user.id, assignedGroups, client);

      if (client) await client.query('COMMIT');
      return user;
    } catch (err) {
      if (client) await client.query('ROLLBACK');
      throw err;
    } finally {
      if (client && client.release) client.release();
    }
  }

  /**
   * Aggiorna utente esistente
   */
  async update(id, { email, password, first_name, last_name, phone, groups }, canEditGroups = false) {
    const existing = await this.findById(id);
    if (!existing) return null;

    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      params.push(email.toLowerCase().trim());
    }
    if (first_name !== undefined) {
      updates.push(`first_name = $${paramIndex++}`);
      params.push(first_name);
      updates.push(`nome = $${paramIndex++}`);
      params.push(first_name);
    }
    if (last_name !== undefined) {
      updates.push(`last_name = $${paramIndex++}`);
      params.push(last_name);
      updates.push(`cognome = $${paramIndex++}`);
      params.push(last_name);
    }
    if (phone !== undefined) {
      updates.push(`phone = $${paramIndex++}`);
      params.push(phone);
    }
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      updates.push(`password_hash = $${paramIndex++}`);
      params.push(hash);
    }

    const client = await db.getClient ? await db.getClient() : null;
    try {
      if (client) await client.query('BEGIN');
      const executor = client || db;

      if (updates.length > 0) {
        params.push(id);
        const query = `
          UPDATE users 
          SET ${updates.join(', ')}, updated_at = NOW() 
          WHERE id = $${paramIndex}
          RETURNING id, email, first_name, last_name, phone, created_at, updated_at
        `;
        await executor.query(query, params);
      }

      if (canEditGroups && Array.isArray(groups)) {
        await groupRepository.setUserGroups(id, groups, client);
      }

      if (client) await client.query('COMMIT');
      return await this.findById(id);
    } catch (err) {
      if (client) await client.query('ROLLBACK');
      throw err;
    } finally {
      if (client && client.release) client.release();
    }
  }

  /**
   * Elimina un utente
   */
  async delete(id) {
    const result = await db.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    return result.rowCount > 0;
  }
}

module.exports = new UserRepository();
