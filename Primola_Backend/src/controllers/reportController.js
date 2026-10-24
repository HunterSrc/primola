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
        COUNT(CASE WHEN is_present = false THEN 1 END) AS total_absent
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
        COALESCE(t.email, '') AS tutor_email
      FROM attendances a
      JOIN students s ON a.student_id = s.id
      LEFT JOIN tutors t ON t.id = (
        SELECT id FROM tutors
        WHERE student_id = s.id
        ORDER BY is_main_contact DESC, created_at ASC
        LIMIT 1
      )
      WHERE a.date = $1 
        AND a.is_present = false;
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
        a.canteen_used,
        COALESCE(a.notes, '') AS notes,
        a.created_at,
        a.updated_at,
        t.nome AS tutor_first_name,
        t.cognome AS tutor_last_name,
        t.telefono AS tutor_phone
      FROM attendances a
      JOIN students s ON a.student_id = s.id
      LEFT JOIN tutors t ON t.id = (
        SELECT id FROM tutors
        WHERE student_id = s.id
        ORDER BY is_main_contact DESC, created_at ASC
        LIMIT 1
      )
      WHERE a.date = $1
      ORDER BY s.cognome ASC, s.nome ASC;
    `;

    const statsResult = await client.query(statsQuery, [date]);
    const absenteesResult = await client.query(absenteesQuery, [date]);
    const allAttendancesResult = await client.query(allAttendancesQuery, [date]);

    const statsRow = statsResult.rows[0];

    const responseData = {
      date: date,
      statistics: {
        totalExpected: parseInt(statsRow?.total_expected || 0, 10),
        present: parseInt(statsRow?.total_present || 0, 10),
        extraPresent: 0,
        absent: parseInt(statsRow?.total_absent || 0, 10),
        excused: 0,
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
        is_absent_justified: false,
        canteen_used: !!row.canteen_used,
        is_extra: false,
        notes: row.notes || '',
        created_at: row.created_at,
        updated_at: row.updated_at,
        tutor_name: row.tutor_first_name ? `${row.tutor_first_name} ${row.tutor_last_name}` : 'N/D',
        tutor_phone: row.tutor_phone || ''
      })),
      extraStudents: [],
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

const getIsoWeekKey = (dateObj) => {
  const d = new Date(Date.UTC(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
};

const computeExpectedMeals = (students, fromDateStr, toDateStr) => {
  const [fy, fm, fd] = fromDateStr.split('-').map(Number);
  const [ty, tm, td] = toDateStr.split('-').map(Number);
  const start = new Date(fy, fm - 1, fd);
  const end = new Date(ty, tm - 1, td);

  const daysInRange = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay() === 0 ? 7 : d.getDay();
    daysInRange.push({
      dow,
      weekKey: getIsoWeekKey(d)
    });
  }

  const expectedByStudent = new Map();
  let totalExpected = 0;

  for (const s of students) {
    const subDays = Array.isArray(s.giorni_abbonamento) ? s.giorni_abbonamento.map(Number) : [];
    const weeklyMeals = parseInt(s.pasti_settimanali ?? 0, 10) || 0;
    if (weeklyMeals <= 0 || subDays.length === 0) {
      expectedByStudent.set(s.id, 0);
      continue;
    }

    const weekSubCounts = new Map();
    for (const day of daysInRange) {
      if (subDays.includes(day.dow)) {
        weekSubCounts.set(day.weekKey, (weekSubCounts.get(day.weekKey) || 0) + 1);
      }
    }

    let studentExpected = 0;
    for (const subCount of weekSubCounts.values()) {
      studentExpected += Math.min(weeklyMeals, subCount);
    }

    expectedByStudent.set(s.id, studentExpected);
    totalExpected += studentExpected;
  }

  return { totalExpected, expectedByStudent };
};

/**
 * GET /api/reports/mensa?year=YYYY&month=MM (oppure ?from=YYYY-MM-DD&to=YYYY-MM-DD)
 * Statistiche mensa per anno/mese o range di date.
 */
exports.getMensaReport = async (req, res, next) => {
  const { year, month } = req.query;
  let { from, to } = req.query;
  let parsedYear = null;
  let parsedMonth = null;

  if (year !== undefined || month !== undefined) {
    if (!year || !month) {
      return sendError(res, 400, "Parametri 'year' e 'month' obbligatori.");
    }
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    if (isNaN(y) || isNaN(m) || m < 1 || m > 12) {
      return sendError(res, 400, "Valori 'year' o 'month' non validi (month: 1-12).");
    }
    parsedYear = y;
    parsedMonth = m;
    from = `${y}-${String(m).padStart(2, '0')}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    to = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  } else if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return sendError(res, 400, "Parametri 'year' e 'month' (o 'from' e 'to' nel formato YYYY-MM-DD) obbligatori.");
  } else {
    parsedYear = parseInt(from.slice(0, 4), 10);
    parsedMonth = parseInt(from.slice(5, 7), 10);
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

    // 2. Breakdown giornaliero (per grafico e dettaglio studenti serviti)
    const dailyBreakdownQuery = `
      SELECT 
        a.date,
        COUNT(CASE WHEN a.canteen_used = true THEN 1 END) AS regular_mensa,
        0 AS extra_mensa,
        COUNT(CASE WHEN a.canteen_used = true THEN 1 END) AS total_mensa,
        COALESCE(
          json_agg(
            json_build_object('id', s.id, 'name', s.nome || ' ' || s.cognome)
          ) FILTER (WHERE a.canteen_used = true),
          '[]'::json
        ) AS students
      FROM attendances a
      JOIN students s ON a.student_id = s.id
      WHERE a.date BETWEEN $1 AND $2
        AND a.canteen_used = true
      GROUP BY a.date
      ORDER BY a.date ASC;
    `;

    // 3. Elenco studenti e relativi pasti consegnati nel periodo per stima e breakdown
    const studentsMensaQuery = `
      SELECT 
        s.id,
        s.nome AS first_name,
        s.cognome AS last_name,
        s.scuola,
        s.giorni_abbonamento,
        s.pasti_settimanali,
        COUNT(CASE WHEN a.canteen_used = true THEN 1 END) AS delivered_regular,
        0 AS delivered_extra,
        COUNT(CASE WHEN a.canteen_used = true THEN 1 END) AS delivered_total
      FROM students s
      LEFT JOIN attendances a ON a.student_id = s.id AND a.date BETWEEN $1 AND $2
      GROUP BY s.id, s.nome, s.cognome, s.scuola, s.giorni_abbonamento, s.pasti_settimanali
      ORDER BY s.cognome ASC, s.nome ASC;
    `;

    const totalResult = await client.query(totalMensaQuery, [from, to]);
    const dailyResult = await client.query(dailyBreakdownQuery, [from, to]);
    const studentsResult = await client.query(studentsMensaQuery, [from, to]);

    const studentRows = studentsResult?.rows || [];
    const { totalExpected, expectedByStudent } = computeExpectedMeals(studentRows, from, to);

    const deliveredTotal = parseInt(totalResult?.rows?.[0]?.total_mensa || 0, 10);
    const deliveredRegular = deliveredTotal;
    const deliveredExtra = 0;

    return sendSuccess(res, 200, {
      year: parsedYear,
      month: parsedMonth,
      from,
      to,
      range: { from, to },
      totalMensa: deliveredTotal,
      deliveredTotal,
      deliveredRegular,
      deliveredExtra,
      expectedMensa: totalExpected,
      expectedMeals: totalExpected,
      extraMensa: deliveredExtra,
      dailyBreakdown: (dailyResult?.rows || []).map(r => ({
        date: r.date,
        regularMensa: parseInt(r.regular_mensa, 10),
        extraMensa: parseInt(r.extra_mensa, 10),
        totalMensa: parseInt(r.total_mensa, 10),
        students: Array.isArray(r.students) ? r.students : []
      })),
      studentsBreakdown: studentRows.map(s => ({
        student_id: s.id,
        first_name: s.first_name,
        last_name: s.last_name,
        studentName: `${s.first_name} ${s.last_name}`,
        school: s.scuola || '',
        pasti_settimanali: parseInt(s.pasti_settimanali ?? 0, 10),
        expectedMeals: expectedByStudent.get(s.id) || 0,
        deliveredRegular: parseInt(s.delivered_regular || 0, 10),
        deliveredExtra: parseInt(s.delivered_extra || 0, 10),
        deliveredTotal: parseInt(s.delivered_total || 0, 10)
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
        0 AS total_extra_present,
        COUNT(CASE WHEN is_present = false THEN 1 END) AS total_unjustified_absent,
        0 AS total_excused,
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
        0 AS extra,
        COUNT(CASE WHEN is_present = false THEN 1 END) AS absent,
        0 AS excused,
        COUNT(CASE WHEN canteen_used = true THEN 1 END) AS meals
      FROM attendances
      WHERE date BETWEEN $1 AND $2
      GROUP BY date
      ORDER BY date ASC;
    `;

    // 3. Frequenza e presenze per studente nel mese con piani presenze pagate
    const studentBreakdownQuery = `
      SELECT 
        s.id AS student_id,
        s.nome AS first_name,
        s.cognome AS last_name,
        s.scuola,
        COUNT(CASE WHEN a.is_present = true THEN 1 END) AS days_present,
        0 AS extra_days,
        COUNT(CASE WHEN a.is_present = false AND a.id IS NOT NULL THEN 1 END) AS days_absent,
        0 AS days_excused,
        COUNT(CASE WHEN a.canteen_used = true THEN 1 END) AS meals_count,
        COALESCE(p.presenze_pagate, 0) AS presenze_pagate
      FROM students s
      LEFT JOIN attendances a ON a.student_id = s.id AND a.date BETWEEN $1 AND $2
      LEFT JOIN student_monthly_plans p ON p.student_id = s.id AND p.year = $3 AND p.month = $4
      GROUP BY s.id, s.nome, s.cognome, s.scuola, p.presenze_pagate
      ORDER BY s.cognome ASC, s.nome ASC;
    `;

    const totalsRes = await client.query(totalsQuery, [fromDate, toDate]);
    const dailyTrendRes = await client.query(dailyTrendQuery, [fromDate, toDate]);
    const studentRes = await client.query(studentBreakdownQuery, [fromDate, toDate, y, m]);

    const tot = totalsRes.rows[0] || {};

    return sendSuccess(res, 200, {
      year: y,
      month: m,
      from: fromDate,
      to: toDate,
      summary: {
        totalPresent: parseInt(tot.total_present || 0, 10),
        totalExtraPresent: 0,
        totalUnjustifiedAbsent: parseInt(tot.total_unjustified_absent || 0, 10),
        totalExcused: 0,
        totalMeals: parseInt(tot.total_meals || 0, 10),
        activeDays: parseInt(tot.active_days || 0, 10)
      },
      dailyTrend: dailyTrendRes.rows.map(r => ({
        date: r.date,
        present: parseInt(r.present, 10),
        extra: 0,
        absent: parseInt(r.absent, 10),
        excused: 0,
        meals: parseInt(r.meals, 10)
      })),
      studentsSummary: studentRes.rows.map(r => {
        const daysPresent = parseInt(r.days_present || 0, 10);
        const daysAbsent = parseInt(r.days_absent || 0, 10);
        const presenzePagate = parseInt(r.presenze_pagate || 0, 10);
        const eccedenza = (daysPresent + daysAbsent) - presenzePagate;

        return {
          student_id: r.student_id,
          first_name: r.first_name,
          last_name: r.last_name,
          studentName: `${r.first_name} ${r.last_name}`,
          school: r.scuola || '',
          days_present: daysPresent,
          extra_days: 0,
          days_absent: daysAbsent,
          days_excused: 0,
          meals_count: parseInt(r.meals_count || 0, 10),
          presenze_pagate: presenzePagate,
          eccedenza: eccedenza
        };
      })
    });

  } catch (error) {
    next(error);
  } finally {
    client.release();
  }
};

/**
 * Salva/aggiorna le presenze pagate mensili per gli studenti
 * Accessibile ad ADMIN e OFFICE
 */
exports.saveMonthlyPlans = async (req, res, next) => {
  const { year, month, plans } = req.body;

  if (!year || !month || !Array.isArray(plans)) {
    return sendError(res, 400, "Parametri 'year', 'month' e array 'plans' obbligatori.");
  }

  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  if (isNaN(y) || isNaN(m) || m < 1 || m > 12) {
    return sendError(res, 400, "Valori 'year' o 'month' non validi.");
  }

  const client = await db.getPool().connect();
  try {
    await client.query('BEGIN');
    const upsertQuery = `
      INSERT INTO student_monthly_plans (student_id, year, month, presenze_pagate)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (student_id, year, month)
      DO UPDATE SET 
        presenze_pagate = EXCLUDED.presenze_pagate,
        updated_at = NOW()
      RETURNING id, student_id, year, month, presenze_pagate;
    `;

    const results = [];
    for (const item of plans) {
      if (!item.student_id) continue;
      const count = Math.max(0, parseInt(item.presenze_pagate ?? 0, 10) || 0);
      const r = await client.query(upsertQuery, [item.student_id, y, m, count]);
      results.push(r.rows[0]);
    }

    await client.query('COMMIT');
    return sendSuccess(res, 200, {
      message: `${results.length} piani mensili aggiornati con successo.`,
      updated: results
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

/**
 * Report Commesse e Ore Docenti
 * Accessibile ad ADMIN e OFFICE
 */
exports.getProjectsReport = async (req, res, next) => {
  try {
    const projectRepository = require('../repositories/projectRepository');
    const rows = await projectRepository.getProjectsReportData();

    // Raggruppamento per commessa
    const projectsMap = {};
    let grandTotalHours = 0;
    let grandTotalCost = 0;

    for (const row of rows) {
      if (!projectsMap[row.project_id]) {
        projectsMap[row.project_id] = {
          id: row.project_id,
          title: row.title,
          location: row.location,
          total_hours: 0,
          total_cost: 0,
          teachers: []
        };
      }

      if (row.user_id) {
        const hours = row.assigned_hours ? Number(row.assigned_hours) : 0;
        const rate = row.hourly_rate ? Number(row.hourly_rate) : 0;
        const cost = hours * rate;

        projectsMap[row.project_id].total_hours += hours;
        projectsMap[row.project_id].total_cost += cost;
        grandTotalHours += hours;
        grandTotalCost += cost;

        projectsMap[row.project_id].teachers.push({
          user_id: row.user_id,
          first_name: row.first_name,
          last_name: row.last_name,
          email: row.email,
          hourly_rate: rate,
          assigned_hours: hours,
          total_cost: cost
        });
      }
    }

    const projectsList = Object.values(projectsMap);

    return sendSuccess(res, 200, {
      summary: {
        total_projects: projectsList.length,
        total_hours: Number(grandTotalHours.toFixed(2)),
        total_cost: Number(grandTotalCost.toFixed(2))
      },
      projects: projectsList
    });
  } catch (error) {
    next(error);
  }
};
