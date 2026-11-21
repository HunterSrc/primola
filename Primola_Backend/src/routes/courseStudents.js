const express = require('express');
const router = express.Router();
const courseStudentController = require('../controllers/courseStudentController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

router.use(verifyToken);
router.use(requireRole(['ADMIN', 'OFFICE']));

router.get('/', courseStudentController.listCourseStudents);
router.get('/:id', courseStudentController.getCourseStudentById);
router.post('/', courseStudentController.createCourseStudent);
router.put('/:id', courseStudentController.updateCourseStudent);
router.delete('/:id', courseStudentController.deleteCourseStudent);

module.exports = router;
