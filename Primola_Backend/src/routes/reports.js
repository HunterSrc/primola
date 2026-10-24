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
// Accessibile ad ADMIN e OFFICE
router.get('/attendances', verifyToken, requireRole(['ADMIN', 'OFFICE']), reportController.getDailyReport);

/**
 * @swagger
 * /api/reports/mensa:
 *   get:
 *     summary: Ottieni il report mensile della mensa
 *     description: Restituisce pasti consegnati regolari, pasti extra, pasti previsti stimati e dettaglio giornaliero/per studente per anno e mese. Riservato agli ADMIN.
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *           example: 2026
 *         required: true
 *         description: Anno di riferimento (YYYY)
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *           example: 10
 *         required: true
 *         description: Mese di riferimento (1-12)
 *     responses:
 *       200:
 *         description: Report mensa generato con successo
 *       400:
 *         description: Parametri mancanti o non validi
 */
router.get('/mensa', verifyToken, requireRole(['ADMIN', 'OFFICE']), reportController.getMensaReport);

// Report mensile per anno e mese
router.get('/monthly', verifyToken, requireRole(['ADMIN', 'OFFICE']), reportController.getMonthlyReport);

// Aggiorna presenze pagate mensili per gli studenti
router.put('/monthly-plans', verifyToken, requireRole(['ADMIN', 'OFFICE']), reportController.saveMonthlyPlans);

// Report Commesse e Ore Docenti
router.get('/projects', verifyToken, requireRole(['ADMIN', 'OFFICE']), reportController.getProjectsReport);

// Report Finanziario Mensile (Solo ADMIN)
router.get('/financial-monthly', verifyToken, requireRole(['ADMIN']), reportController.getFinancialMonthlyReport);

// Report Operativo Mensile (ADMIN e OFFICE)
router.get('/operational-monthly', verifyToken, requireRole(['ADMIN', 'OFFICE']), reportController.getOperationalMonthlyReport);

module.exports = router;
