const db = require('../config/database');

const formatDateOnly = (val) => {
  if (!val) return null;
  if (typeof val === 'string') return val.slice(0, 10);
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  return String(val).slice(0, 10);
};

const normalizeWeekdays = (arr) => {
  if (!Array.isArray(arr)) return [];
  const unique = new Set(
    arr
      .map(v => parseInt(v, 10))
      .filter(n => !isNaN(n) && n >= 1 && n <= 5)
  );
  return Array.from(unique).sort((a, b) => a - b);
};

class PaymentRepository {
  /**
   * Recupera il prospetto completo dei pagamenti per studenti per mese e anno
   */
  async getMonthlyStudentBilling(year, month) {
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);

    const fromDate = `${y}-${String(m).padStart(2, '0')}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const toDate = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const prevYear = m === 1 ? y - 1 : y;
    const prevMonth = m === 1 ? 12 : m - 1;
    const prevFromDate = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`;
    const prevLastDay = new Date(prevYear, prevMonth, 0).getDate();
    const prevToDate = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(prevLastDay).padStart(2, '0')}`;

    // 1. Recupera tariffa attiva 'ONE_OFF' per il mese e tariffa pasto da system_settings
    const oneOffTariffRes = await db.query(
      `SELECT t.price 
       FROM afterschool_packages p
       JOIN afterschool_tariffs t ON p.id = t.package_id
       WHERE p.code = 'ONE_OFF'
         AND t.valid_from <= $1 AND t.valid_to >= $1
       ORDER BY t.valid_from DESC LIMIT 1`,
      [fromDate]
    );
    const oneOffFee = oneOffTariffRes.rows.length > 0 ? Number(oneOffTariffRes.rows[0].price) : 15.00;

    const prevOneOffRes = await db.query(
      `SELECT t.price 
       FROM afterschool_packages p
       JOIN afterschool_tariffs t ON p.id = t.package_id
       WHERE p.code = 'ONE_OFF'
         AND t.valid_from <= $1 AND t.valid_to >= $1
       ORDER BY t.valid_from DESC LIMIT 1`,
      [prevFromDate]
    );
    const prevOneOffFee = prevOneOffRes.rows.length > 0 ? Number(prevOneOffRes.rows[0].price) : oneOffFee;

    const settingsRes = await db.query(
      `SELECT key, value FROM system_settings WHERE key = 'meal_fee_student'`
    );
    const mealFee = settingsRes.rows.length > 0 ? Number(settingsRes.rows[0].value) : 5.50;

    // 1b. Chiusure straordinarie del mese
    const closuresRes = await db.query(
      `SELECT id, date, title, notes
       FROM closure_days
       WHERE date BETWEEN $1 AND $2
       ORDER BY date ASC`,
      [fromDate, toDate]
    );
    const closures = closuresRes.rows.map(c => ({
      id: c.id,
      date: formatDateOnly(c.date),
      title: c.title,
      notes: c.notes || null
    }));

    // 2. Tutti gli studenti
    const studentsRes = await db.query(
      `SELECT s.id, s.nome AS first_name, s.cognome AS last_name, s.scuola
       FROM students s
       ORDER BY s.cognome ASC, s.nome ASC`
    );

    // 3. Pacchetti assegnati per l'anno/mese
    const assignedTariffsRes = await db.query(
      `SELECT smt.id, smt.student_id, smt.year, smt.month,
              smt.package_id, p.name AS package_name, p.code AS package_code,
              smt.tariff_id, smt.amount_paid, smt.covered_days,
              smt.scheduled_weekdays, smt.start_date,
              smt.assigned_at, smt.notes
       FROM student_monthly_tariffs smt
       JOIN afterschool_packages p ON smt.package_id = p.id
       WHERE smt.year = $1 AND smt.month = $2
       ORDER BY smt.assigned_at ASC`,
      [y, m]
    );

    // Mappa pacchetti per studente
    const packagesByStudent = new Map();
    for (const t of assignedTariffsRes.rows) {
      if (!packagesByStudent.has(t.student_id)) {
        packagesByStudent.set(t.student_id, []);
      }
      packagesByStudent.get(t.student_id).push({
        id: t.id,
        student_id: t.student_id,
        year: t.year,
        month: t.month,
        package_id: t.package_id,
        package_name: t.package_name,
        package_code: t.package_code,
        tariff_id: t.tariff_id,
        amount_paid: Number(t.amount_paid),
        covered_days: Number(t.covered_days),
        scheduled_weekdays: Array.isArray(t.scheduled_weekdays) ? t.scheduled_weekdays.map(Number) : [],
        start_date: formatDateOnly(t.start_date) || fromDate,
        assigned_at: t.assigned_at,
        notes: t.notes
      });
    }

    // 4. Presenze e Pasti nel mese da attendances
    const attendancesRes = await db.query(
      `SELECT student_id,
              COUNT(CASE WHEN is_present = true THEN 1 END) AS days_present,
              COUNT(CASE WHEN canteen_used = true THEN 1 END) AS meals_count
       FROM attendances
       WHERE date BETWEEN $1 AND $2
       GROUP BY student_id`,
      [fromDate, toDate]
    );
    const attendancesByStudent = new Map();
    for (const att of attendancesRes.rows) {
      attendancesByStudent.set(att.student_id, {
        days_present: Number(att.days_present || 0),
        meals_count: Number(att.meals_count || 0)
      });
    }

    // 5. Saldi esistenti da student_monthly_settlements
    const settlementsRes = await db.query(
      `SELECT student_id, extra_paid, extra_paid_at, meals_paid, meals_paid_at, payment_method, notes
       FROM student_monthly_settlements
       WHERE year = $1 AND month = $2`,
      [y, m]
    );
    const settlementsByStudent = new Map();
    for (const set of settlementsRes.rows) {
      settlementsByStudent.set(set.student_id, set);
    }

    // 5b. Dati mese precedente per calcolo pendenze (pasti + giorni extra non saldati del mese precedente)
    const prevTariffsRes = await db.query(
      `SELECT student_id, COALESCE(SUM(covered_days), 0) AS total_covered_days
       FROM student_monthly_tariffs
       WHERE year = $1 AND month = $2
       GROUP BY student_id`,
      [prevYear, prevMonth]
    );
    const prevCoveredByStudent = new Map();
    for (const r of prevTariffsRes.rows) {
      prevCoveredByStudent.set(r.student_id, Number(r.total_covered_days || 0));
    }

    const prevAttendancesRes = await db.query(
      `SELECT student_id,
              COUNT(CASE WHEN is_present = true THEN 1 END) AS days_present,
              COUNT(CASE WHEN canteen_used = true THEN 1 END) AS meals_count
       FROM attendances
       WHERE date BETWEEN $1 AND $2
       GROUP BY student_id`,
      [prevFromDate, prevToDate]
    );
    const prevAttendancesByStudent = new Map();
    for (const att of prevAttendancesRes.rows) {
      prevAttendancesByStudent.set(att.student_id, {
        days_present: Number(att.days_present || 0),
        meals_count: Number(att.meals_count || 0)
      });
    }

    const prevSettlementsRes = await db.query(
      `SELECT student_id, extra_paid, meals_paid
       FROM student_monthly_settlements
       WHERE year = $1 AND month = $2`,
      [prevYear, prevMonth]
    );
    const prevSettlementsByStudent = new Map();
    for (const set of prevSettlementsRes.rows) {
      prevSettlementsByStudent.set(set.student_id, set);
    }

    // 6. Costruzione lista e calcolo totali
    let totalPackagesRevenue = 0;
    let totalExtraPending = 0;
    let totalExtraCollected = 0;
    let totalMealsPending = 0;
    let totalMealsCollected = 0;

    const studentBillings = studentsRes.rows.map(stu => {
      const assigned = packagesByStudent.get(stu.id) || [];
      const totalPaidPackages = assigned.reduce((acc, p) => acc + p.amount_paid, 0);
      const totalCoveredDays = assigned.reduce((acc, p) => acc + p.covered_days, 0);

      const att = attendancesByStudent.get(stu.id) || { days_present: 0, meals_count: 0 };
      const daysPresent = att.days_present;
      const mealsCount = att.meals_count;

      const extraDaysCount = Math.max(0, daysPresent - totalCoveredDays);
      const extraDaysTotal = Number((extraDaysCount * oneOffFee).toFixed(2));
      const mealsTotal = Number((mealsCount * mealFee).toFixed(2));

      const settlement = settlementsByStudent.get(stu.id) || {};
      const extraPaid = !!settlement.extra_paid;
      const extraPaidAt = settlement.extra_paid_at || null;
      const mealsPaid = !!settlement.meals_paid;
      const mealsPaidAt = settlement.meals_paid_at || null;
      const paymentMethod = settlement.payment_method || null;

      // Calcolo pendenza mese precedente
      const prevCoveredDays = prevCoveredByStudent.get(stu.id) || 0;
      const prevAtt = prevAttendancesByStudent.get(stu.id) || { days_present: 0, meals_count: 0 };
      const prevExtraDaysCount = Math.max(0, prevAtt.days_present - prevCoveredDays);
      const prevExtraDaysTotal = Number((prevExtraDaysCount * prevOneOffFee).toFixed(2));
      const prevMealsCount = prevAtt.meals_count;
      const prevMealsTotal = Number((prevMealsCount * mealFee).toFixed(2));
      const prevSettlement = prevSettlementsByStudent.get(stu.id) || {};
      const prevExtraPaid = !!prevSettlement.extra_paid;
      const prevMealsPaid = !!prevSettlement.meals_paid;

      // Aggregazione KPI globali
      totalPackagesRevenue += totalPaidPackages;
      if (extraPaid) {
        totalExtraCollected += extraDaysTotal;
      } else {
        totalExtraPending += extraDaysTotal;
      }

      if (mealsPaid) {
        totalMealsCollected += mealsTotal;
      } else {
        totalMealsPending += mealsTotal;
      }

      const totalDueMonth = Number((totalPaidPackages + extraDaysTotal + mealsTotal).toFixed(2));

      return {
        student_id: stu.id,
        first_name: stu.first_name,
        last_name: stu.last_name,
        school: stu.scuola,
        assigned_packages: assigned,
        total_paid_packages: Number(totalPaidPackages.toFixed(2)),
        total_covered_days: totalCoveredDays,
        days_present: daysPresent,
        extra_days_count: extraDaysCount,
        extra_days_unit_fee: oneOffFee,
        extra_days_total: extraDaysTotal,
        extra_paid: extraPaid,
        extra_paid_at: extraPaidAt,
        meals_count: mealsCount,
        meal_unit_fee: mealFee,
        meals_total: mealsTotal,
        meals_paid: mealsPaid,
        meals_paid_at: mealsPaidAt,
        payment_method: paymentMethod,
        total_due_month: totalDueMonth,
        notes: settlement.notes || null,
        previous_month_pending: {
          year: prevYear,
          month: prevMonth,
          extra_days_count: prevExtraDaysCount,
          extra_days_total: prevExtraDaysTotal,
          extra_paid: prevExtraPaid,
          meals_count: prevMealsCount,
          meals_total: prevMealsTotal,
          meals_paid: prevMealsPaid,
          total_pending: Number(((prevExtraPaid ? 0 : prevExtraDaysTotal) + (prevMealsPaid ? 0 : prevMealsTotal)).toFixed(2)),
          has_pending: (!prevExtraPaid && prevExtraDaysTotal > 0) || (!prevMealsPaid && prevMealsTotal > 0)
        }
      };
    });

    return {
      year: y,
      month: m,
      closures,
      unit_rates: {
        one_off_fee: oneOffFee,
        meal_fee_student: mealFee
      },
      totals: {
        total_students: studentsRes.rows.length,
        total_packages_revenue: Number(totalPackagesRevenue.toFixed(2)),
        total_extra_pending: Number(totalExtraPending.toFixed(2)),
        total_extra_collected: Number(totalExtraCollected.toFixed(2)),
        total_meals_pending: Number(totalMealsPending.toFixed(2)),
        total_meals_collected: Number(totalMealsCollected.toFixed(2)),
        grand_total_potential: Number((totalPackagesRevenue + totalExtraPending + totalExtraCollected + totalMealsPending + totalMealsCollected).toFixed(2))
      },
      students: studentBillings
    };
  }

  /**
   * Assegna un pacchetto doposcuola a uno studente per un determinato mese/anno
   */
  async assignTariffToStudent({ student_id, year, month, package_id, scheduled_weekdays = [], start_date = null, notes = null }) {
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    const referenceDate = `${y}-${String(m).padStart(2, '0')}-01`;

    const normalizedWeekdays = normalizeWeekdays(scheduled_weekdays);

    let effectiveStartDate = referenceDate;
    if (start_date && /^\d{4}-\d{2}-\d{2}$/.test(String(start_date))) {
      effectiveStartDate = String(start_date);
    } else {
      const now = new Date();
      const curY = now.getFullYear();
      const curM = now.getMonth() + 1;
      if (curY === y && curM === m) {
        effectiveStartDate = `${curY}-${String(curM).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      }
    }

    // 1. Recupera il pacchetto
    const pkgRes = await db.query('SELECT * FROM afterschool_packages WHERE id = $1', [package_id]);
    if (pkgRes.rows.length === 0) {
      throw new Error('Pacchetto non trovato');
    }
    const pkg = pkgRes.rows[0];

    // 2. Recupera la tariffa attiva per la data
    const tariffRes = await db.query(
      `SELECT * FROM afterschool_tariffs
       WHERE package_id = $1
         AND valid_from <= $2 AND valid_to >= $2
       ORDER BY valid_from DESC LIMIT 1`,
      [package_id, referenceDate]
    );

    if (tariffRes.rows.length === 0) {
      throw new Error('Nessuna tariffa attiva per questo pacchetto nel mese indicato');
    }
    const tariff = tariffRes.rows[0];

    // 3. Inserimento in student_monthly_tariffs
    const insertRes = await db.query(
      `INSERT INTO student_monthly_tariffs (student_id, year, month, package_id, tariff_id, amount_paid, covered_days, scheduled_weekdays, start_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [student_id, y, m, package_id, tariff.id, Number(tariff.price), Number(pkg.monthly_days), normalizedWeekdays, effectiveStartDate, notes]
    );

    const row = insertRes.rows[0];
    return {
      ...row,
      amount_paid: Number(row.amount_paid),
      covered_days: Number(row.covered_days),
      scheduled_weekdays: Array.isArray(row.scheduled_weekdays) ? row.scheduled_weekdays.map(Number) : normalizedWeekdays,
      start_date: formatDateOnly(row.start_date) || effectiveStartDate,
      package_name: pkg.name,
      package_code: pkg.code
    };
  }

  /**
   * Aggiorna la pianificazione settimanale, la data di decorrenza e le note di un pacchetto assegnato
   */
  async updateStudentTariff(assignmentId, { scheduled_weekdays, start_date, notes } = {}) {
    const existingRes = await db.query(
      `SELECT * FROM student_monthly_tariffs WHERE id = $1`,
      [assignmentId]
    );
    if (existingRes.rows.length === 0) {
      return null;
    }

    const current = existingRes.rows[0];
    const nextWeekdays = scheduled_weekdays !== undefined
      ? normalizeWeekdays(scheduled_weekdays)
      : (Array.isArray(current.scheduled_weekdays) ? current.scheduled_weekdays.map(Number) : []);
    const nextStartDate = (start_date && /^\d{4}-\d{2}-\d{2}$/.test(String(start_date)))
      ? String(start_date)
      : (formatDateOnly(current.start_date) || `${current.year}-${String(current.month).padStart(2, '0')}-01`);
    const nextNotes = notes !== undefined ? notes : current.notes;

    await db.query(
      `UPDATE student_monthly_tariffs
       SET scheduled_weekdays = $2,
           start_date = $3,
           notes = $4,
           updated_at = NOW()
       WHERE id = $1`,
      [assignmentId, nextWeekdays, nextStartDate, nextNotes]
    );

    const updatedRes = await db.query(
      `SELECT smt.*, p.name AS package_name, p.code AS package_code
       FROM student_monthly_tariffs smt
       JOIN afterschool_packages p ON smt.package_id = p.id
       WHERE smt.id = $1`,
      [assignmentId]
    );

    if (updatedRes.rows.length === 0) return null;
    const row = updatedRes.rows[0];
    return {
      ...row,
      amount_paid: Number(row.amount_paid),
      covered_days: Number(row.covered_days),
      scheduled_weekdays: Array.isArray(row.scheduled_weekdays) ? row.scheduled_weekdays.map(Number) : nextWeekdays,
      start_date: formatDateOnly(row.start_date) || nextStartDate
    };
  }

  /**
   * Rimuove un pacchetto precedentemente assegnato
   */
  async removeStudentTariff(assignmentId) {
    const res = await db.query(
      `DELETE FROM student_monthly_tariffs WHERE id = $1 RETURNING *`,
      [assignmentId]
    );
    return res.rows[0] || null;
  }

  /**
   * Salda gli extra e/o i pasti per lo studente nel mese specificato
   */
  async settleMonthlyExtrasAndMeals({ student_id, year, month, settle_extra = false, settle_meals = false, payment_method = null, notes = null }) {
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);

    const now = new Date();

    const existingRes = await db.query(
      `SELECT * FROM student_monthly_settlements WHERE student_id = $1 AND year = $2 AND month = $3`,
      [student_id, y, m]
    );

    if (existingRes.rows.length === 0) {
      const res = await db.query(
        `INSERT INTO student_monthly_settlements
         (student_id, year, month, extra_paid, extra_paid_at, meals_paid, meals_paid_at, payment_method, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          student_id,
          y,
          m,
          settle_extra,
          settle_extra ? now : null,
          settle_meals,
          settle_meals ? now : null,
          payment_method,
          notes
        ]
      );
      return res.rows[0];
    } else {
      const current = existingRes.rows[0];
      const nextExtraPaid = settle_extra ? true : current.extra_paid;
      const nextExtraPaidAt = settle_extra ? now : current.extra_paid_at;
      const nextMealsPaid = settle_meals ? true : current.meals_paid;
      const nextMealsPaidAt = settle_meals ? now : current.meals_paid_at;
      const nextPaymentMethod = payment_method !== null ? payment_method : current.payment_method;
      const nextNotes = notes !== null ? notes : current.notes;

      const res = await db.query(
        `UPDATE student_monthly_settlements
         SET extra_paid = $1, extra_paid_at = $2,
             meals_paid = $3, meals_paid_at = $4,
             payment_method = $5, notes = $6, updated_at = NOW()
         WHERE student_id = $7 AND year = $8 AND month = $9
         RETURNING *`,
        [nextExtraPaid, nextExtraPaidAt, nextMealsPaid, nextMealsPaidAt, nextPaymentMethod, nextNotes, student_id, y, m]
      );
      return res.rows[0];
    }
  }
}

module.exports = new PaymentRepository();
