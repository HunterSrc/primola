const settingsRepository = require('../repositories/settingsRepository');
const { sendSuccess, sendError } = require('../utils/responseFormat');

class SettingsController {
  /**
   * GET /api/settings
   * Recupera impostazioni di sistema
   */
  async getSettings(req, res) {
    try {
      const list = await settingsRepository.getAll();
      const map = await settingsRepository.getSettingsMap();
      return sendSuccess(res, 200, {
        list,
        settings: map
      });
    } catch (error) {
      console.error('Errore getSettings:', error);
      return sendError(res, 500, 'Errore nel recupero delle impostazioni.');
    }
  }

  /**
   * PUT /api/settings
   * Aggiorna impostazioni di sistema (solo ADMIN)
   */
  async updateSettings(req, res) {
    try {
      const payload = req.body;
      if (!payload || typeof payload !== 'object') {
        return sendError(res, 400, 'Payload non valido.');
      }
      const updated = await settingsRepository.updateSettings(payload);
      const map = await settingsRepository.getSettingsMap();
      return sendSuccess(res, 200, {
        message: 'Impostazioni aggiornate con successo.',
        updated,
        settings: map
      });
    } catch (error) {
      console.error('Errore updateSettings:', error);
      return sendError(res, 500, 'Errore nel salvataggio delle impostazioni.');
    }
  }
}

module.exports = new SettingsController();
