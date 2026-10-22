const studentController = require('../../src/controllers/studentController');
const studentRepository = require('../../src/repositories/studentRepository');

jest.mock('../../src/repositories/studentRepository');

describe('studentController unit tests', () => {
  let mockReq;
  let mockRes;
  let nextFn;

  beforeEach(() => {
    mockReq = {
      body: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    nextFn = jest.fn();
  });

  describe('getAllStudents', () => {
    it('should return 200 with students list on success', async () => {
      const mockList = [{ id: 1, first_name: 'Mario', last_name: 'Rossi' }];
      studentRepository.getStudentsWithTutors.mockResolvedValue(mockList);

      await studentController.getAllStudents(mockReq, mockRes, nextFn);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockList,
        error: null
      });
    });

    it('should forward error to next() on repository failure', async () => {
      const err = new Error('DB Error');
      studentRepository.getStudentsWithTutors.mockRejectedValue(err);

      await studentController.getAllStudents(mockReq, mockRes, nextFn);
      expect(nextFn).toHaveBeenCalledWith(err);
    });
  });

  describe('createStudent', () => {
    it('should return 400 if student data is missing or incomplete', async () => {
      mockReq.body = { student: { first_name: 'OnlyFirstName' } };

      await studentController.createStudent(mockReq, mockRes, nextFn);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: "I campi 'first_name' e 'last_name' dello studente sono obbligatori."
      }));
    });

    it('should return 201 with created student on valid payload', async () => {
      const studentPayload = { first_name: 'Luca', last_name: 'Verdi' };
      const tutorsPayload = [{ first_name: 'Mario', last_name: 'Verdi', phone: '+39 123' }];
      mockReq.body = { student: studentPayload, tutors: tutorsPayload };

      const created = { id: 10, ...studentPayload };
      studentRepository.createStudentWithTutors.mockResolvedValue(created);

      await studentController.createStudent(mockReq, mockRes, nextFn);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: created,
        error: null
      });
    });

    it('should call next(err) if repository rejects', async () => {
      mockReq.body = { student: { first_name: 'A', last_name: 'B' } };
      const err = new Error('Constraint Violation');
      studentRepository.createStudentWithTutors.mockRejectedValue(err);

      await studentController.createStudent(mockReq, mockRes, nextFn);
      expect(nextFn).toHaveBeenCalledWith(err);
    });
  });

  describe('getStudentById', () => {
    it('should return 404 if student not found', async () => {
      mockReq.params = { id: '999' };
      studentRepository.getStudentById.mockResolvedValue(null);

      await studentController.getStudentById(mockReq, mockRes, nextFn);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: 'Studente non trovato.'
      }));
    });

    it('should return 200 with student details on success', async () => {
      mockReq.params = { id: '1' };
      const studentData = { id: '1', nome: 'Mario', cognome: 'Rossi', tutors: [] };
      studentRepository.getStudentById.mockResolvedValue(studentData);

      await studentController.getStudentById(mockReq, mockRes, nextFn);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: studentData,
        error: null
      });
    });

    it('should call next(err) if repository rejects in getStudentById', async () => {
      mockReq.params = { id: '1' };
      const err = new Error('Query error');
      studentRepository.getStudentById.mockRejectedValue(err);

      await studentController.getStudentById(mockReq, mockRes, nextFn);
      expect(nextFn).toHaveBeenCalledWith(err);
    });
  });

  describe('updateStudent', () => {
    it('should return 400 if student first_name or last_name is missing', async () => {
      mockReq.params = { id: '1' };
      mockReq.body = { student: { first_name: 'SoloNome' } };

      await studentController.updateStudent(mockReq, mockRes, nextFn);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: "I campi 'first_name' e 'last_name' dello studente sono obbligatori."
      }));
    });

    it('should return 404 if student to update is not found', async () => {
      mockReq.params = { id: '999' };
      mockReq.body = { student: { first_name: 'Nome', last_name: 'Cognome' } };
      studentRepository.updateStudentWithTutors.mockResolvedValue(null);

      await studentController.updateStudent(mockReq, mockRes, nextFn);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: 'Studente non trovato.'
      }));
    });

    it('should return 200 with updated student on success', async () => {
      mockReq.params = { id: '1' };
      mockReq.body = {
        student: { first_name: 'Mario', last_name: 'Rossi' },
        tutors: [{ first_name: 'G', last_name: 'R', phone: '123' }]
      };
      const updatedData = { student: { id: '1', nome: 'Mario' }, tutors: [] };
      studentRepository.updateStudentWithTutors.mockResolvedValue(updatedData);

      await studentController.updateStudent(mockReq, mockRes, nextFn);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: updatedData,
        error: null
      });
    });

    it('should call next(err) if repository throws in updateStudent', async () => {
      mockReq.params = { id: '1' };
      mockReq.body = { student: { first_name: 'Mario', last_name: 'Rossi' } };
      const err = new Error('Update error');
      studentRepository.updateStudentWithTutors.mockRejectedValue(err);

      await studentController.updateStudent(mockReq, mockRes, nextFn);
      expect(nextFn).toHaveBeenCalledWith(err);
    });
  });
});
