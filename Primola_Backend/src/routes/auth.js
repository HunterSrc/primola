const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Autenticazione utente (Email & Password)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: admin@primola.it
 *               password:
 *                 type: string
 *                 example: AdminPrimola2026!
 *     responses:
 *       200:
 *         description: Login effettuato con successo con token e refresh token
 *       401:
 *         description: Credenziali errate
 */
router.post('/login', authController.login);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh del token di accesso
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Nuova coppia di token generata
 *       401:
 *         description: Refresh token scaduto o invalido
 */
router.post('/refresh', authController.refresh);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Recupera profilo dell'utente autenticato
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profilo utente
 *       401:
 *         description: Non autenticato
 */
router.get('/me', verifyToken, authController.getMe);

module.exports = router;
