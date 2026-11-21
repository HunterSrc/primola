const db = require('../config/database');
const { computeCardStatus, formatDateStr } = require('./courseStudentRepository');

const mapInstallmentRow = (row) => ({
  id: row.id,
  enrollment_id: row.enrollment_id,
  installment_number: parseInt(row.installment_number, 10),
  amount: Number(Number(row.amount || 0).toFixed(2)),
  status: row.status,
  paid_at: formatDateStr(row.paid_at),
  payment_method: row.payment_method || null,
  notes: row.notes || null,
  created_at: row.created_at,
  updated_at: row.updated_at
});

const splitInstallments = (totalAmount, count) => {
  const totalCents = Math.round(Number(totalAmount) * 100);
  const baseCents = Math.floor(totalCents / count);
  const remainderCents = totalCents - baseCents * count;
  const amounts = [];
  for (let i = 1; i <= count; i++) {
    const cents = i === count ? baseCents + remainderCents : baseCents;
    amounts.push(Number((cents / 100).toFixed(2)));
  }
  return amounts;
};

class CourseEnrollmentRepository {
  async syncProjectActualEnrolled(queryable, projectId) {
    const countRes = await queryable.query(
      'SELECT COUNT(*)::int AS cnt FROM course_enrollments WHERE project_id = $1',
      [projectId]
    );
    const actualEnrolled = parseInt(countRes.rows[0]?.cnt || 0, 10);
    await queryable.query(
      'UPDATE projects SET actual_enrolled = $1, updated_at = NOW() WHERE id = $2',
      [actualEnrolled, projectId]
    );
    return actualEnrolled;
  }

  async recalculateEnrollmentTotal(queryable, enrollmentId) {
    const sumRes = await queryable.query(
      'SELECT COALESCE(SUM(amount), 0)::numeric AS total FROM course_installments WHERE enrollment_id = $1',
      [enrollmentId]
    );
    const newTotal = Number(Number(sumRes.rows[0]?.total || 0).toFixed(2));
    await queryable.query(
      'UPDATE course_enrollments SET total_amount = $1, updated_at = NOW() WHERE id = $2',
      [newTotal, enrollmentId]
    );
    return newTotal;
  }

  async _enrichEnrollmentRows(rows) {
    if (!rows || rows.length === 0) return [];

    const enrollmentIds = rows.map((r) => r.id);
    const instRes = await db.query(
      `SELECT id, enrollment_id, installment_number, amount, status, paid_at, payment_method, notes, created_at, updated_at
       FROM course_installments
       WHERE enrollment_id = ANY($1::uuid[])
       ORDER BY enrollment_id ASC, installment_number ASC`,
      [enrollmentIds]
    );

    const installmentsByEnrollment = new Map();
    for (const row of instRes.rows) {
      const mapped = mapInstallmentRow(row);
      if (!installmentsByEnrollment.has(row.enrollment_id)) {
        installmentsByEnrollment.set(row.enrollment_id, []);
      }
      installmentsByEnrollment.get(row.enrollment_id).push(mapped);
    }

    return rows.map((row) => {
      const installments = installmentsByEnrollment.get(row.id) || [];
      const paidAmount = Number(
        installments
          .filter((i) => i.status === 'PAID')
          .reduce((acc, i) => acc + i.amount, 0)
          .toFixed(2)
      );
      const totalAmount = Number(Number(row.total_amount || 0).toFixed(2));
      const remainingAmount = Number(Math.max(0, totalAmount - paidAmount).toFixed(2));
      const paidInstallmentsCount = installments.filter((i) => i.status === 'PAID').length;
      const { card_status, days_to_expiry } = computeCardStatus(
        row.possiede_tessera,
        row.data_scadenza_tessera
      );

      return {
        id: row.id,
        course_student_id: row.course_student_id,
        project_id: row.project_id,
        student_nome: row.student_nome,
        student_cognome: row.student_cognome,
        student_name: `${row.student_nome} ${row.student_cognome}`.trim(),
        student_email: row.student_email || null,
        student_telefono: row.student_telefono || null,
        possiede_tessera: Boolean(row.possiede_tessera),
        data_scadenza_tessera: formatDateStr(row.data_scadenza_tessera),
        card_status,
        student_card_status: card_status,
        days_to_expiry,
        project_title: row.project_title,
        project_type: row.project_type,
        project_enrollment_fee: Number(Number(row.project_enrollment_fee || 0).toFixed(2)),
        project_max_enrolled: parseInt(row.project_max_enrolled || 0, 10),
        project_start_date: formatDateStr(row.project_start_date),
        project_end_date: formatDateStr(row.project_end_date),
        total_amount: totalAmount,
        paid_amount: paidAmount,
        remaining_amount: remainingAmount,
        payment_status: remainingAmount <= 0 ? 'PAID' : 'PENDING',
        installments_count: parseInt(row.installments_count || installments.length || 1, 10),
        paid_installments_count: paidInstallmentsCount,
        enrolled_at: formatDateStr(row.enrolled_at),
        notes: row.notes || null,
        created_at: row.created_at,
        updated_at: row.updated_at,
        installments
      };
    });
  }

