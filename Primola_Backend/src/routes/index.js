const express = require('express');
const router = express.Router();
const authRoutes = require('./auth');
const reportsRoutes = require('./reports');
const studentsRoutes = require('./students');
const attendancesRoutes = require('./attendances');
const usersRoutes = require('./users');
const projectsRoutes = require('./projects');
const afterschoolRoutes = require('./afterschool');
const settingsRoutes = require('./settings');

// Endpoint di test
router.get('/health', (req, res) => res.json({ status: 'ok' }));

// Monta i vari router
router.use('/auth', authRoutes);
router.use('/reports', reportsRoutes);
router.use('/students', studentsRoutes);
router.use('/attendances', attendancesRoutes);
router.use('/users', usersRoutes);
router.use('/projects', projectsRoutes);
router.use('/afterschool', afterschoolRoutes);
router.use('/settings', settingsRoutes);

module.exports = router;
