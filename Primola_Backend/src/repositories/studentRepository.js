const db = require('../config/database');

const getStudentsWithTutors = async () => {
  try {
    const query = `
      SELECT 
        s.id AS student_id,
        s.nome AS student_first_name,
        s.cognome AS student_last_name,
        s.scuola,
        s.data_nascita,
        s.luogo_nascita,
        s.residenza,
        s.giorni_abbonamento,
        s.created_at,
        t.id AS tutor_id,
        t.nome AS tutor_first_name,
        t.cognome AS tutor_last_name,
        t.telefono AS tutor_phone,
        t.is_main_contact
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

const getStudentById = async (studentId) => {
  try {
    const studentQuery = `
      SELECT 
        id,
        nome,
        cognome,
        data_nascita,
        luogo_nascita,
        residenza,
        scuola,
        giorni_abbonamento,
        giorni_mensa,
        created_at,
        updated_at
      FROM students
      WHERE id = $1;
    `;
    const studentRes = await db.query(studentQuery, [studentId]);
    if (studentRes.rows.length === 0) {
      return null;
    }

    const tutorsQuery = `
      SELECT 
        id,
        student_id,
        is_main_contact,
        nome,
        cognome,
        telefono,
        email,
        residenza,
        note
      FROM tutors
      WHERE student_id = $1
      ORDER BY is_main_contact DESC, created_at ASC;
    `;
    const tutorsRes = await db.query(tutorsQuery, [studentId]);

    const student = studentRes.rows[0];
    student.tutors = tutorsRes.rows;
    return student;
  } catch (error) {
    console.error('❌ Errore getStudentById:', error.message);
    throw error;
  }
};

const updateStudentWithTutors = async (studentId, studentData, tutorsList) => {
  const client = await db.getPool().connect();

  try {
    await client.query('BEGIN');

    const updateStudentQuery = `
      UPDATE students 
      SET 
        nome = COALESCE($1, nome),
        cognome = COALESCE($2, cognome),
        data_nascita = COALESCE($3, data_nascita),
        luogo_nascita = COALESCE($4, luogo_nascita),
        residenza = COALESCE($5, residenza),
        scuola = COALESCE($6, scuola),
        giorni_abbonamento = $7,
        updated_at = NOW()
      WHERE id = $8
      RETURNING *;
    `;
    const studentRes = await client.query(updateStudentQuery, [
      studentData.first_name,
      studentData.last_name,
      studentData.data_nascita,
      studentData.luogo_nascita,
      studentData.residenza,
      studentData.scuola,
      studentData.giorni_abbonamento || [],
      studentId
    ]);

    if (studentRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    let updatedTutors = [];
    if (tutorsList && Array.isArray(tutorsList)) {
      await client.query('DELETE FROM tutors WHERE student_id = $1;', [studentId]);
      for (const [index, tutorData] of tutorsList.entries()) {
        const isMainContact = tutorData.is_main_contact !== undefined ? !!tutorData.is_main_contact : (index === 0);
        const insertTutorQuery = `
          INSERT INTO tutors (student_id, is_main_contact, nome, cognome, telefono, email, residenza)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id;
        `;
        const tutorRes = await client.query(insertTutorQuery, [
          studentId,
          isMainContact,
          tutorData.first_name,
          tutorData.last_name,
          tutorData.phone || '',
          tutorData.email || '',
          tutorData.residenza || 'N/D'
        ]);
        updatedTutors.push({ ...tutorData, id: tutorRes.rows[0].id });
      }
    }

    await client.query('COMMIT');
    return {
      student: studentRes.rows[0],
      tutors: updatedTutors
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Errore transazione update studente:', error.message);
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  getStudentsWithTutors,
  createStudentWithTutors,
  getStudentById,
  updateStudentWithTutors
};
