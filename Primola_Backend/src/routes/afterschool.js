const express = require('express');
const router = express.Router();
const afterschoolController = require('../controllers/afterschoolController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

router.use(verifyToken);

/**
 * Vista settimanale doposcuola (Lun-Ven):
 * Accessibile a ADMIN, OFFICE e TEACHER (sola lettura per i teacher)
 */
router.get('/week-summary', requireRole(['ADMIN', 'OFFICE', 'TEACHER', 'STAFF']), (req, res) => afterschoolController.getWeekSummary(req, res));

/**
 * Rotte di gestione e amministrazione: SOLO ADMIN e OFFICE
 */
const requireAdminOrOffice = requireRole(['ADMIN', 'OFFICE']);

// Assegnazioni contrattuali doposcuola
router.get('/assignments', requireAdminOrOffice, (req, res) => afterschoolController.listAssignments(req, res));
router.get('/assignments/:userId', requireAdminOrOffice, (req, res) => afterschoolController.getAssignmentByUser(req, res));
router.post('/assignments', requireAdminOrOffice, (req, res) => afterschoolController.assignAfterschool(req, res));
router.delete('/assignments/:userId', requireAdminOrOffice, (req, res) => afterschoolController.removeAssignment(req, res));

// Turni e orari lavorativi dei docenti
router.post('/shifts', requireAdminOrOffice, (req, res) => afterschoolController.createShift(req, res));
router.put('/shifts/:id', requireAdminOrOffice, (req, res) => afterschoolController.updateShift(req, res));
router.delete('/shifts/:id', requireAdminOrOffice, (req, res) => afterschoolController.deleteShift(req, res));

// Date di chiusura straordinarie:
// GET aperta a tutti (Admin, Office, Teacher)
router.get('/closures', requireRole(['ADMIN', 'OFFICE', 'TEACHER', 'STAFF']), (req, res) => afterschoolController.listClosures(req, res));
// POST e DELETE riservate SOLO ad ADMIN
router.post('/closures', requireRole(['ADMIN']), (req, res) => afterschoolController.createClosure(req, res));
router.delete('/closures/:id', requireRole(['ADMIN']), (req, res) => afterschoolController.deleteClosure(req, res));

module.exports = router;

