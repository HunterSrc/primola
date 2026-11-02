const express = require('express');
const router = express.Router();
const packageController = require('../controllers/afterschoolPackageController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

// Solo ADMIN ha accesso alla configurazione pacchetti e tariffe
router.use(verifyToken);
router.use(requireRole(['ADMIN']));

// Lista pacchetti e tariffa attiva
router.get('/', packageController.getAllPackages);

// Storico tariffe pacchetto
router.get('/:id/tariffs', packageController.getPackageTariffs);

// Creazione nuovo pacchetto con tariffa iniziale
router.post('/', packageController.createPackage);

// Modifica pacchetto
router.put('/:id', packageController.updatePackage);

// Modifica singola tariffa
router.put('/tariffs/:tariffId', packageController.updateTariff);

// Transizione tariffa (chiude vecchia e attiva nuova fino a 9999-01-01)
router.post('/:id/transition-tariff', packageController.transitionTariff);

module.exports = router;
