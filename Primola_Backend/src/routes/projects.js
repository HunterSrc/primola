const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

router.use(verifyToken);

// Lista commesse (accessibile a tutti gli autenticati)
router.get('/', projectController.listProjects);

// Dettaglio commessa con docenti
router.get('/:id', projectController.getProject);

// Creazione commessa (ADMIN e OFFICE)
router.post('/', requireRole(['ADMIN', 'OFFICE']), projectController.createProject);

// Modifica commessa (ADMIN e OFFICE)
router.put('/:id', requireRole(['ADMIN', 'OFFICE']), projectController.updateProject);

// Eliminazione commessa (solo ADMIN)
router.delete('/:id', requireRole(['ADMIN']), projectController.deleteProject);

// Assegnazione docente a commessa con hourly_rate e assigned_hours (ADMIN e OFFICE)
router.post('/:id/teachers', requireRole(['ADMIN', 'OFFICE']), projectController.assignTeacher);

// Rimozione docente da commessa (ADMIN e OFFICE)
router.delete('/:id/teachers/:userId', requireRole(['ADMIN', 'OFFICE']), projectController.removeTeacher);

module.exports = router;
