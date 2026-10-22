const studentRepository = require('../../src/repositories/studentRepository');
const db = require('../../src/config/database');

jest.mock('../../src/config/database');

describe('studentRepository unit tests', () => {
  let mockClient;

  beforeEach(() => {
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    db.getPool = jest.fn().mockReturnValue({
      connect: jest.fn().mockResolvedValue(mockClient)
    });
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  describe('getStudentsWithTutors', () => {
    it('should query active students with tutors and return rows', async () => {
      const mockStudents = [{ id: 1, first_name: 'Mario', last_name: 'Rossi', tutors: [] }];
      db.query = jest.fn().mockResolvedValue({ rows: mockStudents });

      const result = await studentRepository.getStudentsWithTutors();

      expect(result).toEqual(mockStudents);
    });

    it('should throw if query fails', async () => {
      db.query = jest.fn().mockRejectedValue(new Error('DB read error'));

      await expect(studentRepository.getStudentsWithTutors()).rejects.toThrow('DB read error');
    });
  });

  describe('createStudentWithTutors', () => {
    it('should insert student and associated tutors inside transaction', async () => {
      const studentData = {
        first_name: 'Luca',
        last_name: 'Verdi',
        giorni_abbonamento: [1, 2, 3]
      };
      const tutorsData = [
        { first_name: 'P', last_name: 'V', phone: '123', email: 'pv@test.com', is_main_contact: true, relationship: 'Padre' },
        { first_name: 'M', last_name: 'V' } // second tutor without phone
      ];

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 25 }] }) // INSERT student RETURNING id
        .mockResolvedValueOnce({ rows: [{ id: 101 }] }) // INSERT tutor 1
        .mockResolvedValueOnce({ rows: [{ id: 102 }] }) // INSERT tutor 2
        .mockResolvedValueOnce({}); // COMMIT

      const result = await studentRepository.createStudentWithTutors(studentData, tutorsData);

      expect(result.student_id).toBe(25);
      expect(result.tutors.length).toBe(2);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should insert student without tutors when tutors list is empty or null', async () => {
      const studentData = { first_name: 'Solo', last_name: 'Student' };

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 30 }] }) // INSERT student
        .mockResolvedValueOnce({}); // COMMIT

      const result = await studentRepository.createStudentWithTutors(studentData, null);

      expect(result.student_id).toBe(30);
      expect(result.tutors).toEqual([]);
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should rollback transaction if student insertion fails', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockRejectedValueOnce(new Error('Insert student failed'));

      await expect(studentRepository.createStudentWithTutors({ first_name: 'A', last_name: 'B' }, []))
        .rejects.toThrow('Insert student failed');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('getStudentById', () => {
    it('should return null if student row does not exist', async () => {
      db.query = jest.fn().mockResolvedValueOnce({ rows: [] });

      const result = await studentRepository.getStudentById('non-existent');
      expect(result).toBeNull();
    });

    it('should return student with associated tutors if found', async () => {
      const studentRow = { id: 's1', nome: 'Sofia', cognome: 'Ferrari' };
      const tutorRows = [{ id: 't1', student_id: 's1', nome: 'Elena' }];

      db.query = jest.fn()
        .mockResolvedValueOnce({ rows: [studentRow] })
        .mockResolvedValueOnce({ rows: tutorRows });

      const result = await studentRepository.getStudentById('s1');

      expect(result.id).toBe('s1');
      expect(result.tutors).toEqual(tutorRows);
    });

    it('should throw if query fails in getStudentById', async () => {
      db.query = jest.fn().mockRejectedValue(new Error('DB read error'));

      await expect(studentRepository.getStudentById('s1')).rejects.toThrow('DB read error');
    });
  });

  describe('updateStudentWithTutors', () => {
    it('should rollback and return null if student id not found', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [] }); // UPDATE returned 0 rows

      const result = await studentRepository.updateStudentWithTutors('999', { first_name: 'A', last_name: 'B' }, []);

      expect(result).toBeNull();
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should update student and replace tutors successfully', async () => {
      const updatedStudent = { id: 's1', nome: 'Alessandro', cognome: 'Manzoni' };
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [updatedStudent] }) // UPDATE student
        .mockResolvedValueOnce({}) // DELETE FROM tutors
        .mockResolvedValueOnce({ rows: [{ id: 't1' }] }) // INSERT tutor 1 (explicit is_main_contact: false)
        .mockResolvedValueOnce({ rows: [{ id: 't2' }] }) // INSERT tutor 2 (defaults index 0: true)
        .mockResolvedValueOnce({}); // COMMIT

      const tutors = [
        { first_name: 'Pietro', last_name: 'Manzoni', phone: '123', email: 'p@m.it', is_main_contact: false },
        { first_name: 'Giulia', last_name: 'Beccaria', phone: '456' }
      ];

      const result = await studentRepository.updateStudentWithTutors('s1', { first_name: 'Alessandro', last_name: 'Manzoni' }, tutors);

      expect(result.student).toEqual(updatedStudent);
      expect(result.tutors.length).toBe(2);
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should update student without touching tutors if tutorsList is not provided', async () => {
      const updatedStudent = { id: 's1', nome: 'Alessandro', cognome: 'Manzoni' };
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [updatedStudent] }) // UPDATE student
        .mockResolvedValueOnce({}); // COMMIT

      const result = await studentRepository.updateStudentWithTutors('s1', { first_name: 'Alessandro', last_name: 'Manzoni' }, null);

      expect(result.student).toEqual(updatedStudent);
      expect(result.tutors).toEqual([]);
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should rollback transaction if error occurs during update', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockRejectedValueOnce(new Error('Update failed'));

      await expect(studentRepository.updateStudentWithTutors('s1', { first_name: 'A', last_name: 'B' }, []))
        .rejects.toThrow('Update failed');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});
