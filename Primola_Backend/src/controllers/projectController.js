const projectRepository = require('../repositories/projectRepository');
const userRepository = require('../repositories/userRepository');
const { sendSuccess, sendError } = require('../utils/responseFormat');
const { sanitizeTeacherSensitiveData } = require('../middlewares/authMiddleware');

/**
 * Controller per la gestione delle Commesse (projects) e assegnazione docenti
 */
class ProjectController {
  /**
   * GET /api/projects
   * Lista commesse
   */
  async listProjects(req, res) {
    try {
      const projects = await projectRepository.findAll();
      const sanitized = sanitizeTeacherSensitiveData(req, projects);
      return sendSuccess(res, 200, sanitized);
    } catch (error) {
      console.error('Errore in listProjects:', error);
      return sendError(res, 500, 'Errore nel recupero delle commesse.');
    }
  }

  /**
   * GET /api/projects/:id
   * Dettaglio commessa con docenti associati
   */
  async getProject(req, res) {
    try {
      const { id } = req.params;
      const project = await projectRepository.findById(id);
      if (!project) {
        return sendError(res, 404, 'Commessa non trovata.');
      }

      let teachers = await projectRepository.getTeachersByProject(id);
      teachers = sanitizeTeacherSensitiveData(req, teachers);

      return sendSuccess(res, 200, {
        ...project,
        teachers
      });
    } catch (error) {
      console.error('Errore in getProject:', error);
      return sendError(res, 500, 'Errore nel recupero del dettaglio commessa.');
    }
  }

  /**
   * POST /api/projects
   * Creazione commessa/corso (ADMIN e OFFICE)
   */
  async createProject(req, res) {
    try {
      const { title, description, location, type, enrollment_fee, max_enrolled, actual_enrolled, start_date, end_date } = req.body;
      if (!title || !title.trim()) {
        return sendError(res, 400, 'Il titolo del corso/commessa è obbligatorio.');
      }

      const created = await projectRepository.create({
        title,
        description,
        location,
        type,
        enrollment_fee,
        max_enrolled,
        actual_enrolled,
        start_date,
        end_date
      });
      return sendSuccess(res, 201, created);
    } catch (error) {
      console.error('Errore in createProject:', error);
      return sendError(res, 500, 'Errore nella creazione della commessa.');
    }
  }

  /**
   * PUT /api/projects/:id
   * Modifica commessa/corso (ADMIN e OFFICE)
   */
  async updateProject(req, res) {
    try {
      const { id } = req.params;
      const { title, description, location, type, enrollment_fee, max_enrolled, actual_enrolled, start_date, end_date } = req.body;

      const updated = await projectRepository.update(id, {
        title,
        description,
        location,
        type,
        enrollment_fee,
        max_enrolled,
        actual_enrolled,
        start_date,
        end_date
      });
      if (!updated) {
        return sendError(res, 404, 'Commessa non trovata.');
      }

      return sendSuccess(res, 200, updated);
    } catch (error) {
      console.error('Errore in updateProject:', error);
      return sendError(res, 500, 'Errore nell\'aggiornamento della commessa.');
    }
  }

  /**
   * DELETE /api/projects/:id
   * Eliminazione commessa (solo ADMIN)
   */
  async deleteProject(req, res) {
    try {
      const userGroups = req.user.groups || [];
      if (!userGroups.includes('ADMIN')) {
        return sendError(res, 403, 'Solo gli amministratori possono eliminare commesse.');
      }

      const { id } = req.params;
      const deleted = await projectRepository.delete(id);
      if (!deleted) {
        return sendError(res, 404, 'Commessa non trovata.');
      }

      return sendSuccess(res, 200, { message: 'Commessa eliminata con successo.' });
    } catch (error) {
      console.error('Errore in deleteProject:', error);
      return sendError(res, 500, 'Errore nell\'eliminazione della commessa.');
    }
  }

  /**
   * POST /api/projects/:id/teachers
   * Assegna docente a commessa con tariffa e ore (ADMIN e OFFICE)
   */
  async assignTeacher(req, res) {
    try {
      const { id } = req.params;
      const { user_id, hourly_rate, assigned_hours } = req.body;

      if (!user_id) {
        return sendError(res, 400, 'user_id obbligatorio per l\'assegnazione.');
      }

      const user = await userRepository.findById(user_id);
      if (!user) {
        return sendError(res, 404, 'Docente/Utente non trovato.');
      }

      const assignment = await projectRepository.assignTeacher(
        id,
        user_id,
        hourly_rate !== undefined ? hourly_rate : null,
        assigned_hours !== undefined ? assigned_hours : null
      );

      return sendSuccess(res, 200, assignment);
    } catch (error) {
      console.error('Errore in assignTeacher:', error);
      return sendError(res, 500, 'Errore nell\'assegnazione del docente alla commessa.');
    }
  }

  /**
   * DELETE /api/projects/:id/teachers/:userId
   * Rimuove associazione docente (ADMIN e OFFICE)
   */
  async removeTeacher(req, res) {
    try {
      const { id, userId } = req.params;
      const removed = await projectRepository.removeTeacher(id, userId);
      if (!removed) {
        return sendError(res, 404, 'Associazione non trovata.');
      }

      return sendSuccess(res, 200, { message: 'Docente rimosso dalla commessa con successo.' });
    } catch (error) {
      console.error('Errore in removeTeacher:', error);
      return sendError(res, 500, 'Errore nella rimozione del docente dalla commessa.');
    }
  }
}

module.exports = new ProjectController();
