const courseEnrollmentRepository = require('../repositories/courseEnrollmentRepository');
const courseStudentRepository = require('../repositories/courseStudentRepository');
const projectRepository = require('../repositories/projectRepository');
const { sendSuccess, sendError } = require('../utils/responseFormat');

class CourseEnrollmentController {
  async listEnrollments(req, res) {
    try {
      const {
        project_id = '',
        course_student_id = '',
        payment_status = '',
        search = ''
      } = req.query;

      const result = await courseEnrollmentRepository.findAll({
        project_id,
        course_student_id,
        payment_status,
        search
      });
      return sendSuccess(res, 200, result);
    } catch (error) {
      console.error('Errore in listEnrollments:', error);
      return sendError(res, 500, 'Errore nel recupero delle iscrizioni ai corsi.');
    }
  }

  async createEnrollment(req, res) {
    try {
      const {
        course_student_id,
        project_id,
        total_amount,
        installments_count = 1,
        enrolled_at,
        notes
      } = req.body || {};

      if (!course_student_id || !project_id) {
        return sendError(res, 400, 'course_student_id e project_id sono obbligatori.');
      }

      const parsedCount = Number(installments_count);
      if (!Number.isInteger(parsedCount) || parsedCount < 1 || parsedCount > 4) {
        return sendError(res, 400, 'installments_count deve essere un intero compreso tra 1 e 4.');
      }

      const student = await courseStudentRepository.findById(course_student_id);
      if (!student) {
        return sendError(res, 404, 'Allievo corso non trovato.');
      }

      const project = await projectRepository.findById(project_id);
      if (!project) {
        return sendError(res, 404, 'Corso/commessa non trovato.');
      }

      const resolvedAmount =
        total_amount === undefined || total_amount === null || total_amount === ''
          ? Number(project.enrollment_fee || 0)
          : Number(total_amount);

      if (!Number.isFinite(resolvedAmount) || resolvedAmount < 0) {
        return sendError(res, 400, 'total_amount non valido (deve essere >= 0).');
      }

      const duplicate = await courseEnrollmentRepository.findDuplicate(course_student_id, project_id);
      if (duplicate) {
        return sendError(res, 409, 'Allievo già iscritto a questo corso.');
      }

      const { enrollment, actual_enrolled } = await courseEnrollmentRepository.create({
        course_student_id,
        project_id,
        total_amount: resolvedAmount,
        installments_count: parsedCount,
        enrolled_at,
        notes
      });

      const maxEnrolled = parseInt(project.max_enrolled || 0, 10);
      const overCapacity = maxEnrolled > 0 && actual_enrolled > maxEnrolled;

      return sendSuccess(res, 201, {
        enrollment,
        over_capacity: overCapacity,
        actual_enrolled,
        max_enrolled: maxEnrolled
      });
    } catch (error) {
      if (error && error.code === '23505') {
        return sendError(res, 409, 'Allievo già iscritto a questo corso.');
      }
      console.error('Errore in createEnrollment:', error);
      return sendError(res, 500, 'Errore nella creazione dell\'iscrizione al corso.');
    }
  }

  async deleteEnrollment(req, res) {
    try {
      const { id } = req.params;
      const result = await courseEnrollmentRepository.delete(id);
      if (!result) {
        return sendError(res, 404, 'Iscrizione non trovata.');
      }

      return sendSuccess(res, 200, {
        message: 'Iscrizione eliminata con successo.',
        project_id: result.project_id,
        actual_enrolled: result.actual_enrolled
      });
    } catch (error) {
      console.error('Errore in deleteEnrollment:', error);
      return sendError(res, 500, 'Errore nell\'eliminazione dell\'iscrizione.');
    }
  }

  async settleEnrollment(req, res) {
    try {
      const { id } = req.params;
      const { paid_at, payment_method, notes } = req.body || {};

      const result = await courseEnrollmentRepository.settleEnrollment(id, {
        paid_at,
        payment_method,
        notes
      });
      if (!result) {
        return sendError(res, 404, 'Iscrizione non trovata.');
      }

      return sendSuccess(res, 200, result);
    } catch (error) {
      console.error('Errore in settleEnrollment:', error);
      return sendError(res, 500, 'Errore nel saldo dell\'iscrizione.');
    }
  }

  async payInstallment(req, res) {
    try {
      const { installmentId } = req.params;
      const { amount, paid_at, payment_method, notes } = req.body || {};

      if (amount !== undefined && amount !== null && amount !== '') {
        const parsedAmount = Number(amount);
        if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
          return sendError(res, 400, 'Importo rata non valido (deve essere >= 0).');
        }
      }

      const result = await courseEnrollmentRepository.payInstallment(installmentId, {
        amount,
        paid_at,
        payment_method,
        notes
      });
      if (!result) {
        return sendError(res, 404, 'Rata non trovata.');
      }

      return sendSuccess(res, 200, result);
    } catch (error) {
      console.error('Errore in payInstallment:', error);
      return sendError(res, 500, 'Errore nella registrazione del pagamento della rata.');
    }
  }

  async unpayInstallment(req, res) {
    try {
      const { installmentId } = req.params;
      const result = await courseEnrollmentRepository.unpayInstallment(installmentId);
      if (!result) {
        return sendError(res, 404, 'Rata non trovata.');
      }

      return sendSuccess(res, 200, result);
    } catch (error) {
      console.error('Errore in unpayInstallment:', error);
      return sendError(res, 500, 'Errore nell\'annullamento del pagamento della rata.');
    }
  }

  async updateInstallment(req, res) {
    try {
      const { installmentId } = req.params;
      const { amount, notes } = req.body || {};

      const existing = await courseEnrollmentRepository.findInstallmentById(installmentId);
      if (!existing) {
        return sendError(res, 404, 'Rata non trovata.');
      }

      if (existing.status !== 'PENDING') {
        return sendError(res, 400, 'Non è possibile modificare una rata già pagata.');
      }

      const parsedAmount = Number(amount);
      if (amount === undefined || amount === null || amount === '' || !Number.isFinite(parsedAmount) || parsedAmount < 0) {
        return sendError(res, 400, 'Importo rata obbligatorio e deve essere >= 0.');
      }

      const result = await courseEnrollmentRepository.updateInstallment(installmentId, {
        amount: parsedAmount,
        notes
      });

      return sendSuccess(res, 200, result);
    } catch (error) {
      console.error('Errore in updateInstallment:', error);
      return sendError(res, 500, 'Errore nell\'aggiornamento della rata.');
    }
  }
}

module.exports = new CourseEnrollmentController();
