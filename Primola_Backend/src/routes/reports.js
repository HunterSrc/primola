const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');
const reportController = require('../controllers/reportController');

/**
 * @swagger
 * /api/reports/attendances:
 *   get:
 *     summary: Ottieni il report delle presenze giornaliere
 *     description: Restituisce statistiche aggregate e assenze ingiustificate per una data specifica. Riservato agli ADMIN.
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           example: "2026-04-28"
 *         required: true
 *         description: Data per il report nel formato YYYY-MM-DD
 *     responses:
 *       200:
 *         description: Report generato con successo
 *       400:
 *         description: Parametro 'date' mancante o formato non valido
 *       401:
 *         description: Accesso negato (Token mancante o non valido)
 *       403:
 *         description: Utente non autorizzato (Richiesto ruolo ADMIN)
 */
// Solo gli ADMIN possono accedere al report giornaliero
router.get('/attendances', verifyToken, requireRole(['ADMIN']), reportController.getDailyReport);

// Report mensa per range di date
router.get('/mensa', verifyToken, requireRole(['ADMIN']), reportController.getMensaReport);

// Report mensile per anno e mese
router.get('/monthly', verifyToken, requireRole(['ADMIN']), reportController.getMonthlyReport);

module.exports = router;
