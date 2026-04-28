const db = require('../config/database');
const { sendSuccess, sendError } = require('../utils/responseFormat');

exports.getDailyReport = async (req, res, next) => {
  const date = req.query.date;

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return sendError(res, 400, "Parametro 'date' mancante o formato non valido (richiesto YYYY-MM-DD).");
  }

  const client = await db.getPool().connect();

  try {
    const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM students WHERE EXTRACT(ISODOW FROM $1::date) = ANY(giorni_abbonamento)) AS total_expected,
        COUNT(CASE WHEN is_present = true THEN 1 END) AS total_present,
        COUNT(CASE WHEN is_present = false AND is_absent_justified = false THEN 1 END) AS total_absent,
        COUNT(CASE WHEN is_absent_justified = true THEN 1 END) AS total_excused
      FROM attendances
      WHERE date = $1;
    `;

    const absenteesQuery = `
      SELECT 
        s.id AS student_id,
        s.nome AS first_name,
        s.cognome AS last_name,
        t.nome AS tutor_first_name,
        t.cognome AS tutor_last_name,
        t.telefono AS tutor_phone,
        '' AS tutor_email
      FROM attendances a
      JOIN students s ON a.student_id = s.id
      LEFT JOIN tutors t ON s.id = t.student_id AND t.is_main_contact = true
      WHERE a.date = $1 
        AND a.is_present = false
        AND a.is_absent_justified = false;
    `;

    const [statsResult, absenteesResult] = await Promise.all([
      client.query(statsQuery, [date]),
      client.query(absenteesQuery, [date])
    ]);

    const statsRow = statsResult.rows[0];

    const responseData = {
      date: date,
      statistics: {
        totalExpected: parseInt(statsRow?.total_expected || 0, 10),
        present: parseInt(statsRow?.total_present || 0, 10),
        absent: parseInt(statsRow?.total_absent || 0, 10),
        excused: parseInt(statsRow?.total_excused || 0, 10)
      },
      unjustifiedAbsences: absenteesResult.rows.map(row => ({
        studentName: `${row.first_name} ${row.last_name}`,
        student: {
          id: row.student_id,
          firstName: row.first_name,
          lastName: row.last_name
        },
        mainTutor: row.tutor_first_name ? {
          firstName: row.tutor_first_name,
          lastName: row.tutor_last_name,
          phone: row.tutor_phone,
          email: row.tutor_email,
          fullName: `${row.tutor_first_name} ${row.tutor_last_name}`
        } : null
      }))
    };

    return sendSuccess(res, 200, responseData);

  } catch (error) {
    next(error);
  } finally {
    client.release();
  }
};

/**
 * GET /api/reports/mensa?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Statistiche mensa per un range di date.
 */
exports.getMensaReport = async (req, res, next) => {
  const { from, to } = req.query;

  if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return sendError(res, 400, "Parametri 'from' e 'to' obbligatori nel formato YYYY-MM-DD.");
  }

  const client = await db.getPool().connect();
  try {
    // 1. Totale pasti mensa serviti nel periodo (presenti con canteen_used = true)
    const totalMensaQuery = `
      SELECT COUNT(*) AS total_mensa
      FROM attendances
      WHERE date BETWEEN $1 AND $2
        AND canteen_used = true;
    `;

    // 2. Pasti mensa previsti: studenti regolari (non extra) presenti con mensa
    const expectedMensaQuery = `
      SELECT COUNT(*) AS expected_mensa
      FROM attendances
      WHERE date BETWEEN $1 AND $2
        AND canteen_used = true
        AND is_extra = false;
    `;

    // 3. Extra con mensa nel periodo
    const extraMensaQuery = `
      SELECT COUNT(*) AS extra_mensa
      FROM attendances
      WHERE date BETWEEN $1 AND $2
        AND canteen_used = true
        AND is_extra = true;
    `;

    // 4. Breakdown giornaliero (per grafico)
    const dailyBreakdownQuery = `
      SELECT 
        date,
        COUNT(CASE WHEN canteen_used = true AND is_extra = false THEN 1 END) AS regular_mensa,
        COUNT(CASE WHEN canteen_used = true AND is_extra = true THEN 1 END) AS extra_mensa,
        COUNT(CASE WHEN canteen_used = true THEN 1 END) AS total_mensa
      FROM attendances
      WHERE date BETWEEN $1 AND $2
      GROUP BY date
      ORDER BY date ASC;
    `;

    const [totalResult, expectedResult, extraResult, dailyResult] = await Promise.all([
      client.query(totalMensaQuery, [from, to]),
      client.query(expectedMensaQuery, [from, to]),
      client.query(extraMensaQuery, [from, to]),
      client.query(dailyBreakdownQuery, [from, to])
    ]);

    return sendSuccess(res, 200, {
      range: { from, to },
      totalMensa: parseInt(totalResult.rows[0]?.total_mensa || 0, 10),
      expectedMensa: parseInt(expectedResult.rows[0]?.expected_mensa || 0, 10),
      extraMensa: parseInt(extraResult.rows[0]?.extra_mensa || 0, 10),
      dailyBreakdown: dailyResult.rows.map(r => ({
        date: r.date,
        regularMensa: parseInt(r.regular_mensa, 10),
        extraMensa: parseInt(r.extra_mensa, 10),
        totalMensa: parseInt(r.total_mensa, 10)
      }))
    });

  } catch (error) {
    next(error);
  } finally {
    client.release();
  }
};
