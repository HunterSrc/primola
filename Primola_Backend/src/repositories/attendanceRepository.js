const db = require('../config/database');

/**
 * Recupera gli studenti attesi in base ai giorni di abbonamento.
 */
const getExpectedStudents = async (dateStr) => {
  try {
    const query = `
      SELECT 
        id AS student_id,
        nome AS first_name,
        cognome AS last_name,
        giorni_abbonamento
      FROM students
      WHERE EXTRACT(ISODOW FROM $1::date) = ANY(giorni_abbonamento);
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
 * Schema reale: attendances(id, student_id, date, is_present, is_absent_justified, canteen_used, is_extra, created_at, updated_at)
 */
const bulkUpsertAttendances = async (attendancesList) => {
  if (!attendancesList || attendancesList.length === 0) return [];
  
  const studentIds = [];
  const dates = [];
  const isPresents = [];
  const isAbsentJustifieds = [];
  const canteenUseds = [];
  const isExtras = [];

  for (const record of attendancesList) {
    studentIds.push(record.student_id);
    dates.push(record.date);
    isPresents.push(!!record.is_present);
    isAbsentJustifieds.push(!!record.is_absent_justified);
    canteenUseds.push(!!record.canteen_used);
    isExtras.push(!!record.is_extra);
  }

  try {
    const query = `
      INSERT INTO attendances (student_id, date, is_present, is_absent_justified, canteen_used, is_extra)
      SELECT * FROM UNNEST ($1::uuid[], $2::date[], $3::boolean[], $4::boolean[], $5::boolean[], $6::boolean[])
      ON CONFLICT (student_id, date) 
      DO UPDATE SET 
        is_present = EXCLUDED.is_present,
        is_absent_justified = EXCLUDED.is_absent_justified,
        canteen_used = EXCLUDED.canteen_used,
        is_extra = EXCLUDED.is_extra,
        updated_at = NOW()
      RETURNING id, student_id, date, is_present;
    `;
    
    const result = await db.query(query, [
      studentIds, 
      dates, 
      isPresents, 
      isAbsentJustifieds,
      canteenUseds, 
      isExtras
    ]);
    
    return result.rows;
  } catch (error) {
    console.error('❌ Errore durante il bulk upsert delle presenze:', error.message);
    throw error;
  }
};

module.exports = {
  getExpectedStudents,
  bulkUpsertAttendances
};

