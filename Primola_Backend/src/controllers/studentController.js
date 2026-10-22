const studentRepository = require('../repositories/studentRepository');
const { sendSuccess, sendError } = require('../utils/responseFormat');

exports.getAllStudents = async (req, res, next) => {
  try {
    const students = await studentRepository.getStudentsWithTutors();
    return sendSuccess(res, 200, students);
  } catch (error) {
    next(error);
  }
};

exports.createStudent = async (req, res, next) => {
  const { student, tutors } = req.body;

  if (!student || !student.first_name || !student.last_name) {
    return sendError(res, 400, "I campi 'first_name' e 'last_name' dello studente sono obbligatori.");
  }

  try {
    const result = await studentRepository.createStudentWithTutors(student, tutors);
    return sendSuccess(res, 201, result);
  } catch (error) {
    next(error);
  }
};

exports.getStudentById = async (req, res, next) => {
  const { id } = req.params;
  try {
    const student = await studentRepository.getStudentById(id);
    if (!student) {
      return sendError(res, 404, 'Studente non trovato.');
    }
    return sendSuccess(res, 200, student);
  } catch (error) {
    next(error);
  }
};

exports.updateStudent = async (req, res, next) => {
  const { id } = req.params;
  const { student, tutors } = req.body;

  if (!student || !student.first_name || !student.last_name) {
    return sendError(res, 400, "I campi 'first_name' e 'last_name' dello studente sono obbligatori.");
  }

  try {
    const result = await studentRepository.updateStudentWithTutors(id, student, tutors);
    if (!result) {
      return sendError(res, 404, 'Studente non trovato.');
    }
    return sendSuccess(res, 200, result);
  } catch (error) {
    next(error);
  }
};
