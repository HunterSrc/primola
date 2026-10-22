const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * /api/students:
 *   get:
 *     summary: Ottieni la lista degli studenti e i relativi tutori
 *     description: Restituisce l'anagrafica degli studenti unita a quella dei tutori. L'accesso è consentito ai ruoli ADMIN e STAFF.
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista degli studenti recuperata con successo
 *       401:
 *         description: Accesso negato (Token mancante o non valido)
 *       403:
 *         description: Utente non autorizzato
 */
router.get('/', verifyToken, requireRole(['ADMIN', 'STAFF']), studentController.getAllStudents);

/**
 * @swagger
 * /api/students:
 *   post:
 *     summary: Crea un nuovo studente e i relativi tutori
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               student:
 *                 type: object
 *                 properties:
 *                   first_name:
 *                     type: string
 *                   last_name:
 *                     type: string
 *                   giorni_abbonamento:
 *                     type: array
 *                     items:
 *                       type: integer
 *               tutors:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     first_name:
 *                       type: string
 *                     last_name:
 *                       type: string
 *                     phone:
 *                       type: string
 *                     email:
 *                       type: string
 *     responses:
 *       201:
 *         description: Studente creato con successo
 */
router.post('/', verifyToken, requireRole(['ADMIN', 'STAFF']), studentController.createStudent);

/**
 * @swagger
 * /api/students/{id}:
 *   get:
 *     summary: Ottieni dettagli di un singolo studente con i suoi tutori
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dettaglio studente recuperato con successo
 *       404:
 *         description: Studente non trovato
 */
router.get('/:id', verifyToken, requireRole(['ADMIN', 'STAFF']), studentController.getStudentById);

/**
 * @swagger
 * /api/students/{id}:
 *   put:
 *     summary: Modifica dati studente e anagrafica tutori
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Studente modificato con successo
 *       404:
 *         description: Studente non trovato
 */
router.put('/:id', verifyToken, requireRole(['ADMIN', 'STAFF']), studentController.updateStudent);

module.exports = router;
