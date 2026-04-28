const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * /api/attendances/expected:
 *   get:
 *     summary: Ottieni gli studenti attesi per una certa data
 *     tags: [Attendances]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           example: "2026-04-28"
 *     responses:
 *       200:
 *         description: Array di studenti attesi
 */
router.get('/expected', verifyToken, requireRole(['ADMIN', 'STAFF']), attendanceController.getExpected);

/**
 * @swagger
 * /api/attendances/bulk:
 *   post:
 *     summary: Inserisci o aggiorna un array di presenze in modalità Upsert
 *     tags: [Attendances]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *               properties:
 *                 student_id:
 *                   type: string
 *                 date:
 *                   type: string
 *                 is_present:
 *                   type: boolean
 *                 is_absent_justified:
 *                   type: boolean
 *                 canteen_used:
 *                   type: boolean
 *                 is_extra:
 *                   type: boolean
 *     responses:
 *       200:
 *         description: Operazione bulk completata
 */
router.post('/bulk', verifyToken, requireRole(['ADMIN', 'STAFF']), attendanceController.bulkUpsert);

module.exports = router;
