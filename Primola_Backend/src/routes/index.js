const express = require('express');
const router = express.Router();
const reportsRoutes = require('./reports');
const studentsRoutes = require('./students');
const attendancesRoutes = require('./attendances');

// Endpoint di test
router.get('/health', (req, res) => res.json({ status: 'ok' }));

// Monta i vari router
router.use('/reports', reportsRoutes);
router.use('/students', studentsRoutes);
router.use('/attendances', attendancesRoutes);

module.exports = router;
