const express = require('express');
const router = express.Router();
const courseEnrollmentController = require('../controllers/courseEnrollmentController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

router.use(verifyToken);
router.use(requireRole(['ADMIN', 'OFFICE']));

router.get('/', courseEnrollmentController.listEnrollments);
router.post('/', courseEnrollmentController.createEnrollment);

router.post('/installments/:installmentId/pay', courseEnrollmentController.payInstallment);
router.post('/installments/:installmentId/unpay', courseEnrollmentController.unpayInstallment);
router.put('/installments/:installmentId', courseEnrollmentController.updateInstallment);

router.post('/:id/settle', courseEnrollmentController.settleEnrollment);
router.delete('/:id', courseEnrollmentController.deleteEnrollment);

module.exports = router;
