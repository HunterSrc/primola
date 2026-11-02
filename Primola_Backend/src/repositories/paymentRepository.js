const db = require('../config/database');

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

    const settingsRes = await db.query(
      `SELECT key, value FROM system_settings WHERE key = 'meal_fee_student'`
    );
    const mealFee = settingsRes.rows.length > 0 ? Number(settingsRes.rows[0].value) : 5.50;

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
        notes: settlement.notes || null
      };
    });

    return {
      year: y,
      month: m,
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
  async assignTariffToStudent({ student_id, year, month, package_id, notes = null }) {
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    const referenceDate = `${y}-${String(m).padStart(2, '0')}-01`;

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
      `INSERT INTO student_monthly_tariffs (student_id, year, month, package_id, tariff_id, amount_paid, covered_days, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [student_id, y, m, package_id, tariff.id, Number(tariff.price), Number(pkg.monthly_days), notes]
    );

    return {
      ...insertRes.rows[0],
      package_name: pkg.name,
      package_code: pkg.code
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
