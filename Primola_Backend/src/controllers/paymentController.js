const paymentRepo = require('../repositories/paymentRepository');
const { sendSuccess, sendError } = require('../utils/responseFormat');

class PaymentController {
  /**
   * GET /api/payments/monthly?year=YYYY&month=MM
   * Prospetto mensile studenti con tariffe, copertura, presenze, extra e pasti
   */
  async getMonthlyBilling(req, res, next) {
    try {
      const { year, month } = req.query;
      if (!year || !month) {
        return sendError(res, 400, 'Parametri year e month obbligatori');
      }

      const y = parseInt(year, 10);
      const m = parseInt(month, 10);
      if (isNaN(y) || isNaN(m) || m < 1 || m > 12) {
        return sendError(res, 400, 'Valori year o month non validi');
      }

      const billing = await paymentRepo.getMonthlyStudentBilling(y, m);
      return sendSuccess(res, 200, billing);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/payments/assign-tariff
   * Assegna un pacchetto a uno studente per il mese/anno
   */
  async assignTariff(req, res, next) {
    try {
      const { student_id, year, month, package_id, notes } = req.body;

      if (!student_id || !year || !month || !package_id) {
        return sendError(res, 400, 'Parametri obbligatori mancanti (student_id, year, month, package_id)');
      }

      const assigned = await paymentRepo.assignTariffToStudent({
        student_id,
        year,
        month,
        package_id,
        notes
      });

      return sendSuccess(res, 201, assigned);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/payments/tariffs/:assignmentId
   * Rimuove un pacchetto assegnato
   */
  async removeTariff(req, res, next) {
    try {
      const { assignmentId } = req.params;
      const removed = await paymentRepo.removeStudentTariff(assignmentId);
      if (!removed) {
        return sendError(res, 404, 'Assegnazione non trovata');
      }
      return sendSuccess(res, 200, removed);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/payments/settle
   * Salda extra e/o pasti a fine mese
   */
  async settleMonthly(req, res, next) {
    try {
      const { student_id, year, month, settle_extra, settle_meals, payment_method, notes } = req.body;

      if (!student_id || !year || !month) {
        return sendError(res, 400, 'Parametri student_id, year e month obbligatori');
      }

      const result = await paymentRepo.settleMonthlyExtrasAndMeals({
        student_id,
        year,
        month,
        settle_extra: !!settle_extra,
        settle_meals: !!settle_meals,
        payment_method: payment_method || null,
        notes
      });

      return sendSuccess(res, 200, result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PaymentController();
