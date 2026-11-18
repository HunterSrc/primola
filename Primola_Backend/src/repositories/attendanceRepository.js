const db = require('../config/database');
const { isItalianHoliday } = require('../utils/holidays');

/**
 * Recupera gli studenti attesi o già registrati per una data.
 * - Nei giorni festivi nazionali o di chiusura straordinaria, restituisce SOLO gli studenti
 *   già esplicitamente registrati in attendances per quella data.
 * - Nei giorni normali, restituisce gli studenti con abbonamento attivo per quel giorno della settimana
 *   oppure già presenti in attendances per quella data.
 */
const getExpectedStudents = async (dateStr) => {
  try {
    let isClosedOrHoliday = isItalianHoliday(dateStr);

    if (!isClosedOrHoliday) {
      const closureRes = await db.query(
        'SELECT 1 FROM closure_days WHERE date = $1',
        [dateStr]
      );
      isClosedOrHoliday = !!(closureRes && closureRes.rows && closureRes.rows.length > 0);
    }

    const tutorJoin = `
      LEFT JOIN (
        SELECT DISTINCT ON (student_id) student_id, telefono
        FROM tutors
        ORDER BY student_id, is_main_contact DESC, created_at ASC
      ) t ON t.student_id = s.id
    `;

    const selectFields = `
      SELECT 
        s.id AS student_id,
        s.nome AS first_name,
        s.cognome AS last_name,
        s.scuola,
        s.giorni_abbonamento,
        COALESCE(a.is_present, false)           AS is_present,
        COALESCE(a.canteen_used, false)         AS canteen_used,
        COALESCE(a.notes, '')                   AS notes,
        (a.id IS NOT NULL)                      AS already_registered,
        t.telefono                              AS main_tutor_phone
      FROM students s
    `;

    const query = isClosedOrHoliday
      ? `
        ${selectFields}
        INNER JOIN attendances a
          ON s.id = a.student_id AND a.date = $1
        ${tutorJoin}
        ORDER BY s.cognome ASC, s.nome ASC;
      `
      : `
        ${selectFields}
        LEFT JOIN attendances a
          ON s.id = a.student_id AND a.date = $1
        ${tutorJoin}
        WHERE s.id IN (
          SELECT smt.student_id
          FROM student_monthly_tariffs smt
          WHERE smt.year = EXTRACT(YEAR FROM $1::date)
            AND smt.month = EXTRACT(MONTH FROM $1::date)
            AND $1::date >= smt.start_date
            AND EXTRACT(ISODOW FROM $1::date) = ANY(smt.scheduled_weekdays)
        )
        OR a.id IS NOT NULL
        ORDER BY s.cognome ASC, s.nome ASC;
      `;

    const result = await db.query(query, [dateStr]);
    return result.rows;
  } catch (error) {
    console.error('❌ Errore durante il fetch delle presenze del giorno:', error.message);
    throw error;
  }
};

/**
 * Rimuove definitivamente la presenza registrata di uno studente per una data.
 */
const deleteAttendance = async (studentId, dateStr) => {
  try {
    const query = `
      DELETE FROM attendances
      WHERE student_id = $1 AND date = $2
      RETURNING id;
    `;
    const result = await db.query(query, [studentId, dateStr]);
    if (result.rows && result.rows.length > 0) {
      return result.rows[0];
    }
    return result.rowCount > 0 ? { id: null } : null;
  } catch (error) {
    console.error('❌ Errore durante l\'eliminazione della presenza:', error.message);
    throw error;
  }
};

/**
 * Inserimento massivo e idempotente delle presenze.
 */
const bulkUpsertAttendances = async (attendancesList) => {
  if (!attendancesList || attendancesList.length === 0) return [];

  const results = [];
  const client = await db.getPool().connect();

  try {
    await client.query('BEGIN');

    const upsertQuery = `
      INSERT INTO attendances (student_id, date, is_present, canteen_used, notes)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (student_id, date) 
      DO UPDATE SET 
        is_present = EXCLUDED.is_present,
        canteen_used = EXCLUDED.canteen_used,
        notes = EXCLUDED.notes,
        updated_at = NOW()
      RETURNING id, student_id, date, is_present;
    `;

    for (const record of attendancesList) {
      const res = await client.query(upsertQuery, [
        record.student_id,
        record.date,
        !!record.is_present,
        !!record.canteen_used,
        record.notes || ''
      ]);
      results.push(res.rows[0]);
    }

    await client.query('COMMIT');
    return results;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Errore durante il bulk upsert delle presenze:', error.message);
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  getExpectedStudents,
  bulkUpsertAttendances,
  deleteAttendance
};