  async findAll({ project_id = '', course_student_id = '', payment_status = '', search = '' } = {}) {
    const conditions = [];
    const params = [];
    let idx = 1;

    if (project_id) {
      conditions.push(`ce.project_id = $${idx++}`);
      params.push(project_id);
    }
    if (course_student_id) {
      conditions.push(`ce.course_student_id = $${idx++}`);
      params.push(course_student_id);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const res = await db.query(
      `SELECT ce.id, ce.course_student_id, ce.project_id, ce.total_amount, ce.installments_count,
              ce.enrolled_at, ce.notes, ce.created_at, ce.updated_at,
              cs.nome AS student_nome, cs.cognome AS student_cognome,
              cs.email AS student_email, cs.telefono AS student_telefono,
              cs.possiede_tessera, cs.data_scadenza_tessera,
              p.title AS project_title, p.type AS project_type,
              p.enrollment_fee AS project_enrollment_fee, p.max_enrolled AS project_max_enrolled,
              p.start_date AS project_start_date, p.end_date AS project_end_date
       FROM course_enrollments ce
       JOIN course_students cs ON cs.id = ce.course_student_id
       JOIN projects p ON p.id = ce.project_id
       ${whereClause}
       ORDER BY ce.enrolled_at DESC, cs.cognome ASC, cs.nome ASC`,
      params
    );

    let enrollments = await this._enrichEnrollmentRows(res.rows);

    const searchTrimmed = String(search || '').trim().toLowerCase();
    if (searchTrimmed) {
      enrollments = enrollments.filter((e) => {
        const haystack = [
          e.student_nome,
          e.student_cognome,
          e.student_name,
          `${e.student_cognome} ${e.student_nome}`,
          e.student_email,
          e.student_telefono,
          e.project_title
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(searchTrimmed);
      });
    }

    const statusFilter = String(payment_status || '').trim().toUpperCase();
    if (statusFilter && statusFilter !== 'ALL') {
      enrollments = enrollments.filter((e) => e.payment_status === statusFilter);
    }

    const summary = {
      total_enrollments: enrollments.length,
      total_amount: Number(enrollments.reduce((acc, e) => acc + e.total_amount, 0).toFixed(2)),
      total_paid: Number(enrollments.reduce((acc, e) => acc + e.paid_amount, 0).toFixed(2)),
      total_remaining: Number(enrollments.reduce((acc, e) => acc + e.remaining_amount, 0).toFixed(2))
    };

    return { enrollments, summary };
  }

  async findById(id) {
    const res = await db.query(
      `SELECT ce.id, ce.course_student_id, ce.project_id, ce.total_amount, ce.installments_count,
              ce.enrolled_at, ce.notes, ce.created_at, ce.updated_at,
              cs.nome AS student_nome, cs.cognome AS student_cognome,
              cs.email AS student_email, cs.telefono AS student_telefono,
              cs.possiede_tessera, cs.data_scadenza_tessera,
              p.title AS project_title, p.type AS project_type,
              p.enrollment_fee AS project_enrollment_fee, p.max_enrolled AS project_max_enrolled,
              p.start_date AS project_start_date, p.end_date AS project_end_date
       FROM course_enrollments ce
       JOIN course_students cs ON cs.id = ce.course_student_id
       JOIN projects p ON p.id = ce.project_id
       WHERE ce.id = $1`,
      [id]
    );
    if (res.rows.length === 0) return null;
    const enriched = await this._enrichEnrollmentRows(res.rows);
    return enriched[0];
  }

  async findDuplicate(courseStudentId, projectId) {
    const res = await db.query(
      'SELECT id FROM course_enrollments WHERE course_student_id = $1 AND project_id = $2',
      [courseStudentId, projectId]
    );
    return res.rows.length > 0 ? res.rows[0] : null;
  }

  async create({ course_student_id, project_id, total_amount, installments_count = 1, enrolled_at, notes = null }) {
    const client = await db.getPool().connect();
    try {
      await client.query('BEGIN');

      const enrolledAtDate = formatDateStr(enrolled_at) || new Date().toISOString().slice(0, 10);
      const totalNum = Number(Number(total_amount || 0).toFixed(2));
      const count = parseInt(installments_count, 10);

      const enrollRes = await client.query(
        `INSERT INTO course_enrollments (course_student_id, project_id, total_amount, installments_count, enrolled_at, notes)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [course_student_id, project_id, totalNum, count, enrolledAtDate, notes || null]
      );
      const enrollmentId = enrollRes.rows[0].id;

      const amounts = splitInstallments(totalNum, count);
      for (let i = 0; i < amounts.length; i++) {
        await client.query(
          `INSERT INTO course_installments (enrollment_id, installment_number, amount, status)
           VALUES ($1, $2, $3, 'PENDING')`,
          [enrollmentId, i + 1, amounts[i]]
        );
      }

      const actualEnrolled = await this.syncProjectActualEnrolled(client, project_id);

      await client.query('COMMIT');

      const enrollment = await this.findById(enrollmentId);
      return { enrollment, actual_enrolled: actualEnrolled };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async delete(id) {
    const existingRes = await db.query(
      'SELECT id, project_id FROM course_enrollments WHERE id = $1',
      [id]
    );
    if (existingRes.rows.length === 0) return null;

    const projectId = existingRes.rows[0].project_id;
    await db.query('DELETE FROM course_enrollments WHERE id = $1', [id]);
    const actualEnrolled = await this.syncProjectActualEnrolled(db, projectId);

    return { id, project_id: projectId, actual_enrolled: actualEnrolled };
  }

  async settleEnrollment(id, { paid_at, payment_method = null, notes } = {}) {
    const existing = await this.findById(id);
    if (!existing) return null;

    const paidAtDate = formatDateStr(paid_at) || new Date().toISOString().slice(0, 10);
    const params = [paidAtDate, payment_method || null, id];
    let notesClause = '';
    if (notes !== undefined) {
      notesClause = ', notes = $4';
      params.push(notes || null);
    }

    const updateRes = await db.query(
      `UPDATE course_installments
       SET status = 'PAID', paid_at = $1, payment_method = $2${notesClause}, updated_at = NOW()
       WHERE enrollment_id = $3 AND status = 'PENDING'
       RETURNING id`,
      params
    );

    const enrollment = await this.findById(id);
    return { enrollment, settled_count: updateRes.rowCount };
  }

  async findInstallmentById(installmentId) {
    const res = await db.query(
      `SELECT id, enrollment_id, installment_number, amount, status, paid_at, payment_method, notes, created_at, updated_at
       FROM course_installments
       WHERE id = $1`,
      [installmentId]
    );
    if (res.rows.length === 0) return null;
    return mapInstallmentRow(res.rows[0]);
  }

  async payInstallment(installmentId, { amount, paid_at, payment_method = null, notes } = {}) {
    const existing = await this.findInstallmentById(installmentId);
    if (!existing) return null;

    const paidAtDate = formatDateStr(paid_at) || new Date().toISOString().slice(0, 10);
    const nextAmount =
      amount !== undefined && amount !== null && amount !== ''
        ? Number(Number(amount).toFixed(2))
        : existing.amount;
    const nextNotes = notes !== undefined ? (notes || null) : existing.notes;

    const res = await db.query(
      `UPDATE course_installments
       SET status = 'PAID', amount = $1, paid_at = $2, payment_method = $3, notes = $4, updated_at = NOW()
       WHERE id = $5
       RETURNING id, enrollment_id, installment_number, amount, status, paid_at, payment_method, notes, created_at, updated_at`,
      [nextAmount, paidAtDate, payment_method || null, nextNotes, installmentId]
    );

    if (amount !== undefined && amount !== null && amount !== '') {
      await this.recalculateEnrollmentTotal(db, existing.enrollment_id);
    }

    const installment = mapInstallmentRow(res.rows[0]);
    const enrollment = await this.findById(existing.enrollment_id);
    return { installment, enrollment };
  }

  async unpayInstallment(installmentId) {
    const existing = await this.findInstallmentById(installmentId);
    if (!existing) return null;

    const res = await db.query(
      `UPDATE course_installments
       SET status = 'PENDING', paid_at = NULL, payment_method = NULL, updated_at = NOW()
       WHERE id = $1
       RETURNING id, enrollment_id, installment_number, amount, status, paid_at, payment_method, notes, created_at, updated_at`,
      [installmentId]
    );

    const installment = mapInstallmentRow(res.rows[0]);
    const enrollment = await this.findById(existing.enrollment_id);
    return { installment, enrollment };
  }

  async updateInstallment(installmentId, { amount, notes } = {}) {
    const existing = await this.findInstallmentById(installmentId);
    if (!existing) return null;

    const nextAmount = Number(Number(amount).toFixed(2));
    const nextNotes = notes !== undefined ? (notes || null) : existing.notes;

    const res = await db.query(
      `UPDATE course_installments
       SET amount = $1, notes = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING id, enrollment_id, installment_number, amount, status, paid_at, payment_method, notes, created_at, updated_at`,
      [nextAmount, nextNotes, installmentId]
    );

    await this.recalculateEnrollmentTotal(db, existing.enrollment_id);

    const installment = mapInstallmentRow(res.rows[0]);
    const enrollment = await this.findById(existing.enrollment_id);
    return { installment, enrollment };
  }
}

module.exports = new CourseEnrollmentRepository();
module.exports.splitInstallments = splitInstallments;
