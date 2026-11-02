const db = require('../config/database');

class SettingsRepository {
  /**
   * Recupera tutte le impostazioni come array di oggetti { key, value, description, updated_at }
   */
  async getAll() {
    const query = `
      SELECT key, value, description, updated_at
      FROM system_settings
      ORDER BY key ASC
    `;
    const result = await db.query(query);
    return result.rows;
  }

  /**
   * Recupera una mappa chiave-valore di tutte le impostazioni
   */
  async getSettingsMap() {
    const rows = await this.getAll();
    const map = {
      doposcuola_daily_fee: 12.00,
      meal_fee_student: 5.50
    };
    for (const row of rows) {
      const numVal = Number(row.value);
      map[row.key] = isNaN(numVal) ? row.value : numVal;
    }
    return map;
  }

  /**
   * Aggiorna una o più impostazioni
   */
  async updateSettings(settingsObj) {
    const client = await db.getPool().connect();
    try {
      await client.query('BEGIN');
      const upsertQuery = `
        INSERT INTO system_settings (key, value, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (key)
        DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
        RETURNING key, value, description, updated_at;
      `;
      const updated = [];
      for (const [key, val] of Object.entries(settingsObj)) {
        if (val !== undefined && val !== null) {
          const res = await client.query(upsertQuery, [key, String(val)]);
          updated.push(res.rows[0]);
        }
      }
      await client.query('COMMIT');
      return updated;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = new SettingsRepository();
