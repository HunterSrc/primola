const db = require('../config/database');

class ProjectRepository {
  /**
   * Lista tutte le commesse con conteggio docenti assegnati e totali ore
   */
  async findAll() {
    const query = `
      SELECT p.id, p.title, p.type, p.enrollment_fee, p.max_enrolled, p.start_date, p.end_date,
             p.description, p.location, p.created_at, p.updated_at,
             COUNT(DISTINCT pt.user_id)::int AS teachers_count,
             COALESCE(
               json_agg(
                 json_build_object(
                   'user_id', u.id,
                   'first_name', COALESCE(u.first_name, u.nome),
                   'last_name', COALESCE(u.last_name, u.cognome)
                 )
               ) FILTER (WHERE u.id IS NOT NULL),
               '[]'
             ) AS teachers,
             COALESCE(SUM(pt.assigned_hours), 0)::numeric AS total_assigned_hours,
             COALESCE(SUM(pt.assigned_hours * pt.hourly_rate), 0)::numeric AS total_cost
      FROM projects p
      LEFT JOIN project_teachers pt ON p.id = pt.project_id
      LEFT JOIN users u ON pt.user_id = u.id
      GROUP BY p.id
      ORDER BY p.title ASC
    `;
    const result = await db.query(query);
    return result.rows;
  }

  /**
   * Cerca una commessa per ID
   */
  async findById(id) {
    const query = `
      SELECT p.id, p.title, p.type, p.enrollment_fee, p.max_enrolled, p.start_date, p.end_date,
             p.description, p.location, p.created_at, p.updated_at
      FROM projects p
      WHERE p.id = $1
    `;
    const result = await db.query(query, [id]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Crea una nuova commessa/corso
   */
  async create({ title, description, location, type = 'CORSO', enrollment_fee = 0, max_enrolled = 0, start_date = null, end_date = null }) {
    const query = `
      INSERT INTO projects (title, description, location, type, enrollment_fee, max_enrolled, start_date, end_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, title, description, location, type, enrollment_fee, max_enrolled, start_date, end_date, created_at, updated_at
    `;
    const result = await db.query(query, [
      title.trim(),
      description || null,
      location || null,
      (type || 'CORSO').toUpperCase().trim(),
      enrollment_fee !== undefined && enrollment_fee !== null ? Number(enrollment_fee) : 0,
      max_enrolled !== undefined && max_enrolled !== null ? Number(max_enrolled) : 0,
      start_date || null,
      end_date || null
    ]);
    return result.rows[0];
  }

  /**
   * Aggiorna una commessa/corso esistente
   */
  async update(id, { title, description, location, type, enrollment_fee, max_enrolled, start_date, end_date }) {
    const updates = [];
    const params = [];
    let idx = 1;

    if (title !== undefined) {
      updates.push(`title = $${idx++}`);
      params.push(title.trim());
    }
    if (description !== undefined) {
      updates.push(`description = $${idx++}`);
      params.push(description);
    }
    if (location !== undefined) {
      updates.push(`location = $${idx++}`);
      params.push(location);
    }
    if (type !== undefined) {
      updates.push(`type = $${idx++}`);
      params.push((type || 'CORSO').toUpperCase().trim());
    }
    if (enrollment_fee !== undefined) {
      updates.push(`enrollment_fee = $${idx++}`);
      params.push(enrollment_fee !== null ? Number(enrollment_fee) : 0);
    }
    if (max_enrolled !== undefined) {
      updates.push(`max_enrolled = $${idx++}`);
      params.push(max_enrolled !== null ? Number(max_enrolled) : 0);
    }
    if (start_date !== undefined) {
      updates.push(`start_date = $${idx++}`);
      params.push(start_date || null);
    }
    if (end_date !== undefined) {
      updates.push(`end_date = $${idx++}`);
      params.push(end_date || null);
    }

    if (updates.length === 0) return await this.findById(id);

    params.push(id);
    const query = `
      UPDATE projects
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = $${idx}
      RETURNING id, title, description, location, type, enrollment_fee, max_enrolled, start_date, end_date, created_at, updated_at
    `;
    const result = await db.query(query, params);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Elimina una commessa
   */
  async delete(id) {
    const result = await db.query('DELETE FROM projects WHERE id = $1 RETURNING id', [id]);
    return result.rowCount > 0;
  }

  /**
   * Docenti assegnati a una commessa
   */
  async getTeachersByProject(projectId) {
    const query = `
      SELECT pt.project_id, pt.user_id, pt.hourly_rate, pt.assigned_hours,
             u.email,
             COALESCE(u.first_name, u.nome) AS first_name,
             COALESCE(u.last_name, u.cognome) AS last_name,
             u.phone
      FROM project_teachers pt
      JOIN users u ON pt.user_id = u.id
      WHERE pt.project_id = $1
      ORDER BY COALESCE(u.last_name, u.cognome) ASC, COALESCE(u.first_name, u.nome) ASC
    `;
    const result = await db.query(query, [projectId]);
    return result.rows;
  }

  /**
   * Commesse assegnate a un determinato utente/docente
   */
  async getProjectsByUser(userId) {
    const query = `
      SELECT pt.project_id, pt.user_id, pt.hourly_rate, pt.assigned_hours,
             p.title, p.description, p.location
      FROM project_teachers pt
      JOIN projects p ON pt.project_id = p.id
      WHERE pt.user_id = $1
      ORDER BY p.title ASC
    `;
    const result = await db.query(query, [userId]);
    return result.rows;
  }

  /**
   * Assegna o aggiorna docente su una commessa
   */
  async assignTeacher(projectId, userId, hourlyRate = null, assignedHours = null) {
    const query = `
      INSERT INTO project_teachers (project_id, user_id, hourly_rate, assigned_hours)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (project_id, user_id) 
      DO UPDATE SET 
        hourly_rate = EXCLUDED.hourly_rate,
        assigned_hours = EXCLUDED.assigned_hours,
        updated_at = NOW()
      RETURNING project_id, user_id, hourly_rate, assigned_hours, updated_at
    `;
    const result = await db.query(query, [
      projectId,
      userId,
      hourlyRate !== null && hourlyRate !== undefined ? Number(hourlyRate) : null,
      assignedHours !== null && assignedHours !== undefined ? Number(assignedHours) : null
    ]);
    return result.rows[0];
  }

  /**
   * Rimuove associazione docente da commessa
   */
  async removeTeacher(projectId, userId) {
    const query = 'DELETE FROM project_teachers WHERE project_id = $1 AND user_id = $2 RETURNING project_id';
    const result = await db.query(query, [projectId, userId]);
    return result.rowCount > 0;
  }

  /**
   * Genera dati per report commesse aggregate
   */
  async getProjectsReportData() {
    const query = `
      SELECT p.id AS project_id, p.title, p.location,
             pt.user_id,
             COALESCE(u.first_name, u.nome) AS first_name,
             COALESCE(u.last_name, u.cognome) AS last_name,
             u.email,
             pt.hourly_rate,
             pt.assigned_hours,
             (COALESCE(pt.hourly_rate, 0) * COALESCE(pt.assigned_hours, 0)) AS total_cost
      FROM projects p
      LEFT JOIN project_teachers pt ON p.id = pt.project_id
      LEFT JOIN users u ON pt.user_id = u.id
      ORDER BY p.title ASC, COALESCE(u.last_name, u.cognome) ASC
    `;
    const result = await db.query(query);
    return result.rows;
  }
}

module.exports = new ProjectRepository();
