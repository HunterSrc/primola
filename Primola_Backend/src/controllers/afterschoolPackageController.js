const packageRepo = require('../repositories/afterschoolPackageRepository');
const mealTariffRepo = require('../repositories/mealTariffRepository');
const { sendSuccess, sendError } = require('../utils/responseFormat');

class AfterschoolPackageController {
  /**
   * GET /api/afterschool-packages
   * Recupera tutti i pacchetti con tariffa attiva
   */
  async getAllPackages(req, res, next) {
    try {
      const { reference_date } = req.query;
      const packages = await packageRepo.findAllWithActiveTariff(reference_date);
      return sendSuccess(res, 200, packages);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/afterschool-packages/:id/tariffs
   * Recupera lo storico tariffe di un pacchetto
   */
  async getPackageTariffs(req, res, next) {
    try {
      const { id } = req.params;
      const tariffs = await packageRepo.getTariffsByPackageId(id);
      return sendSuccess(res, 200, tariffs);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/afterschool-packages
   * Crea un nuovo pacchetto con tariffa iniziale
   */
  async createPackage(req, res, next) {
    try {
      const { name, code, monthly_days, days_per_week, price, valid_from, valid_to, notes, sort_order } = req.body;

      if (!name || monthly_days === undefined || price === undefined || !valid_from) {
        return sendError(res, 400, 'Parametri obbligatori mancanti (name, monthly_days, price, valid_from)');
      }

      if (Number(monthly_days) < 0 || Number(price) < 0) {
        return sendError(res, 400, 'Valori numerici non validi');
      }

      const created = await packageRepo.createPackageWithTariff({
        name,
        code,
        monthly_days,
        days_per_week,
        price,
        valid_from,
        valid_to: valid_to || '9999-01-01',
        notes,
        sort_order
      });

      return sendSuccess(res, 201, created);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/afterschool-packages/:id
   * Aggiorna info del pacchetto (es. nome, giorni_mensili, is_active)
   */
  async updatePackage(req, res, next) {
    try {
      const { id } = req.params;
      const { name, code, monthly_days, days_per_week, is_active, sort_order } = req.body;

      if (monthly_days !== undefined && Number(monthly_days) < 0) {
        return sendError(res, 400, 'monthly_days deve essere >= 0');
      }

      const updated = await packageRepo.updatePackage(id, {
        name,
        code,
        monthly_days,
        days_per_week,
        is_active,
        sort_order
      });

      if (!updated) {
        return sendError(res, 404, 'Pacchetto non trovato');
      }

      return sendSuccess(res, 200, updated);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/afterschool-packages/tariffs/:tariffId
   * Aggiorna una singola tariffa
   */
  async updateTariff(req, res, next) {
    try {
      const { tariffId } = req.params;
      const { price, valid_from, valid_to, notes } = req.body;

      if (price !== undefined && Number(price) < 0) {
        return sendError(res, 400, 'Prezzo non valido');
      }

      if (valid_from && valid_to && valid_from > valid_to) {
        return sendError(res, 400, 'valid_from non può essere successiva a valid_to');
      }

      const updated = await packageRepo.updateTariff(tariffId, { price, valid_from, valid_to, notes });
      if (!updated) {
        return sendError(res, 404, 'Tariffa non trovata');
      }

      return sendSuccess(res, 200, updated);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/afterschool-packages/:id/transition-tariff
   * Chiude la tariffa corrente a una data e crea la nuova fino al 9999-01-01
   */
  async transitionTariff(req, res, next) {
    try {
      const { id } = req.params;
      const { oldTariffId, oldTariffValidTo, newPrice, newTariffValidFrom, newTariffValidTo, notes } = req.body;

      if (newPrice === undefined || !newTariffValidFrom) {
        return sendError(res, 400, 'newPrice e newTariffValidFrom sono obbligatori');
      }

      if (Number(newPrice) < 0) {
        return sendError(res, 400, 'Il prezzo deve essere >= 0');
      }

      if (oldTariffId && !oldTariffValidTo) {
        return sendError(res, 400, 'oldTariffValidTo è obbligatorio quando oldTariffId è specificato');
      }

      if (oldTariffValidTo && newTariffValidFrom && oldTariffValidTo >= newTariffValidFrom) {
        return sendError(
          res,
          400,
          'La data di fine della vecchia tariffa deve essere precedente alla data di inizio della nuova tariffa'
        );
      }

      const result = await packageRepo.transitionTariff(id, {
        oldTariffId,
        oldTariffValidTo,
        newPrice,
        newTariffValidFrom,
        newTariffValidTo: newTariffValidTo || '9999-01-01',
        notes
      });

      return sendSuccess(res, 200, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/afterschool-packages/meal-tariffs
   * Recupera tariffa mensa attiva e storico completo
   */
  async getMealTariffs(req, res, next) {
    try {
      const { reference_date } = req.query;
      const [active, history] = await Promise.all([
        mealTariffRepo.findActiveTariff(reference_date),
        mealTariffRepo.findAll()
      ]);
      return sendSuccess(res, 200, { active, history });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/afterschool-packages/meal-tariffs/:tariffId
   * Aggiorna una singola voce storica della tariffa mensa
   */
  async updateMealTariff(req, res, next) {
    try {
      const { tariffId } = req.params;
      const { price, valid_from, valid_to, notes } = req.body;

      if (price !== undefined && Number(price) < 0) {
        return sendError(res, 400, 'Il prezzo deve essere >= 0');
      }

      if (valid_from && valid_to && valid_from > valid_to) {
        return sendError(res, 400, 'La data di inizio validità non può essere successiva alla fine validità');
      }

      const updated = await mealTariffRepo.updateTariff(tariffId, {
        price,
        valid_from,
        valid_to,
        notes
      });

      if (!updated) {
        return sendError(res, 404, 'Tariffa mensa non trovata');
      }

      return sendSuccess(res, 200, updated);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/afterschool-packages/meal-tariffs/transition
   * Transizione tariffa mensa (chiude vecchia e attiva nuova)
   */
  async transitionMealTariff(req, res, next) {
    try {
      const {
        old_tariff_id,
        old_valid_to,
        new_price,
        new_valid_from,
        new_valid_to,
        notes
      } = req.body;

      const oldTariffId = old_tariff_id;
      const oldTariffValidTo = old_valid_to;
      const newPrice = new_price;
      const newTariffValidFrom = new_valid_from;
      const newTariffValidTo = new_valid_to;

      if (newPrice === undefined || !newTariffValidFrom) {
        return sendError(res, 400, 'new_price e new_valid_from sono obbligatori');
      }

      if (Number(newPrice) < 0) {
        return sendError(res, 400, 'Il prezzo deve essere >= 0');
      }

      if (oldTariffId && !oldTariffValidTo) {
        return sendError(res, 400, 'old_valid_to è obbligatorio quando old_tariff_id è specificato');
      }

      if (oldTariffValidTo && newTariffValidFrom && oldTariffValidTo >= newTariffValidFrom) {
        return sendError(
          res,
          400,
          'La data di fine della vecchia tariffa deve essere precedente alla data di inizio della nuova tariffa'
        );
      }

      const result = await mealTariffRepo.transitionTariff({
        oldTariffId,
        oldTariffValidTo,
        newPrice,
        newTariffValidFrom,
        newTariffValidTo: newTariffValidTo || '9999-01-01',
        notes
      });

      return sendSuccess(res, 200, result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AfterschoolPackageController();
