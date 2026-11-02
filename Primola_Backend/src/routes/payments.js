const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

// Accessibile ad ADMIN e OFFICE
router.use(verifyToken);
router.use(requireRole(['ADMIN', 'OFFICE']));

// Prospetto mensile
router.get('/monthly', paymentController.getMonthlyBilling);

// Assegnazione pacchetto a studente
router.post('/assign-tariff', paymentController.assignTariff);

// Rimozione assegnazione pacchetto
router.delete('/tariffs/:assignmentId', paymentController.removeTariff);

// Saldo fine mese extra / pasti
router.post('/settle', paymentController.settleMonthly);

module.exports = router;
