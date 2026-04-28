const db = require('../config/database');

const getStudentsWithTutors = async () => {
  try {
    const query = `
      SELECT 
        s.id AS student_id,
        s.nome AS student_first_name,
        s.cognome AS student_last_name,
        s.created_at,
        t.id AS tutor_id,
        t.nome AS tutor_first_name,
        t.cognome AS tutor_last_name,
        t.telefono AS tutor_phone
      FROM students s
      LEFT JOIN tutors t ON s.id = t.student_id;
    `;
    const result = await db.query(query);
    return result.rows;
  } catch (error) {
    console.error('❌ Errore fetch studenti:', error.message);
    throw error;
  }
};

const createStudentWithTutors = async (studentData, tutorsList) => {
  const client = await db.getPool().connect();

  try {
    await client.query('BEGIN');

    const insertStudentQuery = `
      INSERT INTO students (nome, cognome, data_nascita, luogo_nascita, residenza, scuola, giorni_abbonamento)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id;
    `;
    const studentRes = await client.query(insertStudentQuery, [
      studentData.first_name,
      studentData.last_name,
      studentData.data_nascita || '2000-01-01',
      studentData.luogo_nascita || 'N/D',
      studentData.residenza || 'N/D',
      studentData.scuola || 'N/D',
      studentData.giorni_abbonamento || []
    ]);
    const studentId = studentRes.rows[0].id;

    const insertedTutors = [];

    if (tutorsList && tutorsList.length > 0) {
      for (const [index, tutorData] of tutorsList.entries()) {
        const isMainContact = (index === 0);
        const insertTutorQuery = `
          INSERT INTO tutors (student_id, is_main_contact, nome, cognome, telefono, residenza)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id;
        `;
        const tutorRes = await client.query(insertTutorQuery, [
          studentId,
          isMainContact,
          tutorData.first_name,
          tutorData.last_name,
          tutorData.phone || '',
          tutorData.residenza || 'N/D'
        ]);
        insertedTutors.push({ ...tutorData, id: tutorRes.rows[0].id });
      }
    }

    await client.query('COMMIT');
    
    return {
      student_id: studentId,
      tutors: insertedTutors
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Errore transazione studente:', error.message);
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  getStudentsWithTutors,
  createStudentWithTutors
};
