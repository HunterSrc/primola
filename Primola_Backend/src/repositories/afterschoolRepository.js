const db = require('../config/database');
const { isItalianHoliday } = require('../utils/holidays');

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
   * restituisce tutti gli studenti che hanno una riga in attendances per quella data.
   */
  async getStudentsForDate(dateStr) {
    const query = `
      SELECT 
        s.id AS student_id,
        s.nome AS first_name,
        s.cognome AS last_name,
        s.scuola,
        s.giorni_abbonamento,
        COALESCE(a.is_present, false) AS is_present,
        COALESCE(a.canteen_used, false) AS canteen_used,
        COALESCE(a.notes, '') AS notes,
        (a.id IS NOT NULL) AS already_registered,
        COALESCE(a.canteen_used, false) AS has_meal_plan
      FROM students s
      INNER JOIN attendances a ON s.id = a.student_id AND a.date = $1
      ORDER BY s.cognome ASC, s.nome ASC
    `;
    const result = await db.query(query, [dateStr]);
    return result.rows;
  }

  /**
   * Calcola le coppie (prevDate, targetDate) Lun-Ven per la settimana di weekStartDate e la precedente (-7 giorni)
   */
  _getWeekDatePairs(weekStartDate) {
    const d = new Date(weekStartDate + 'T00:00:00Z');
    const dayOfWeek = d.getUTCDay(); // 0=Dom, 1=Lun, ..., 6=Sab
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const targetMonday = new Date(d);
    targetMonday.setUTCDate(d.getUTCDate() + diffToMonday);

    const pairs = [];
    for (let i = 0; i < 5; i++) {
      const target = new Date(targetMonday);
      target.setUTCDate(targetMonday.getUTCDate() + i);
      const prev = new Date(target);
      prev.setUTCDate(target.getUTCDate() - 7);
      pairs.push({
        prevDate: prev.toISOString().split('T')[0],
        targetDate: target.toISOString().split('T')[0]
      });
    }
    return pairs;
  }

  /**
   * Copia gli studenti previsti (attendances) dalla settimana precedente (Lun-Ven),
   * saltando festività italiane e closure_days, senza sovrascrivere record esistenti.
   * Imposta is_present = false, copia canteen_used, notes = ''.
   */
  async copyStudentsFromPreviousWeek(weekStartDate) {
    const pairs = this._getWeekDatePairs(weekStartDate);
    const targetStart = pairs[0].targetDate;
    const targetEnd = pairs[4].targetDate;

    const closures = await this.findClosuresBetween(targetStart, targetEnd);
    const closureSet = new Set(
      closures.map(c => (typeof c.date === 'string' ? c.date.slice(0, 10) : new Date(c.date).toISOString().slice(0, 10)))
    );

    let copiedCount = 0;
    const skippedDates = [];

    for (const { prevDate, targetDate } of pairs) {
      if (isItalianHoliday(targetDate) || closureSet.has(targetDate)) {
        skippedDates.push(targetDate);
        continue;
      }

      const prevRes = await db.query(
        `SELECT student_id, canteen_used FROM attendances WHERE date = $1`,
        [prevDate]
      );

      for (const row of prevRes.rows) {
        const existingRes = await db.query(
          `SELECT id FROM attendances WHERE student_id = $1 AND date = $2 LIMIT 1`,
          [row.student_id, targetDate]
        );
        if (existingRes.rows.length === 0) {
          await db.query(
            `INSERT INTO attendances (student_id, date, is_present, canteen_used, notes)
             VALUES ($1, $2, false, $3, '')
             ON CONFLICT (student_id, date) DO NOTHING`,
            [row.student_id, targetDate, !!row.canteen_used]
          );
          copiedCount++;
        }
      }
    }

    return {
      week_start: targetStart,
      previous_week_start: pairs[0].prevDate,
      copied_count: copiedCount,
      skipped_dates: skippedDates
    };
  }

  /**
   * Copia i turni dei docenti (teacher_shifts) dalla settimana precedente (Lun-Ven),
   * saltando festività italiane e closure_days, senza duplicare (user_id, shift_date, start_time, end_time).
   */
  async copyTeachersFromPreviousWeek(weekStartDate) {
    const pairs = this._getWeekDatePairs(weekStartDate);
    const targetStart = pairs[0].targetDate;
    const targetEnd = pairs[4].targetDate;

    const closures = await this.findClosuresBetween(targetStart, targetEnd);
    const closureSet = new Set(
      closures.map(c => (typeof c.date === 'string' ? c.date.slice(0, 10) : new Date(c.date).toISOString().slice(0, 10)))
    );

    let copiedCount = 0;
    const skippedDates = [];

    for (const { prevDate, targetDate } of pairs) {
      if (isItalianHoliday(targetDate) || closureSet.has(targetDate)) {
        skippedDates.push(targetDate);
        continue;
      }

      const prevShiftsRes = await db.query(
        `SELECT user_id, start_time, end_time, notes FROM teacher_shifts WHERE shift_date = $1`,
        [prevDate]
      );

      for (const shift of prevShiftsRes.rows) {
        const existingRes = await db.query(
          `SELECT id FROM teacher_shifts
           WHERE user_id = $1 AND shift_date = $2 AND start_time = $3 AND end_time = $4
           LIMIT 1`,
          [shift.user_id, targetDate, shift.start_time, shift.end_time]
        );

        if (existingRes.rows.length === 0) {
          await db.query(
            `INSERT INTO teacher_shifts (user_id, shift_date, start_time, end_time, notes)
             VALUES ($1, $2, $3, $4, $5)`,
            [shift.user_id, targetDate, shift.start_time, shift.end_time, shift.notes || null]
          );
          copiedCount++;
        }
      }
    }

    return {
      week_start: targetStart,
      previous_week_start: pairs[0].prevDate,
      copied_count: copiedCount,
      skipped_dates: skippedDates
    };
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



