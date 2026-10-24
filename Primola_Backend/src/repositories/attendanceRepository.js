const db = require('../config/database');

/**
 * Recupera gli studenti registrati per una data (presenze registrate o inserite).
 */
const getExpectedStudents = async (dateStr) => {
  try {
    const query = `
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
      JOIN attendances a
        ON s.id = a.student_id AND a.date = $1
      LEFT JOIN tutors t
        ON t.id = (
          SELECT id FROM tutors
          WHERE student_id = s.id
          ORDER BY is_main_contact DESC, created_at ASC
          LIMIT 1
        )
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
  bulkUpsertAttendances
};
