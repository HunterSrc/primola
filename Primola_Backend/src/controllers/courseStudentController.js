const courseStudentRepository = require('../repositories/courseStudentRepository');
const courseEnrollmentRepository = require('../repositories/courseEnrollmentRepository');
const { sendSuccess, sendError } = require('../utils/responseFormat');

class CourseStudentController {
  async listCourseStudents(req, res) {
    try {
      const { search = '', card_status = '' } = req.query;
      const result = await courseStudentRepository.findAll({ search, card_status });
      return sendSuccess(res, 200, result);
    } catch (error) {
      console.error('Errore in listCourseStudents:', error);
      return sendError(res, 500, 'Errore nel recupero degli allievi dei corsi.');
    }
  }

  async getCourseStudentById(req, res) {
    try {
      const { id } = req.params;
      const student = await courseStudentRepository.findById(id);
      if (!student) {
        return sendError(res, 404, 'Allievo corso non trovato.');
      }

      const { enrollments, summary } = await courseEnrollmentRepository.findAll({
        course_student_id: id
      });

      return sendSuccess(res, 200, {
        ...student,
        enrollments_count: enrollments.length,
        remaining_amount: summary.total_remaining,
        enrollments
      });
    } catch (error) {
      console.error('Errore in getCourseStudentById:', error);
      return sendError(res, 500, 'Errore nel recupero del dettaglio allievo corso.');
    }
  }

  async createCourseStudent(req, res) {
    try {
      const { nome, cognome } = req.body || {};
      if (!nome || !String(nome).trim() || !cognome || !String(cognome).trim()) {
        return sendError(res, 400, 'Nome e cognome sono obbligatori.');
      }

      const created = await courseStudentRepository.create(req.body);
      return sendSuccess(res, 201, created);
    } catch (error) {
      console.error('Errore in createCourseStudent:', error);
      return sendError(res, 500, 'Errore nella creazione dell\'allievo corso.');
    }
  }

  async updateCourseStudent(req, res) {
    try {
      const { id } = req.params;
      const { nome, cognome } = req.body || {};

      if (nome !== undefined && !String(nome).trim()) {
        return sendError(res, 400, 'Il nome non può essere vuoto.');
      }
      if (cognome !== undefined && !String(cognome).trim()) {
        return sendError(res, 400, 'Il cognome non può essere vuoto.');
      }

      const updated = await courseStudentRepository.update(id, req.body);
      if (!updated) {
        return sendError(res, 404, 'Allievo corso non trovato.');
      }

      return sendSuccess(res, 200, updated);
    } catch (error) {
      console.error('Errore in updateCourseStudent:', error);
      return sendError(res, 500, 'Errore nell\'aggiornamento dell\'allievo corso.');
    }
  }

  async deleteCourseStudent(req, res) {
    try {
      const { id } = req.params;
      const deleted = await courseStudentRepository.delete(id);
      if (!deleted) {
        return sendError(res, 404, 'Allievo corso non trovato.');
      }

      return sendSuccess(res, 200, { message: 'Allievo corso eliminato con successo.' });
    } catch (error) {
      console.error('Errore in deleteCourseStudent:', error);
      return sendError(res, 500, 'Errore nell\'eliminazione dell\'allievo corso.');
    }
  }
}

module.exports = new CourseStudentController();
