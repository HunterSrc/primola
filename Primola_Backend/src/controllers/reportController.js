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

const calculateShiftHours = (startTime, endTime) => {
  if (!startTime || !endTime) return 0;
  const [sh, sm] = String(startTime).slice(0, 5).split(':').map(Number);
  const [eh, em] = String(endTime).slice(0, 5).split(':').map(Number);
  const diffMinutes = (eh * 60 + (em || 0)) - (sh * 60 + (sm || 0));
  return Math.max(0, diffMinutes / 60);
};

/**
 * Report Finanziario Mensile (Solo ADMIN)
 * Calcolo entrate/uscite previste ed effettive per Doposcuola e Corsi,
 * totale pasti emessi e uscite docenti.
 * GET /api/reports/financial-monthly?year=YYYY&month=MM
 */
exports.getFinancialMonthlyReport = async (req, res, next) => {
  const { year, month } = req.query;
  if (!year || !month) {
    return sendError(res, 400, "Parametri 'year' e 'month' obbligatori.");
  }

  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  if (isNaN(y) || isNaN(m) || m < 1 || m > 12) {
    return sendError(res, 400, "Valori 'year' o 'month' non validi.");
  }

  const fromDate = `${y}-${String(m).padStart(2, '0')}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const toDate = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  const todayStr = new Date().toISOString().slice(0, 10);

  const client = await db.getPool().connect();
  try {
    const settingsRepository = require('../repositories/settingsRepository');
    const settings = await settingsRepository.getSettingsMap();
    const doposcuolaFee = Number(settings.doposcuola_daily_fee || 12.00);
    const mealFee = Number(settings.meal_fee_student || 5.50);
    const mealCostProvider = Number(settings.meal_cost_provider || 4.80);

    // 1. Chiusure straordinarie del mese
    const closuresRes = await client.query(
      `SELECT date FROM closure_days WHERE date BETWEEN $1 AND $2`,
      [fromDate, toDate]
    );
    const closureDates = new Set(closuresRes.rows.map(r => String(r.date).slice(0, 10)));

    // 2. Studenti e calcolo presenze/pasti attesi
    const studentsRes = await client.query(
      `SELECT id, nome AS first_name, cognome AS last_name, scuola, giorni_abbonamento, pasti_settimanali 
       FROM students 
       ORDER BY cognome ASC, nome ASC`
    );
    const students = studentsRes.rows;

    // Calcolo giorni doposcuola previsti nel mese
    let totalExpectedStudentDays = 0;
    const startObj = new Date(y, m - 1, 1);
    const endObj = new Date(y, m - 1, lastDay);

    for (const s of students) {
      const subDays = Array.isArray(s.giorni_abbonamento) ? s.giorni_abbonamento.map(Number) : [];
      if (subDays.length === 0) continue;

      let sDays = 0;
      for (let d = new Date(startObj); d <= endObj; d.setDate(d.getDate() + 1)) {
        const dStr = d.toISOString().slice(0, 10);
        const dow = d.getDay() === 0 ? 7 : d.getDay();
        if (dow <= 5 && !closureDates.has(dStr) && subDays.includes(dow)) {
          sDays++;
        }
      }
      totalExpectedStudentDays += sDays;
    }

    // Pasti previsti
    const { totalExpected: totalExpectedMeals } = computeExpectedMeals(students, fromDate, toDate);

    // 3. Presenze registrate e pasti effettivi
    const attendancesRes = await client.query(
      `SELECT student_id, date, is_present, canteen_used 
       FROM attendances 
       WHERE date BETWEEN $1 AND $2`,
      [fromDate, toDate]
    );
    const attendances = attendancesRes.rows;

    const actualMealsCount = attendances.filter(a => a.canteen_used).length;

    // Presenze pagate da student_monthly_plans
    const plansRes = await client.query(
      `SELECT student_id, presenze_pagate 
       FROM student_monthly_plans 
       WHERE year = $1 AND month = $2`,
      [y, m]
    );
    const planMap = new Map();
    for (const p of plansRes.rows) {
      planMap.set(p.student_id, Number(p.presenze_pagate || 0));
    }

    // Calcolo presenze effettive/pagate
    let totalActualStudentDays = 0;
    for (const s of students) {
      const paid = planMap.get(s.id) || 0;
      if (paid > 0) {
        totalActualStudentDays += paid;
      } else {
        const actualPresent = attendances.filter(a => a.student_id === s.id && a.is_present).length;
        totalActualStudentDays += actualPresent;
      }
    }

    // Calcolo Entrate Doposcuola
    const doposcuolaExpectedRevenues = Number((totalExpectedStudentDays * doposcuolaFee + totalExpectedMeals * mealFee).toFixed(2));
    const doposcuolaActualRevenues = Number((totalActualStudentDays * doposcuolaFee + actualMealsCount * mealFee).toFixed(2));

    // 4. Turni docenti doposcuola nel mese
    const shiftsRes = await client.query(
      `SELECT ts.id, ts.user_id, ts.shift_date, ts.start_time, ts.end_time,
              COALESCE(u.first_name, u.nome) AS first_name,
              COALESCE(u.last_name, u.cognome) AS last_name,
              COALESCE(aa.hourly_rate, 0)::numeric AS hourly_rate
       FROM teacher_shifts ts
       JOIN users u ON ts.user_id = u.id
       LEFT JOIN afterschool_assignments aa ON ts.user_id = aa.user_id
       WHERE ts.shift_date BETWEEN $1 AND $2
       ORDER BY ts.shift_date ASC, ts.start_time ASC`,
      [fromDate, toDate]
    );

    const afterschoolTeachersMap = {};
    let afterschoolExpectedTeacherCost = 0;
    let afterschoolActualTeacherCost = 0;
    let afterschoolTotalHours = 0;

    for (const shift of shiftsRes.rows) {
      const hours = calculateShiftHours(shift.start_time, shift.end_time);
      const rate = Number(shift.hourly_rate || 0);
      const cost = hours * rate;

      afterschoolExpectedTeacherCost += cost;
      afterschoolTotalHours += hours;

      const shiftDateStr = String(shift.shift_date).slice(0, 10);
      if (shiftDateStr <= todayStr) {
        afterschoolActualTeacherCost += cost;
      }

      if (!afterschoolTeachersMap[shift.user_id]) {
        afterschoolTeachersMap[shift.user_id] = {
          user_id: shift.user_id,
          name: `${shift.first_name} ${shift.last_name}`.trim(),
          hourly_rate: rate,
          shifts_count: 0,
          total_hours: 0,
          total_cost: 0
        };
      }
      afterschoolTeachersMap[shift.user_id].shifts_count++;
      afterschoolTeachersMap[shift.user_id].total_hours += hours;
      afterschoolTeachersMap[shift.user_id].total_cost += cost;
    }

    // Se il mese selezionato è passato, tutti i turni programmati sono consuntivati
    if (toDate < todayStr) {
      afterschoolActualTeacherCost = afterschoolExpectedTeacherCost;
    }

    const expectedMealCost = Number((totalExpectedMeals * mealCostProvider).toFixed(2));
    const actualMealCost = Number((actualMealsCount * mealCostProvider).toFixed(2));

    const doposcuolaExpectedExpenses = Number((afterschoolExpectedTeacherCost + expectedMealCost).toFixed(2));
    const doposcuolaActualExpenses = Number((afterschoolActualTeacherCost + actualMealCost).toFixed(2));

    // 5. Corsi (Projects != 'DOPOSCUOLA')
    const coursesRes = await client.query(
      `SELECT p.id, p.title, p.type, p.enrollment_fee, p.max_enrolled, 
              COALESCE(p.actual_enrolled, 0) AS actual_enrolled,
              p.start_date, p.end_date
       FROM projects p
       WHERE p.type != 'DOPOSCUOLA'
       ORDER BY p.title ASC`
    );

    const projectTeachersRes = await client.query(
      `SELECT pt.project_id, pt.user_id, pt.hourly_rate, pt.assigned_hours,
              COALESCE(u.first_name, u.nome) AS first_name,
              COALESCE(u.last_name, u.cognome) AS last_name,
              p.title AS project_title, p.end_date
       FROM project_teachers pt
       JOIN users u ON pt.user_id = u.id
       JOIN projects p ON pt.project_id = p.id
       WHERE p.type != 'DOPOSCUOLA'
       ORDER BY p.title ASC, COALESCE(u.last_name, u.cognome) ASC`
    );

    // Corsi attivi nel mese
    let coursesExpectedRevenues = 0;
    let coursesActualRevenues = 0;
    let coursesExpectedExpenses = 0;
    let coursesActualExpenses = 0;

    const coursesTeachersBreakdown = [];

    for (const c of coursesRes.rows) {
      const sDate = c.start_date ? String(c.start_date).slice(0, 10) : null;
      const eDate = c.end_date ? String(c.end_date).slice(0, 10) : null;

      const isActiveInMonth = (!sDate || sDate <= toDate) && (!eDate || eDate >= fromDate);
      const isFinishedInMonth = eDate && eDate >= fromDate && eDate <= toDate;

      if (isActiveInMonth) {
        coursesExpectedRevenues += Number(c.max_enrolled || 0) * Number(c.enrollment_fee || 0);
        coursesActualRevenues += Number(c.actual_enrolled || 0) * Number(c.enrollment_fee || 0);
      }

      // Docenti associati a questo corso
      const teachers = projectTeachersRes.rows.filter(pt => pt.project_id === c.id);
      for (const t of teachers) {
        const hours = Number(t.assigned_hours || 0);
        const rate = Number(t.hourly_rate || 0);
        const cost = hours * rate;

        if (isActiveInMonth) {
          coursesExpectedExpenses += cost;
        }
        if (isFinishedInMonth) {
          coursesActualExpenses += cost;
        }

        if (isActiveInMonth || isFinishedInMonth) {
          coursesTeachersBreakdown.push({
            project_id: c.id,
            project_title: c.title,
            user_id: t.user_id,
            teacher_name: `${t.first_name} ${t.last_name}`.trim(),
            hourly_rate: rate,
            assigned_hours: hours,
            total_cost: cost,
            is_finished: !!isFinishedInMonth
          });
        }
      }
    }

    // Risposta aggregata
    return sendSuccess(res, 200, {
      year: y,
      month: m,
      from: fromDate,
      to: toDate,
      rates: {
        doposcuola_daily_fee: doposcuolaFee,
        meal_fee_student: mealFee,
        meal_cost_provider: mealCostProvider
      },
      doposcuola: {
        revenues: {
          expected: doposcuolaExpectedRevenues,
          actual: doposcuolaActualRevenues,
          expected_days: totalExpectedStudentDays,
          actual_days: totalActualStudentDays,
          expected_meals: totalExpectedMeals,
          actual_meals: actualMealsCount
        },
        expenses: {
          expected: doposcuolaExpectedExpenses,
          actual: doposcuolaActualExpenses,
          expected_teacher_cost: Number(afterschoolExpectedTeacherCost.toFixed(2)),
          actual_teacher_cost: Number(afterschoolActualTeacherCost.toFixed(2)),
          expected_catering_cost: expectedMealCost,
          actual_catering_cost: actualMealCost
        },
        margin: {
          expected: Number((doposcuolaExpectedRevenues - doposcuolaExpectedExpenses).toFixed(2)),
          actual: Number((doposcuolaActualRevenues - doposcuolaActualExpenses).toFixed(2))
        },
        total_meals: actualMealsCount,
        teachers: Object.values(afterschoolTeachersMap).map(t => ({
          ...t,
          total_hours: Number(t.total_hours.toFixed(2)),
          total_cost: Number(t.total_cost.toFixed(2))
        }))
      },
      courses: {
        revenues: {
          expected: Number(coursesExpectedRevenues.toFixed(2)),
          actual: Number(coursesActualRevenues.toFixed(2))
        },
        expenses: {
          expected: Number(coursesExpectedExpenses.toFixed(2)),
          actual: Number(coursesActualExpenses.toFixed(2))
        },
        margin: {
          expected: Number((coursesExpectedRevenues - coursesExpectedExpenses).toFixed(2)),
          actual: Number((coursesActualRevenues - coursesActualExpenses).toFixed(2))
        },
        teachers: coursesTeachersBreakdown
      },
      summary: {
        total_expected_revenues: Number((doposcuolaExpectedRevenues + coursesExpectedRevenues).toFixed(2)),
        total_actual_revenues: Number((doposcuolaActualRevenues + coursesActualRevenues).toFixed(2)),
        total_expected_expenses: Number((doposcuolaExpectedExpenses + coursesExpectedExpenses).toFixed(2)),
        total_actual_expenses: Number((doposcuolaActualExpenses + coursesActualExpenses).toFixed(2)),
        total_expected_margin: Number(((doposcuolaExpectedRevenues + coursesExpectedRevenues) - (doposcuolaExpectedExpenses + coursesExpectedExpenses)).toFixed(2)),
        total_actual_margin: Number(((doposcuolaActualRevenues + coursesActualRevenues) - (doposcuolaActualExpenses + coursesActualExpenses)).toFixed(2)),
        total_meals_issued: actualMealsCount
      }
    });

  } catch (error) {
    next(error);
  } finally {
    client.release();
  }
};

/**
 * Report Operativo Mensile (ADMIN e OFFICE)
 * Dettaglio per mese selezionato:
 * 1. Pasti consumati per alunno
 * 2. Costo per teacher doposcuola
 * 3. Costo per teacher corsi terminati nel mese
 * GET /api/reports/operational-monthly?year=YYYY&month=MM
 */
exports.getOperationalMonthlyReport = async (req, res, next) => {
  const { year, month } = req.query;
  if (!year || !month) {
    return sendError(res, 400, "Parametri 'year' e 'month' obbligatori.");
  }

  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  if (isNaN(y) || isNaN(m) || m < 1 || m > 12) {
    return sendError(res, 400, "Valori 'year' o 'month' non validi.");
  }

  const fromDate = `${y}-${String(m).padStart(2, '0')}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const toDate = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const client = await db.getPool().connect();
  try {
    // 1. Dettaglio Pasti per Alunno
    const studentsRes = await client.query(
      `SELECT s.id, s.nome AS first_name, s.cognome AS last_name, s.scuola,
              s.giorni_abbonamento, s.pasti_settimanali,
              COUNT(CASE WHEN a.is_present = true THEN 1 END) AS days_present,
              COUNT(CASE WHEN a.canteen_used = true THEN 1 END) AS meals_consumed
       FROM students s
       LEFT JOIN attendances a ON s.id = a.student_id AND a.date BETWEEN $1 AND $2
       GROUP BY s.id, s.nome, s.cognome, s.scuola, s.giorni_abbonamento, s.pasti_settimanali
       ORDER BY s.cognome ASC, s.nome ASC`,
      [fromDate, toDate]
    );

    const { expectedByStudent } = computeExpectedMeals(studentsRes.rows, fromDate, toDate);

    const studentsMeals = studentsRes.rows.map(s => ({
      student_id: s.id,
      first_name: s.first_name,
      last_name: s.last_name,
      student_name: `${s.first_name} ${s.last_name}`.trim(),
      school: s.scuola || '',
      days_present: parseInt(s.days_present || 0, 10),
      meals_consumed: parseInt(s.meals_consumed || 0, 10),
      expected_meals: expectedByStudent.get(s.id) || 0,
      weekly_meals: parseInt(s.pasti_settimanali ?? 0, 10)
    }));

    // 2. Costo Docenti Doposcuola nel Mese Selezionato
    const shiftsRes = await client.query(
      `SELECT ts.id, ts.user_id, ts.shift_date, ts.start_time, ts.end_time, ts.notes,
              COALESCE(u.first_name, u.nome) AS first_name,
              COALESCE(u.last_name, u.cognome) AS last_name,
              u.email, u.phone,
              COALESCE(aa.hourly_rate, 0)::numeric AS hourly_rate
       FROM teacher_shifts ts
       JOIN users u ON ts.user_id = u.id
       LEFT JOIN afterschool_assignments aa ON ts.user_id = aa.user_id
       WHERE ts.shift_date BETWEEN $1 AND $2
       ORDER BY COALESCE(u.last_name, u.cognome) ASC, ts.shift_date ASC, ts.start_time ASC`,
      [fromDate, toDate]
    );

    const afterschoolTeachersMap = {};
    let afterschoolGrandTotalHours = 0;
    let afterschoolGrandTotalCost = 0;

    for (const shift of shiftsRes.rows) {
      const hours = calculateShiftHours(shift.start_time, shift.end_time);
      const rate = Number(shift.hourly_rate || 0);
      const cost = hours * rate;

      afterschoolGrandTotalHours += hours;
      afterschoolGrandTotalCost += cost;

      if (!afterschoolTeachersMap[shift.user_id]) {
        afterschoolTeachersMap[shift.user_id] = {
          user_id: shift.user_id,
          first_name: shift.first_name,
          last_name: shift.last_name,
          teacher_name: `${shift.first_name} ${shift.last_name}`.trim(),
          email: shift.email || '',
          phone: shift.phone || '',
          hourly_rate: rate,
          shifts_count: 0,
          total_hours: 0,
          total_cost: 0,
          shifts: []
        };
      }

      afterschoolTeachersMap[shift.user_id].shifts_count++;
      afterschoolTeachersMap[shift.user_id].total_hours += hours;
      afterschoolTeachersMap[shift.user_id].total_cost += cost;
      afterschoolTeachersMap[shift.user_id].shifts.push({
        id: shift.id,
        shift_date: String(shift.shift_date).slice(0, 10),
        start_time: shift.start_time,
        end_time: shift.end_time,
        hours: Number(hours.toFixed(2)),
        rate,
        cost: Number(cost.toFixed(2)),
        notes: shift.notes || ''
      });
    }

    const afterschoolTeachersList = Object.values(afterschoolTeachersMap).map(t => ({
      ...t,
      total_hours: Number(t.total_hours.toFixed(2)),
      total_cost: Number(t.total_cost.toFixed(2))
    }));

    // 3. Costo Docenti Corsi Terminati nel Mese Selezionato
    const finishedCoursesRes = await client.query(
      `SELECT p.id AS project_id, p.title, p.type, p.location, p.start_date, p.end_date,
              pt.user_id, pt.hourly_rate, pt.assigned_hours,
              COALESCE(u.first_name, u.nome) AS first_name,
              COALESCE(u.last_name, u.cognome) AS last_name,
              u.email, u.phone
       FROM projects p
       JOIN project_teachers pt ON p.id = pt.project_id
       JOIN users u ON pt.user_id = u.id
       WHERE p.type != 'DOPOSCUOLA'
         AND p.end_date >= $1 AND p.end_date <= $2
       ORDER BY p.end_date ASC, p.title ASC, COALESCE(u.last_name, u.cognome) ASC`,
      [fromDate, toDate]
    );

    const finishedCoursesMap = {};
    let finishedCoursesGrandTotalHours = 0;
    let finishedCoursesGrandTotalCost = 0;

    for (const row of finishedCoursesRes.rows) {
      const hours = Number(row.assigned_hours || 0);
      const rate = Number(row.hourly_rate || 0);
      const cost = hours * rate;

      finishedCoursesGrandTotalHours += hours;
      finishedCoursesGrandTotalCost += cost;

      if (!finishedCoursesMap[row.project_id]) {
        finishedCoursesMap[row.project_id] = {
          project_id: row.project_id,
          title: row.title,
          type: row.type,
          location: row.location || '',
          start_date: row.start_date ? String(row.start_date).slice(0, 10) : null,
          end_date: row.end_date ? String(row.end_date).slice(0, 10) : null,
          total_hours: 0,
          total_cost: 0,
          teachers: []
        };
      }

      finishedCoursesMap[row.project_id].total_hours += hours;
      finishedCoursesMap[row.project_id].total_cost += cost;
      finishedCoursesMap[row.project_id].teachers.push({
        user_id: row.user_id,
        first_name: row.first_name,
        last_name: row.last_name,
        teacher_name: `${row.first_name} ${row.last_name}`.trim(),
        email: row.email || '',
        phone: row.phone || '',
        hourly_rate: rate,
        assigned_hours: hours,
        total_cost: cost
      });
    }

    const finishedCoursesList = Object.values(finishedCoursesMap).map(c => ({
      ...c,
      total_hours: Number(c.total_hours.toFixed(2)),
      total_cost: Number(c.total_cost.toFixed(2))
    }));

    return sendSuccess(res, 200, {
      year: y,
      month: m,
      from: fromDate,
      to: toDate,
      students_meals: studentsMeals,
      afterschool_teachers: {
        summary: {
          total_teachers: afterschoolTeachersList.length,
          total_hours: Number(afterschoolGrandTotalHours.toFixed(2)),
          total_cost: Number(afterschoolGrandTotalCost.toFixed(2))
        },
        teachers: afterschoolTeachersList
      },
      finished_courses_teachers: {
        summary: {
          total_courses: finishedCoursesList.length,
          total_hours: Number(finishedCoursesGrandTotalHours.toFixed(2)),
          total_cost: Number(finishedCoursesGrandTotalCost.toFixed(2))
        },
        courses: finishedCoursesList
      }
    });

  } catch (error) {
    next(error);
  } finally {
    client.release();
  }
};

