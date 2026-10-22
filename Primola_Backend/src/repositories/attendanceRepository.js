const db = require('../config/database');

/**
 * Recupera gli studenti attesi in base ai giorni di abbonamento.
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
        COALESCE(a.is_absent_justified, false)  AS is_absent_justified,
        COALESCE(a.canteen_used, false)         AS canteen_used,
        COALESCE(a.is_extra, false)             AS is_extra,
        (a.id IS NOT NULL)                      AS already_registered,
        t.telefono                              AS main_tutor_phone
      FROM students s
      LEFT JOIN attendances a
        ON s.id = a.student_id AND a.date = $1
      LEFT JOIN tutors t
        ON s.id = t.student_id AND t.is_main_contact = true
      WHERE EXTRACT(ISODOW FROM $1::date) = ANY(s.giorni_abbonamento)
         OR a.id IS NOT NULL
      ORDER BY COALESCE(a.is_extra, false) ASC, s.cognome ASC, s.nome ASC;
    `;
    const result = await db.query(query, [dateStr]);
    return result.rows;
  } catch (error) {
    console.error('❌ Errore durante il fetch degli studenti attesi:', error.message);
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
      INSERT INTO attendances (student_id, date, is_present, is_absent_justified, canteen_used, is_extra)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (student_id, date) 
      DO UPDATE SET 
        is_present = EXCLUDED.is_present,
        is_absent_justified = EXCLUDED.is_absent_justified,
        canteen_used = EXCLUDED.canteen_used,
        is_extra = EXCLUDED.is_extra,
        updated_at = NOW()
      RETURNING id, student_id, date, is_present;
    `;

    for (const record of attendancesList) {
      const res = await client.query(upsertQuery, [
        record.student_id,
        record.date,
        !!record.is_present,
        !!record.is_absent_justified,
        !!record.canteen_used,
        !!record.is_extra
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
