const db = require('../config/database');

class AfterschoolRepository {
  /**
   * Recupera tutte le assegnazioni dopo scuola con i dati del docente
   */
  async findAll() {
    const query = `
      SELECT a.id, a.user_id, a.hourly_rate, a.notes, a.created_at, a.updated_at,
             u.email,
             COALESCE(u.first_name, u.nome) AS first_name,
             COALESCE(u.last_name, u.cognome) AS last_name,
             u.phone
      FROM afterschool_assignments a
      JOIN users u ON a.user_id = u.id
      ORDER BY COALESCE(u.last_name, u.cognome) ASC, COALESCE(u.first_name, u.nome) ASC
    `;
    const result = await db.query(query);
    return result.rows;
  }

  /**
   * Recupera l'assegnazione dopo scuola per un determinato utente/docente
   */
  async findByUserId(userId) {
    const query = `
      SELECT a.id, a.user_id, a.hourly_rate, a.notes, a.created_at, a.updated_at,
             u.email,
             COALESCE(u.first_name, u.nome) AS first_name,
             COALESCE(u.last_name, u.cognome) AS last_name,
             u.phone
      FROM afterschool_assignments a
      JOIN users u ON a.user_id = u.id
      WHERE a.user_id = $1
    `;
    const result = await db.query(query, [userId]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Crea o aggiorna (upsert) la commessa dopo scuola per un utente
   * Vincolo 1 sola commessa per utente gestito da ON CONFLICT (user_id)
   */
  async upsert(userId, hourlyRate, notes = null) {
    const query = `
      INSERT INTO afterschool_assignments (user_id, hourly_rate, notes)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id)
      DO UPDATE SET
        hourly_rate = EXCLUDED.hourly_rate,
        notes = EXCLUDED.notes,
        updated_at = NOW()
      RETURNING id, user_id, hourly_rate, notes, created_at, updated_at
    `;
    const result = await db.query(query, [
      userId,
      hourlyRate !== undefined && hourlyRate !== null ? Number(hourlyRate) : 0,
      notes || null
    ]);
    return result.rows[0];
  }

  /**
   * Rimuove l'assegnazione della commessa dopo scuola per un utente
   */
  async deleteByUserId(userId) {
    const query = `DELETE FROM afterschool_assignments WHERE user_id = $1 RETURNING id`;
    const result = await db.query(query, [userId]);
    return result.rowCount > 0;
  }

  /**
   * Recupera i turni dei docenti in un intervallo di date [startDate, endDate]
   */
  async findShiftsBetween(startDate, endDate) {
    const query = `
      SELECT ts.id, ts.user_id, ts.shift_date, ts.start_time, ts.end_time, ts.notes,
             ts.created_at, ts.updated_at,
             u.email,
             COALESCE(u.first_name, u.nome) AS first_name,
             COALESCE(u.last_name, u.cognome) AS last_name
      FROM teacher_shifts ts
      JOIN users u ON ts.user_id = u.id
      WHERE ts.shift_date >= $1 AND ts.shift_date <= $2
      ORDER BY ts.shift_date ASC, ts.start_time ASC, COALESCE(u.last_name, u.cognome) ASC
    `;
    const result = await db.query(query, [startDate, endDate]);
    return result.rows;
  }

  /**
   * Crea un nuovo turno insegnante
   */
  async createShift(userId, shiftDate, startTime, endTime, notes = null) {
    const query = `
      INSERT INTO teacher_shifts (user_id, shift_date, start_time, end_time, notes)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, user_id, shift_date, start_time, end_time, notes, created_at, updated_at
    `;
    const result = await db.query(query, [userId, shiftDate, startTime, endTime, notes || null]);
    return result.rows[0];
  }

  /**
   * Aggiorna un turno insegnante esistente
   */
  async updateShift(id, userId, shiftDate, startTime, endTime, notes = null) {
    const query = `
      UPDATE teacher_shifts
      SET user_id = COALESCE($2, user_id),
          shift_date = COALESCE($3, shift_date),
          start_time = COALESCE($4, start_time),
          end_time = COALESCE($5, end_time),
          notes = $6,
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, user_id, shift_date, start_time, end_time, notes, created_at, updated_at
    `;
    const result = await db.query(query, [id, userId, shiftDate, startTime, endTime, notes]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Elimina un turno per id
   */
  async deleteShift(id) {
    const query = `DELETE FROM teacher_shifts WHERE id = $1 RETURNING id`;
    const result = await db.query(query, [id]);
    return result.rowCount > 0;
  }

  /**
   * Trova un turno per id
   */
  async findShiftById(id) {
    const query = `
      SELECT ts.id, ts.user_id, ts.shift_date, ts.start_time, ts.end_time, ts.notes,
             ts.created_at, ts.updated_at,
             u.email,
             COALESCE(u.first_name, u.nome) AS first_name,
             COALESCE(u.last_name, u.cognome) AS last_name
      FROM teacher_shifts ts
      JOIN users u ON ts.user_id = u.id
      WHERE ts.id = $1
    `;
    const result = await db.query(query, [id]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Recupera i bambini del doposcuola per una specifica data:
   * include tutti gli studenti che hanno quella giornata nel piano di abbonamento
   * OPPURE che hanno una presenza già registrata in quella data.
   */
  async getStudentsForDate(dateStr) {
    const query = `
      SELECT 
        s.id AS student_id,
        s.nome AS first_name,
        s.cognome AS last_name,
        s.scuola,
        s.giorni_abbonamento,
        s.pasti_settimanali,
        s.giorni_mensa,
        COALESCE(a.is_present, false) AS is_present,
        COALESCE(a.canteen_used, false) AS canteen_used,
        COALESCE(a.notes, '') AS notes,
        (a.id IS NOT NULL) AS already_registered,
        (
          COALESCE(a.canteen_used, false) = true
          OR EXTRACT(ISODOW FROM $1::date) = ANY(s.giorni_mensa)
          OR (s.pasti_settimanali > 0 AND EXTRACT(ISODOW FROM $1::date) = ANY(s.giorni_abbonamento))
        ) AS has_meal_plan
      FROM students s
      LEFT JOIN attendances a ON s.id = a.student_id AND a.date = $1
      WHERE EXTRACT(ISODOW FROM $1::date) = ANY(s.giorni_abbonamento)
         OR a.id IS NOT NULL
      ORDER BY s.cognome ASC, s.nome ASC
    `;
    const result = await db.query(query, [dateStr]);
    return result.rows;
  }

  /**
   * Recupera le date di chiusura straordinarie comprese tra startDate e endDate
   */
  async findClosuresBetween(startDate, endDate) {
    const query = `
      SELECT id, date, title, notes, created_at, updated_at
      FROM closure_days
      WHERE date >= $1 AND date <= $2
      ORDER BY date ASC
    `;
    const result = await db.query(query, [startDate, endDate]);
    return result.rows;
  }

  /**
   * Recupera tutte le date di chiusura (ordinamento cronologico)
   */
  async findAllClosures() {
    const query = `
      SELECT id, date, title, notes, created_at, updated_at
      FROM closure_days
      ORDER BY date DESC
    `;
    const result = await db.query(query);
    return result.rows;
  }

  /**
   * Inserisce o aggiorna una data di chiusura (solo Admin)
   */
  async upsertClosure(date, title, notes = null) {
    const query = `
      INSERT INTO closure_days (date, title, notes)
      VALUES ($1, $2, $3)
      ON CONFLICT (date)
      DO UPDATE SET
        title = EXCLUDED.title,
        notes = EXCLUDED.notes,
        updated_at = NOW()
      RETURNING id, date, title, notes, created_at, updated_at
    `;
    const result = await db.query(query, [date, title, notes || null]);
    return result.rows[0];
  }

  /**
   * Elimina una data di chiusura per id
   */
  async deleteClosure(id) {
    const query = `DELETE FROM closure_days WHERE id = $1 RETURNING id`;
    const result = await db.query(query, [id]);
    return result.rowCount > 0;
  }

  /**
   * Recupera le note spese del doposcuola con filtro opzionale su range date e categoria
   */
  async findExpenses({ fromDate, toDate, category } = {}) {
    const params = [];
    const conditions = [];

    if (fromDate) {
      params.push(fromDate);
      conditions.push(`e.expense_date >= $${params.length}`);
    }
    if (toDate) {
      params.push(toDate);
      conditions.push(`e.expense_date <= $${params.length}`);
    }
    if (category && (category === 'MENSA' || category === 'ALTRO')) {
      params.push(category);
      conditions.push(`e.category = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `
      SELECT e.id, e.expense_date, e.category, e.amount, e.description,
             e.created_by, e.created_at, e.updated_at,
             COALESCE(u.first_name, u.nome) AS creator_first_name,
             COALESCE(u.last_name, u.cognome) AS creator_last_name
      FROM afterschool_expenses e
      LEFT JOIN users u ON e.created_by = u.id
      ${whereClause}
      ORDER BY e.expense_date DESC, e.created_at DESC
    `;
    const result = await db.query(query, params);
    return result.rows.map(row => ({
      id: row.id,
      expense_date: typeof row.expense_date === 'string'
        ? row.expense_date.slice(0, 10)
        : new Date(row.expense_date).toISOString().slice(0, 10),
      category: row.category,
      amount: Number(row.amount || 0),
      description: row.description || '',
      created_by: row.created_by || null,
      created_by_name: row.creator_first_name
        ? `${row.creator_first_name} ${row.creator_last_name || ''}`.trim()
        : null,
      created_at: row.created_at,
      updated_at: row.updated_at
    }));
  }

  /**
   * Recupera una singola nota spesa per id
   */
  async findExpenseById(id) {
    const query = `
      SELECT e.id, e.expense_date, e.category, e.amount, e.description,
             e.created_by, e.created_at, e.updated_at,
             COALESCE(u.first_name, u.nome) AS creator_first_name,
             COALESCE(u.last_name, u.cognome) AS creator_last_name
      FROM afterschool_expenses e
      LEFT JOIN users u ON e.created_by = u.id
      WHERE e.id = $1
    `;
    const result = await db.query(query, [id]);
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
      id: row.id,
      expense_date: typeof row.expense_date === 'string'
        ? row.expense_date.slice(0, 10)
        : new Date(row.expense_date).toISOString().slice(0, 10),
      category: row.category,
      amount: Number(row.amount || 0),
      description: row.description || '',
      created_by: row.created_by || null,
      created_by_name: row.creator_first_name
        ? `${row.creator_first_name} ${row.creator_last_name || ''}`.trim()
        : null,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  /**
   * Crea una nuova nota spesa per il doposcuola
   */
  async createExpense({ expense_date, category, amount, description = '', created_by = null }) {
    const query = `
      INSERT INTO afterschool_expenses (expense_date, category, amount, description, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `;
    const result = await db.query(query, [
      expense_date,
      category,
      Number(amount),
      description || '',
      created_by || null
    ]);
    return this.findExpenseById(result.rows[0].id);
  }

  /**
   * Aggiorna una nota spesa esistente
   */
  async updateExpense(id, { expense_date, category, amount, description }) {
    const query = `
      UPDATE afterschool_expenses
      SET expense_date = COALESCE($2, expense_date),
          category = COALESCE($3, category),
          amount = COALESCE($4, amount),
          description = COALESCE($5, description),
          updated_at = NOW()
      WHERE id = $1
      RETURNING id
    `;
    const result = await db.query(query, [
      id,
      expense_date || null,
      category || null,
      amount !== undefined && amount !== null ? Number(amount) : null,
      description !== undefined ? description : null
    ]);
    if (result.rows.length === 0) return null;
    return this.findExpenseById(id);
  }

  /**
   * Elimina una nota spesa per id
   */
  async deleteExpense(id) {
    const query = `DELETE FROM afterschool_expenses WHERE id = $1 RETURNING id`;
    const result = await db.query(query, [id]);
    return result.rowCount > 0;
  }
}

module.exports = new AfterschoolRepository();



