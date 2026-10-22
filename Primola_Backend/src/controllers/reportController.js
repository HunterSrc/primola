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
        COUNT(CASE WHEN is_present = true AND is_extra = true THEN 1 END) AS total_extra_present,
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
        s.scuola,
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

    const extraStudentsQuery = `
      SELECT 
        s.id AS student_id,
        s.nome AS first_name,
        s.cognome AS last_name,
        s.scuola,
        a.canteen_used AS has_meal,
        t.nome AS tutor_first_name,
        t.cognome AS tutor_last_name,
        t.telefono AS tutor_phone
      FROM attendances a
      JOIN students s ON a.student_id = s.id
      LEFT JOIN tutors t ON s.id = t.student_id AND t.is_main_contact = true
      WHERE a.date = $1 
        AND a.is_extra = true
        AND a.is_present = true
      ORDER BY s.cognome ASC, s.nome ASC;
    `;

    const allAttendancesQuery = `
      SELECT 
        a.id AS attendance_id,
        a.date,
        s.id AS student_id,
        s.nome AS first_name,
        s.cognome AS last_name,
        s.scuola,
        a.is_present,
        a.is_absent_justified,
        a.canteen_used,
        a.is_extra,
        a.created_at,
        a.updated_at,
        t.nome AS tutor_first_name,
        t.cognome AS tutor_last_name,
        t.telefono AS tutor_phone
      FROM attendances a
      JOIN students s ON a.student_id = s.id
      LEFT JOIN tutors t ON s.id = t.student_id AND t.is_main_contact = true
      WHERE a.date = $1
      ORDER BY a.is_extra DESC, s.cognome ASC, s.nome ASC;
    `;

    const [statsResult, absenteesResult, extraResult, allAttendancesResult] = await Promise.all([
      client.query(statsQuery, [date]),
      client.query(absenteesQuery, [date]),
      client.query(extraStudentsQuery, [date]),
      client.query(allAttendancesQuery, [date])
    ]);

    const statsRow = statsResult.rows[0];

    const responseData = {
      date: date,
      statistics: {
        totalExpected: parseInt(statsRow?.total_expected || 0, 10),
        present: parseInt(statsRow?.total_present || 0, 10),
        extraPresent: parseInt(statsRow?.total_extra_present || 0, 10),
        absent: parseInt(statsRow?.total_absent || 0, 10),
        excused: parseInt(statsRow?.total_excused || 0, 10),
        totalInserted: allAttendancesResult.rows.length
      },
      allAttendances: allAttendancesResult.rows.map(row => ({
        attendance_id: row.attendance_id,
        date: row.date,
        student_id: row.student_id,
        first_name: row.first_name,
        last_name: row.last_name,
        studentName: `${row.first_name} ${row.last_name}`,
        school: row.scuola || '',
        is_present: !!row.is_present,
        is_absent_justified: !!row.is_absent_justified,
        canteen_used: !!row.canteen_used,
        is_extra: !!row.is_extra,
        created_at: row.created_at,
        updated_at: row.updated_at,
        tutor_name: row.tutor_first_name ? `${row.tutor_first_name} ${row.tutor_last_name}` : 'N/D',
        tutor_phone: row.tutor_phone || ''
      })),
      extraStudents: extraResult.rows.map(row => ({
        student_id: row.student_id,
        first_name: row.first_name,
        last_name: row.last_name,
        studentName: `${row.first_name} ${row.last_name}`,
        school: row.scuola || '',
        has_meal: !!row.has_meal,
        tutor_name: row.tutor_first_name ? `${row.tutor_first_name} ${row.tutor_last_name}` : 'N/D',
        tutor_phone: row.tutor_phone || ''
      })),
      unjustifiedAbsences: absenteesResult.rows.map(row => ({
        studentName: `${row.first_name} ${row.last_name}`,
        student: {
          id: row.student_id,
          firstName: row.first_name,
          lastName: row.last_name
        },
        school: row.scuola || '',
        tutor_name: row.tutor_first_name ? `${row.tutor_first_name} ${row.tutor_last_name}` : 'N/D',
        tutor_phone: row.tutor_phone || '',
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

/**
 * GET /api/reports/monthly?year=YYYY&month=MM
 * Andamento mensile presenze e statistiche per anno e mese.
 */
exports.getMonthlyReport = async (req, res, next) => {
  const { year, month } = req.query;

  if (!year || !month) {
    return sendError(res, 400, "Parametri 'year' e 'month' obbligatori.");
  }

  const y = parseInt(year, 10);
  const m = parseInt(month, 10);

  if (isNaN(y) || isNaN(m) || m < 1 || m > 12) {
    return sendError(res, 400, "Valori 'year' o 'month' non validi (month: 1-12).");
  }

  const fromDate = `${y}-${String(m).padStart(2, '0')}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const toDate = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const client = await db.getPool().connect();

  try {
    // 1. Statistiche complessive mese
    const totalsQuery = `
      SELECT 
        COUNT(CASE WHEN is_present = true THEN 1 END) AS total_present,
        COUNT(CASE WHEN is_present = true AND is_extra = true THEN 1 END) AS total_extra_present,
        COUNT(CASE WHEN is_present = false AND is_absent_justified = false THEN 1 END) AS total_unjustified_absent,
        COUNT(CASE WHEN is_absent_justified = true THEN 1 END) AS total_excused,
        COUNT(CASE WHEN canteen_used = true THEN 1 END) AS total_meals,
        COUNT(DISTINCT date) AS active_days
      FROM attendances
      WHERE date BETWEEN $1 AND $2;
    `;

    // 2. Andamento giorno per giorno del mese
    const dailyTrendQuery = `
      SELECT 
        date,
        COUNT(CASE WHEN is_present = true THEN 1 END) AS present,
        COUNT(CASE WHEN is_present = true AND is_extra = true THEN 1 END) AS extra,
        COUNT(CASE WHEN is_present = false AND is_absent_justified = false THEN 1 END) AS absent,
        COUNT(CASE WHEN is_absent_justified = true THEN 1 END) AS excused,
        COUNT(CASE WHEN canteen_used = true THEN 1 END) AS meals
      FROM attendances
      WHERE date BETWEEN $1 AND $2
      GROUP BY date
      ORDER BY date ASC;
    `;

    // 3. Frequenza e presenze per studente nel mese
    const studentBreakdownQuery = `
      SELECT 
        s.id AS student_id,
        s.nome AS first_name,
        s.cognome AS last_name,
        s.scuola,
        COUNT(CASE WHEN a.is_present = true THEN 1 END) AS days_present,
        COUNT(CASE WHEN a.is_present = true AND a.is_extra = true THEN 1 END) AS extra_days,
        COUNT(CASE WHEN a.is_present = false AND a.is_absent_justified = false THEN 1 END) AS days_absent,
        COUNT(CASE WHEN a.is_absent_justified = true THEN 1 END) AS days_excused,
        COUNT(CASE WHEN a.canteen_used = true THEN 1 END) AS meals_count
      FROM attendances a
      JOIN students s ON a.student_id = s.id
      WHERE a.date BETWEEN $1 AND $2
      GROUP BY s.id, s.nome, s.cognome, s.scuola
      ORDER BY s.cognome ASC, s.nome ASC;
    `;

    const [totalsRes, dailyTrendRes, studentRes] = await Promise.all([
      client.query(totalsQuery, [fromDate, toDate]),
      client.query(dailyTrendQuery, [fromDate, toDate]),
      client.query(studentBreakdownQuery, [fromDate, toDate])
    ]);

    const tot = totalsRes.rows[0] || {};

    return sendSuccess(res, 200, {
      year: y,
      month: m,
      from: fromDate,
      to: toDate,
      summary: {
        totalPresent: parseInt(tot.total_present || 0, 10),
        totalExtraPresent: parseInt(tot.total_extra_present || 0, 10),
        totalUnjustifiedAbsent: parseInt(tot.total_unjustified_absent || 0, 10),
        totalExcused: parseInt(tot.total_excused || 0, 10),
        totalMeals: parseInt(tot.total_meals || 0, 10),
        activeDays: parseInt(tot.active_days || 0, 10)
      },
      dailyTrend: dailyTrendRes.rows.map(r => ({
        date: r.date,
        present: parseInt(r.present, 10),
        extra: parseInt(r.extra, 10),
        absent: parseInt(r.absent, 10),
        excused: parseInt(r.excused, 10),
        meals: parseInt(r.meals, 10)
      })),
      studentsSummary: studentRes.rows.map(r => ({
        student_id: r.student_id,
        first_name: r.first_name,
        last_name: r.last_name,
        studentName: `${r.first_name} ${r.last_name}`,
        school: r.scuola || '',
        days_present: parseInt(r.days_present, 10),
        extra_days: parseInt(r.extra_days, 10),
        days_absent: parseInt(r.days_absent, 10),
        days_excused: parseInt(r.days_excused, 10),
        meals_count: parseInt(r.meals_count, 10)
      }))
    });

  } catch (error) {
    next(error);
  } finally {
    client.release();
  }
};
