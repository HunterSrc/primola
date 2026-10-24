const db = require('../config/database');

class GroupRepository {
  /**
   * Restituisce tutti i gruppi configurati a sistema
   */
  async findAll() {
    const query = 'SELECT id, name, description FROM groups ORDER BY name ASC';
    const result = await db.query(query);
    return result.rows;
  }

  /**
   * Restituisce la lista dei nomi di gruppo per un utente
   * @param {string} userId
   * @returns {Promise<string[]>}
   */
  async getUserGroups(userId) {
    const query = `
      SELECT group_name 
      FROM user_groups 
      WHERE user_id = $1 
      ORDER BY group_name ASC
    `;
    const result = await db.query(query, [userId]);
    return result.rows.map(r => r.group_name);
  }

  /**
   * Sostituisce i gruppi associati a un utente
   * @param {string} userId
   * @param {string[]} groups
   * @param {Object} [client] - eventuale client transazionale pg
   */
  async setUserGroups(userId, groups = [], client = null) {
    const executor = client || db;
    await executor.query('DELETE FROM user_groups WHERE user_id = $1', [userId]);

    if (!groups || groups.length === 0) {
      return [];
    }

    const uniqueGroups = [...new Set(groups.map(g => (g || '').toUpperCase().trim()))].filter(Boolean);
    for (const groupName of uniqueGroups) {
      await executor.query(
        'INSERT INTO user_groups (user_id, group_name) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [userId, groupName]
      );
    }

    return uniqueGroups;
  }
}

module.exports = new GroupRepository();
