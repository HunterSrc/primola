const db = require('../config/database');

const formatDateStr = (val) => {
  if (val === undefined) return undefined;
  if (val === null || val === '') return null;
  if (typeof val === 'string') return val.slice(0, 10);
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  return String(val).slice(0, 10);
};

const computeCardStatus = (possiedeTessera, dataScadenzaTessera) => {
  const hasCard = Boolean(possiedeTessera);
  const expiryStr = formatDateStr(dataScadenzaTessera);

  if (!hasCard) {
    return { card_status: 'NESSUNA_TESSERA', days_to_expiry: null };
  }

  if (!expiryStr) {
    return { card_status: 'VALIDA', days_to_expiry: null };
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const [ty, tm, td] = todayStr.split('-').map(Number);
  const [ey, em, ed] = expiryStr.split('-').map(Number);
  const todayUtc = Date.UTC(ty, tm - 1, td);
  const expiryUtc = Date.UTC(ey, em - 1, ed);
  const daysToExpiry = Math.round((expiryUtc - todayUtc) / 86400000);

  let cardStatus = 'VALIDA';
  if (daysToExpiry < 0) {
    cardStatus = 'SCADUTA';
  } else if (daysToExpiry <= 30) {
    cardStatus = 'IN_SCADENZA';
  }

  return { card_status: cardStatus, days_to_expiry: daysToExpiry };
};

const mapStudentRow = (row, extra = {}) => {
  const data_nascita = formatDateStr(row.data_nascita);
  const data_scadenza_tessera = formatDateStr(row.data_scadenza_tessera);
  const possiede_tessera = Boolean(row.possiede_tessera);
  const { card_status, days_to_expiry } = computeCardStatus(possiede_tessera, data_scadenza_tessera);

  return {
    id: row.id,
    nome: row.nome,
    cognome: row.cognome,
    email: row.email || null,
    telefono: row.telefono || null,
    data_nascita,
    luogo_nascita: row.luogo_nascita || null,
    indirizzo_residenza: row.indirizzo_residenza || null,
    citta_residenza: row.citta_residenza || null,
    possiede_tessera,
    data_scadenza_tessera,
    card_status,
    days_to_expiry,
    created_at: row.created_at,
    updated_at: row.updated_at,
    ...extra
  };
};

class CourseStudentRepository {
  async findAll({ search = '', card_status = '' } = {}) {
    const studentsRes = await db.query(
      `SELECT id, nome, cognome, email, telefono, data_nascita, luogo_nascita,
              indirizzo_residenza, citta_residenza, possiede_tessera, data_scadenza_tessera,
              created_at, updated_at
       FROM course_students
       ORDER BY cognome ASC, nome ASC`
    );

    const enrollmentsCountRes = await db.query(
      `SELECT course_student_id, COUNT(*)::int AS enrollments_count
       FROM course_enrollments
       GROUP BY course_student_id`
    );

    const remainingRes = await db.query(
      `SELECT ce.course_student_id, COALESCE(SUM(ci.amount), 0)::numeric AS remaining_amount
       FROM course_enrollments ce
       JOIN course_installments ci ON ci.enrollment_id = ce.id
       WHERE ci.status = 'PENDING'
       GROUP BY ce.course_student_id`
    );

    const countMap = new Map();
    for (const r of enrollmentsCountRes.rows) {
      countMap.set(r.course_student_id, parseInt(r.enrollments_count, 10) || 0);
    }

    const remainingMap = new Map();
    for (const r of remainingRes.rows) {
      remainingMap.set(r.course_student_id, Number(Number(r.remaining_amount || 0).toFixed(2)));
    }

    let list = studentsRes.rows.map((row) =>
      mapStudentRow(row, {
        enrollments_count: countMap.get(row.id) || 0,
        remaining_amount: remainingMap.get(row.id) || 0
      })
    );

    const searchTrimmed = String(search || '').trim().toLowerCase();
    if (searchTrimmed) {
      list = list.filter((s) => {
        const haystack = [
          s.nome,
          s.cognome,
          `${s.nome} ${s.cognome}`,
          `${s.cognome} ${s.nome}`,
          s.email,
          s.telefono,
          s.citta_residenza
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(searchTrimmed);
      });
    }

    const summary = {
      total: list.length,
      valid: 0,
      expiring_soon: 0,
      expired: 0,
      no_card: 0
    };

    for (const s of list) {
      if (s.card_status === 'VALIDA') summary.valid++;
      else if (s.card_status === 'IN_SCADENZA') summary.expiring_soon++;
      else if (s.card_status === 'SCADUTA') summary.expired++;
      else summary.no_card++;
    }

    const statusFilter = String(card_status || '').trim().toUpperCase();
    if (statusFilter && statusFilter !== 'ALL') {
      list = list.filter((s) => s.card_status === statusFilter);
    }

    return { students: list, summary };
  }

  async findById(id) {
    const res = await db.query(
      `SELECT id, nome, cognome, email, telefono, data_nascita, luogo_nascita,
              indirizzo_residenza, citta_residenza, possiede_tessera, data_scadenza_tessera,
              created_at, updated_at
       FROM course_students
       WHERE id = $1`,
      [id]
    );
    if (res.rows.length === 0) return null;
    return mapStudentRow(res.rows[0]);
  }

  async create(data) {
    const possiedeTessera = Boolean(data.possiede_tessera);
    const dataScadenza = possiedeTessera ? formatDateStr(data.data_scadenza_tessera) || null : null;

    const res = await db.query(
      `INSERT INTO course_students (
         nome, cognome, email, telefono, data_nascita, luogo_nascita,
         indirizzo_residenza, citta_residenza, possiede_tessera, data_scadenza_tessera
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, nome, cognome, email, telefono, data_nascita, luogo_nascita,
                 indirizzo_residenza, citta_residenza, possiede_tessera, data_scadenza_tessera,
                 created_at, updated_at`,
      [
        data.nome.trim(),
        data.cognome.trim(),
        data.email ? String(data.email).trim() : null,
        data.telefono ? String(data.telefono).trim() : null,
        formatDateStr(data.data_nascita) || null,
        data.luogo_nascita ? String(data.luogo_nascita).trim() : null,
        data.indirizzo_residenza ? String(data.indirizzo_residenza).trim() : null,
        data.citta_residenza ? String(data.citta_residenza).trim() : null,
        possiedeTessera,
        dataScadenza
      ]
    );

    return mapStudentRow(res.rows[0], { enrollments_count: 0, remaining_amount: 0 });
  }

  async update(id, data) {
    const existing = await this.findById(id);
    if (!existing) return null;

    const updates = [];
    const params = [];
    let idx = 1;

    if (data.nome !== undefined) {
      updates.push(`nome = $${idx++}`);
      params.push(String(data.nome).trim());
    }
    if (data.cognome !== undefined) {
      updates.push(`cognome = $${idx++}`);
      params.push(String(data.cognome).trim());
    }
    if (data.email !== undefined) {
      updates.push(`email = $${idx++}`);
      params.push(data.email ? String(data.email).trim() : null);
    }
    if (data.telefono !== undefined) {
      updates.push(`telefono = $${idx++}`);
      params.push(data.telefono ? String(data.telefono).trim() : null);
    }
    if (data.data_nascita !== undefined) {
      updates.push(`data_nascita = $${idx++}`);
      params.push(formatDateStr(data.data_nascita) || null);
    }
    if (data.luogo_nascita !== undefined) {
      updates.push(`luogo_nascita = $${idx++}`);
      params.push(data.luogo_nascita ? String(data.luogo_nascita).trim() : null);
    }
    if (data.indirizzo_residenza !== undefined) {
      updates.push(`indirizzo_residenza = $${idx++}`);
      params.push(data.indirizzo_residenza ? String(data.indirizzo_residenza).trim() : null);
    }
    if (data.citta_residenza !== undefined) {
      updates.push(`citta_residenza = $${idx++}`);
      params.push(data.citta_residenza ? String(data.citta_residenza).trim() : null);
    }

    const nextPossiedeTessera =
      data.possiede_tessera !== undefined ? Boolean(data.possiede_tessera) : existing.possiede_tessera;

    if (data.possiede_tessera !== undefined) {
      updates.push(`possiede_tessera = $${idx++}`);
      params.push(nextPossiedeTessera);
    }
    if (data.data_scadenza_tessera !== undefined || (data.possiede_tessera !== undefined && !nextPossiedeTessera)) {
      const nextExpiry = nextPossiedeTessera
        ? formatDateStr(data.data_scadenza_tessera !== undefined ? data.data_scadenza_tessera : existing.data_scadenza_tessera) || null
        : null;
      updates.push(`data_scadenza_tessera = $${idx++}`);
      params.push(nextExpiry);
    }

    if (updates.length === 0) return existing;

    params.push(id);
    const res = await db.query(
      `UPDATE course_students
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${idx}
       RETURNING id, nome, cognome, email, telefono, data_nascita, luogo_nascita,
                 indirizzo_residenza, citta_residenza, possiede_tessera, data_scadenza_tessera,
                 created_at, updated_at`,
      params
    );

    if (res.rows.length === 0) return null;
    return mapStudentRow(res.rows[0]);
  }

  async delete(id) {
    const affectedRes = await db.query(
      `SELECT DISTINCT project_id FROM course_enrollments WHERE course_student_id = $1`,
      [id]
    );
    const affectedProjectIds = affectedRes.rows.map((r) => r.project_id);

    const res = await db.query('DELETE FROM course_students WHERE id = $1 RETURNING id', [id]);
    if (res.rowCount === 0) return false;

    for (const projectId of affectedProjectIds) {
      const countRes = await db.query(
        'SELECT COUNT(*)::int AS cnt FROM course_enrollments WHERE project_id = $1',
        [projectId]
      );
      const cnt = parseInt(countRes.rows[0]?.cnt || 0, 10);
      await db.query('UPDATE projects SET actual_enrolled = $1, updated_at = NOW() WHERE id = $2', [
        cnt,
        projectId
      ]);
    }

    return true;
  }
}

module.exports = new CourseStudentRepository();
module.exports.computeCardStatus = computeCardStatus;
module.exports.formatDateStr = formatDateStr;
