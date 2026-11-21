import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ApiService } from './api.service';
import { HttpClient, HttpParams } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import {
  AttendanceRecord,
  Student,
  User,
  Project,
  AfterschoolPackage,
  AfterschoolExpenseCategory
} from '../models';

describe('ApiService', () => {
  let service: ApiService;
  let mockHttp: any;

  beforeEach(() => {
    mockHttp = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        ApiService,
        { provide: HttpClient, useValue: mockHttp }
      ]
    });

    service = TestBed.inject(ApiService);
  });

  // ==================== STUDENTS ====================
  describe('getStudents', () => {
    it('should map students from API response with array giorni_abbonamento', () => {
      const backendStudents = [
        {
          student_id: 10,
          student_first_name: 'Giulia',
          student_last_name: 'Bianchi',
          scuola: 'Scuola Rodari',
          giorni_abbonamento: [1, 3],
          tutor_first_name: 'Mario',
          tutor_last_name: 'Bianchi',
          tutor_phone: '+39 123',
          tutor_email: 'mario@test.com',
          pasti_settimanali: 3,
          data_nascita: '2015-05-01',
          luogo_nascita: 'Roma'
        }
      ];
      mockHttp.get.mockReturnValue(of({ success: true, data: backendStudents }));

      let result: Student[] | undefined;
      service.getStudents().subscribe(res => { result = res; });

      expect(result).toBeDefined();
      expect(result![0].id).toBe(10);
      expect(result![0].first_name).toBe('Giulia');
      expect(result![0].school).toBe('Scuola Rodari');
      expect(result![0].sub_lun).toBe(true);
      expect(result![0].sub_mar).toBe(false);
      expect(result![0].sub_mer).toBe(true);
      expect(result![0].sub_gio).toBe(false);
      expect(result![0].sub_ven).toBe(false);
      expect(result![0].weekly_meals).toBe(3);
      expect(result![0].main_tutor_name).toBe('Mario Bianchi');
      expect(result![0].main_tutor_phone).toBe('+39 123');
      expect(result![0].main_tutor_email).toBe('mario@test.com');
      expect(result![0].birth_date).toBe('2015-05-01');
      expect(result![0].birth_place).toBe('Roma');
      expect(mockHttp.get).toHaveBeenCalledWith('/api/students');
    });

    it('should map students with string giorni_abbonamento and fallback field names', () => {
      const backendStudents = [
        {
          id: 12,
          first_name: 'Luca',
          last_name: 'Verdi',
          school: 'Scuola Verdi',
          classe: '3B',
          allergeni_note: 'Latte',
          vaccinazioni_note: 'Ok',
          birth_date: '2016-01-01',
          birth_place: 'Milano',
          created_at: '2026-01-01',
          giorni_abbonamento: '2,4,5',
          weekly_meals: 2,
          main_tutor_name: 'Anna Verdi',
          main_tutor_phone: '111',
          main_tutor_email: 'anna@verdi.it'
        }
      ];
      mockHttp.get.mockReturnValue(of({ success: true, data: backendStudents }));

      let result: Student[] | undefined;
      service.getStudents().subscribe(res => { result = res; });

      expect(result![0].id).toBe(12);
      expect(result![0].first_name).toBe('Luca');
      expect(result![0].class_section).toBe('3B');
      expect(result![0].allergies_notes).toBe('Latte');
      expect(result![0].vaccinations_notes).toBe('Ok');
      expect(result![0].sub_lun).toBe(false);
      expect(result![0].sub_mar).toBe(true);
      expect(result![0].sub_gio).toBe(true);
      expect(result![0].sub_ven).toBe(true);
      expect(result![0].weekly_meals).toBe(2);
      expect(result![0].main_tutor_name).toBe('Anna Verdi');
    });

    it('should handle default fallback values when fields are missing', () => {
      const backendStudents = [
        {
          id: 99
        }
      ];
      mockHttp.get.mockReturnValue(of({ success: true, data: backendStudents }));

      let result: Student[] | undefined;
      service.getStudents().subscribe(res => { result = res; });

      expect(result![0].school).toBe('Non specificata');
      expect(result![0].class_section).toBe('');
      expect(result![0].sub_lun).toBe(true); // default [1,2,3,4,5]
      expect(result![0].weekly_meals).toBe(0);
      expect(result![0].main_tutor_email).toBe('');
    });

    it('should handle empty or non-array data from API', () => {
      mockHttp.get.mockReturnValue(of({ success: true, data: null }));
      let result: Student[] | undefined;
      service.getStudents().subscribe(res => { result = res; });
      expect(result).toEqual([]);
    });

    it('should fallback to mock students when API fails', () => {
      mockHttp.get.mockReturnValue(throwError(() => new Error('Network error')));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      let result: Student[] | undefined;
      service.getStudents().subscribe(res => { result = res; });

      expect(result).toBeDefined();
      expect(result!.length).toBeGreaterThan(0);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  describe('getStudentById', () => {
    it('should map single student details from API response with full tutors and dates', () => {
      const backendStudent = {
        id: 's-10',
        nome: 'Sofia',
        cognome: 'Ferrari',
        scuola: 'Scuola Manzoni',
        classe: '2A',
        allergeni_note: 'Polline',
        vaccinazioni_note: 'In regola',
        data_nascita: '2016-02-15T00:00:00.000Z',
        luogo_nascita: 'Bologna',
        residenza: 'Via Roma',
        giorni_abbonamento: [1, 3, 5],
        pasti_settimanali: 3,
        tutors: [
          {
            id: 't-1',
            student_id: 's-10',
            nome: 'Elena',
            cognome: 'Ferrari',
            telefono: '+39 123',
            email: 'e@f.it',
            is_main_contact: true,
            relationship: 'Madre'
          }
        ]
      };
      mockHttp.get.mockReturnValue(of({ success: true, data: backendStudent }));

      let result: Student | null | undefined;
      service.getStudentById('s-10').subscribe(res => { result = res; });

      expect(result).toBeDefined();
      expect(result?.first_name).toBe('Sofia');
      expect(result?.last_name).toBe('Ferrari');
      expect(result?.birth_date).toBe('2016-02-15');
      expect(result?.sub_lun).toBe(true);
      expect(result?.sub_mar).toBe(false);
      expect(result?.sub_mer).toBe(true);
      expect(result?.weekly_meals).toBe(3);
      expect(result?.main_tutor_name).toBe('Elena Ferrari');
      expect(result?.main_tutor_phone).toBe('+39 123');
      expect(mockHttp.get).toHaveBeenCalledWith('/api/students/s-10');
    });

    it('should map student with alternative property names and no main tutor', () => {
      const backendStudent = {
        first_name: 'Marco',
        last_name: 'Neri',
        school: 'Scuola Nord',
        class_section: '1C',
        allergies_notes: 'None',
        vaccinations_notes: 'None',
        birth_date: '2017-03-04',
        birth_place: 'Torino',
        residence: 'Via Po',
        weekly_meals: 1,
        tutors: [
          {
            first_name: 'Piero',
            last_name: 'Neri',
            phone: '555',
            is_main: false,
            note: 'Zio'
          }
        ]
      };
      mockHttp.get.mockReturnValue(of({ success: true, data: backendStudent }));

      let result: Student | null | undefined;
      service.getStudentById('s-20').subscribe(res => { result = res; });

      expect(result?.id).toBe('s-20');
      expect(result?.first_name).toBe('Marco');
      expect(result?.main_tutor_name).toBeUndefined();
      expect(result?.tutors?.[0].relationship).toBe('Zio');
      expect(result?.sub_lun).toBe(true); // default [1,2,3,4,5]
    });

    it('should map student with non-array tutors and empty data_nascita', () => {
      const backendStudent = {
        id: 's-30',
        tutors: null,
        data_nascita: null
      };
      mockHttp.get.mockReturnValue(of({ success: true, data: backendStudent }));

      let result: Student | null | undefined;
      service.getStudentById('s-30').subscribe(res => { result = res; });

      expect(result?.tutors).toEqual([]);
      expect(result?.birth_date).toBe('');
      expect(result?.residence).toBe('');
    });

    it('should handle tutor with neither phone nor relationship', () => {
      const backendStudent = {
        id: 's-40',
        tutors: [
          {
            id: 't-3',
            first_name: 'Tutor',
            last_name: 'NoPhoneNoRel'
          }
        ]
      };
      mockHttp.get.mockReturnValue(of({ success: true, data: backendStudent }));

      let result: Student | null | undefined;
      service.getStudentById('s-40').subscribe(res => { result = res; });

      expect(result?.tutors?.[0].phone).toBe('');
      expect(result?.tutors?.[0].relationship).toBe('Genitore');
    });

    it('should return null when API returns null data', () => {
      mockHttp.get.mockReturnValue(of({ success: true, data: null }));

      let result: Student | null | undefined;
      service.getStudentById('s-999').subscribe(res => { result = res; });

      expect(result).toBeNull();
    });

    it('should fallback to mock student when found in mock on API failure', () => {
      mockHttp.get.mockReturnValue(throwError(() => new Error('Server down')));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      let result: Student | null | undefined;
      service.getStudentById(1).subscribe(res => { result = res; });

      expect(result).toBeDefined();
      expect(result?.id).toBe(1);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should fallback to null when id not found in mock on API failure', () => {
      mockHttp.get.mockReturnValue(throwError(() => new Error('Server down')));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      let result: Student | null | undefined;
      service.getStudentById(9999).subscribe(res => { result = res; });

      expect(result).toBeNull();
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  describe('createStudent', () => {
    it('should map payload and return created student on success with all days and tutors', () => {
      const studentData: Partial<Student> = {
        first_name: 'Mario',
        last_name: 'Rossi',
        school: 'Scuola Test',
        class_section: '1A',
        allergies_notes: 'None',
        vaccinations_notes: 'Ok',
        birth_date: '2015-01-01',
        birth_place: 'Roma',
        residence: 'Via Test',
        sub_lun: true,
        sub_mar: true,
        sub_mer: true,
        sub_gio: true,
        sub_ven: true,
        weekly_meals: 5,
        tutors: [
          { first_name: 'P', last_name: 'R', phone: '123', email: 'p@r.com', is_main: true, relationship: 'Padre' },
          { first_name: 'M', last_name: 'R', phone: '456' } // is_main undefined (idx=1 -> false), relationship undefined
        ]
      };
      mockHttp.post.mockReturnValue(of({ success: true, data: { student_id: 101 } }));

      let result: Student | undefined;
      service.createStudent(studentData).subscribe(res => { result = res; });

      expect(result?.id).toBe(101);
      expect(result?.first_name).toBe('Mario');
      expect(result?.weekly_meals).toBe(5);
      expect(mockHttp.post).toHaveBeenCalledWith('/api/students', expect.objectContaining({
        student: expect.objectContaining({
          first_name: 'Mario',
          giorni_abbonamento: [1, 2, 3, 4, 5],
          pasti_settimanali: 5
        }),
        tutors: expect.arrayContaining([
          expect.objectContaining({ is_main_contact: true, relationship: 'Padre' }),
          expect.objectContaining({ is_main_contact: false, relationship: 'Genitore' })
        ])
      }));
    });

    it('should handle undefined weekly_meals in createStudent payload', () => {
      const studentData: Partial<Student> = {
        first_name: 'NoMeals'
      };
      mockHttp.post.mockReturnValue(of({ success: true, data: { student_id: 202 } }));

      let result: Student | undefined;
      service.createStudent(studentData).subscribe(res => { result = res; });

      expect(result?.weekly_meals).toBe(0);
      expect(mockHttp.post).toHaveBeenCalledWith('/api/students', expect.objectContaining({
        student: expect.objectContaining({ pasti_settimanali: 0 })
      }));
    });

    it('should handle NaN weekly_meals and fallback random student_id when missing in response', () => {
      const studentData: Partial<Student> = {
        first_name: 'Carlo',
        weekly_meals: 'invalid' as any
      };
      mockHttp.post.mockReturnValue(of({ success: true, data: {} }));

      let result: Student | undefined;
      service.createStudent(studentData).subscribe(res => { result = res; });

      expect(result?.id).toBeDefined();
      expect(typeof result?.id).toBe('number');
      expect(result?.weekly_meals).toBe(0);
    });

    it('should fallback to mock simulation when create fails (with valid weekly_meals)', () => {
      const studentData: Partial<Student> = { first_name: 'Mario', last_name: 'Rossi', weekly_meals: 3 };
      mockHttp.post.mockReturnValue(throwError(() => new Error('Server down')));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      let result: Student | undefined;
      service.createStudent(studentData).subscribe(res => { result = res; });

      expect(result).toBeDefined();
      expect(result?.first_name).toBe('Mario');
      expect(result?.weekly_meals).toBe(3);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should fallback to mock simulation when create fails (with NaN weekly_meals)', () => {
      const studentData: Partial<Student> = { first_name: 'Mario', last_name: 'Rossi', weekly_meals: 'abc' as any };
      mockHttp.post.mockReturnValue(throwError(() => new Error('Server down')));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      let result: Student | undefined;
      service.createStudent(studentData).subscribe(res => { result = res; });

      expect(result).toBeDefined();
      expect(result?.first_name).toBe('Mario');
      expect(result?.weekly_meals).toBe(0);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  describe('updateStudent', () => {
    it('should send PUT request and return updated student on success', () => {
      const updateData: Partial<Student> = {
        first_name: 'Sofia Modificata',
        last_name: 'Ferrari',
        school: 'Scuola B',
        class_section: '3C',
        allergies_notes: 'None',
        vaccinations_notes: 'Done',
        birth_date: '2016-01-01',
        birth_place: 'Milano',
        residence: 'Via Roma',
        sub_lun: true,
        sub_mar: false,
        sub_mer: true,
        sub_gio: false,
        sub_ven: true,
        weekly_meals: 3,
        tutors: [
          { first_name: 'E', last_name: 'F', phone: '123', email: 'e@f.it', is_main: true, relationship: 'Madre' }
        ]
      };
      mockHttp.put.mockReturnValue(of({ success: true, data: { student: { id: 's-10' } } }));

      let result: Student | undefined;
      service.updateStudent('s-10', updateData).subscribe(res => { result = res; });

      expect(result?.id).toBe('s-10');
      expect(result?.first_name).toBe('Sofia Modificata');
      expect(result?.weekly_meals).toBe(3);
      expect(mockHttp.put).toHaveBeenCalledWith('/api/students/s-10', expect.objectContaining({
        student: expect.objectContaining({
          giorni_abbonamento: [1, 3, 5],
          pasti_settimanali: 3
        })
      }));
    });

    it('should map sub_mar and sub_gio and default tutor fields', () => {
      const updateData: Partial<Student> = {
        sub_mar: true,
        sub_gio: true,
        tutors: [
          { first_name: 'T1', last_name: 'L1', phone: '111' }, // email undefined -> '', is_main undefined (idx 0 -> true), relationship undefined -> 'Genitore'
          { first_name: 'T2', last_name: 'L2', phone: '222' }  // is_main undefined (idx 1 -> false)
        ]
      };
      mockHttp.put.mockReturnValue(of({ success: true, data: {} }));

      let result: Student | undefined;
      service.updateStudent('s-11', updateData).subscribe(res => { result = res; });

      expect(mockHttp.put).toHaveBeenCalledWith('/api/students/s-11', expect.objectContaining({
        student: expect.objectContaining({
          giorni_abbonamento: [2, 4]
        }),
        tutors: expect.arrayContaining([
          expect.objectContaining({ email: '', is_main_contact: true, relationship: 'Genitore' }),
          expect.objectContaining({ is_main_contact: false })
        ])
      }));
    });

    it('should handle undefined and NaN weekly_meals in updateStudent', () => {
      const updateData: Partial<Student> = {
        first_name: 'Sofia',
        weekly_meals: NaN
      };
      mockHttp.put.mockReturnValue(of({ success: true, data: {} }));

      let result: Student | undefined;
      service.updateStudent('s-10', updateData).subscribe(res => { result = res; });

      expect(result?.weekly_meals).toBe(0);
    });

    it('should fallback to mock simulation when PUT fails (with valid weekly_meals)', () => {
      const updateData: Partial<Student> = { first_name: 'Sofia', weekly_meals: 4 };
      mockHttp.put.mockReturnValue(throwError(() => new Error('Server down')));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      let result: Student | undefined;
      service.updateStudent('s-10', updateData).subscribe(res => { result = res; });

      expect(result?.id).toBe('s-10');
      expect(result?.first_name).toBe('Sofia');
      expect(result?.weekly_meals).toBe(4);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should fallback to mock simulation when PUT fails (with NaN weekly_meals)', () => {
      const updateData: Partial<Student> = { first_name: 'Sofia', weekly_meals: 'abc' as any };
      mockHttp.put.mockReturnValue(throwError(() => new Error('Server down')));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      let result: Student | undefined;
      service.updateStudent('s-10', updateData).subscribe(res => { result = res; });

      expect(result?.id).toBe('s-10');
      expect(result?.first_name).toBe('Sofia');
      expect(result?.weekly_meals).toBe(0);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  // ==================== ATTENDANCES ====================
  describe('getExpectedAttendances', () => {
    it('should map attendances from API response with fallback properties', () => {
      const backendAttendances = [
        {
          student_id: 1,
          first_name: 'L',
          last_name: 'B',
          school: 'Scuola Primary',
          main_tutor_phone: '123456',
          is_present: true,
          canteen_used: true,
          notes: 'Arriving late'
        },
        {
          student_id: 2,
          first_name: 'M',
          last_name: 'R',
          scuola: 'Scuola Secondaria',
          tutor_phone: '654321',
          is_present: false,
          has_meal: true,
          notes: null
        },
        {
          student_id: 3,
          first_name: 'No',
          last_name: 'School',
          is_present: true
        }
      ];
      mockHttp.get.mockReturnValue(of({ success: true, data: backendAttendances }));

      let result: AttendanceRecord[] | undefined;
      service.getExpectedAttendances('2026-10-22').subscribe(res => { result = res; });

      expect(result).toBeDefined();
      expect(result![0].student_id).toBe(1);
      expect(result![0].school).toBe('Scuola Primary');
      expect(result![0].has_meal).toBe(true);
      expect(result![0].notes).toBe('Arriving late');
      expect(result![1].school).toBe('Scuola Secondaria');
      expect(result![1].main_tutor_phone).toBe('654321');
      expect(result![1].notes).toBe('');
      expect(result![2].school).toBe('');
      expect(result![2].main_tutor_phone).toBe('');
      expect(mockHttp.get).toHaveBeenCalledWith('/api/attendances/expected', expect.any(Object));
    });

    it('should handle non-array data gracefully', () => {
      mockHttp.get.mockReturnValue(of({ success: true, data: null }));
      let result: AttendanceRecord[] | undefined;
      service.getExpectedAttendances('2026-10-22').subscribe(res => { result = res; });
      expect(result).toEqual([]);
    });

    it('should fallback to mock attendances when API fails', () => {
      mockHttp.get.mockReturnValue(throwError(() => new Error('Server Error')));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      let result: AttendanceRecord[] | undefined;
      service.getExpectedAttendances('2026-10-22').subscribe(res => { result = res; });

      expect(result).toBeDefined();
      expect(result!.length).toBeGreaterThan(0);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  describe('saveAttendancesBulk', () => {
    it('should post attendance bulk data to API and return saved count from response', () => {
      const records: AttendanceRecord[] = [
        { student_id: 1, first_name: 'A', last_name: 'B', is_present: true, has_meal: false, notes: 'present' }
      ];
      mockHttp.post.mockReturnValue(of({ success: true, data: { records: [{ id: 1 }] } }));

      let result: { count: number } | undefined;
      service.saveAttendancesBulk('2026-10-22', records).subscribe(res => { result = res; });

      expect(result?.count).toBe(1);
      expect(mockHttp.post).toHaveBeenCalledWith('/api/attendances/bulk', [
        {
          student_id: 1,
          date: '2026-10-22',
          is_present: true,
          canteen_used: false,
          notes: 'present'
        }
      ]);
    });

    it('should fallback to records.length when data?.records is empty', () => {
      const records: AttendanceRecord[] = [
        { student_id: 1, first_name: 'A', last_name: 'B' }
      ];
      mockHttp.post.mockReturnValue(of({ success: true, data: null }));

      let result: { count: number } | undefined;
      service.saveAttendancesBulk('2026-10-22', records).subscribe(res => { result = res; });

      expect(result?.count).toBe(1);
    });

    it('should fallback to simulation when bulk save API fails', () => {
      const records: AttendanceRecord[] = [
        { student_id: 1, first_name: 'A', last_name: 'B' }
      ];
      mockHttp.post.mockReturnValue(throwError(() => new Error('Bulk error')));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      let result: { count: number } | undefined;
      service.saveAttendancesBulk('2026-10-22', records).subscribe(res => { result = res; });

      expect(result?.count).toBe(1);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  describe('deleteAttendance', () => {
    it('should call DELETE and return res.data when available', () => {
      mockHttp.delete.mockReturnValue(of({ success: true, data: { deleted: true } }));

      let result: any;
      service.deleteAttendance('2026-10-22', 42).subscribe(res => { result = res; });

      expect(mockHttp.delete).toHaveBeenCalledWith('/api/attendances/2026-10-22/42');
      expect(result).toEqual({ deleted: true });
    });

    it('should return fallback { success: res.success } when data is null', () => {
      mockHttp.delete.mockReturnValue(of({ success: true, data: null }));

      let result: any;
      service.deleteAttendance('2026-10-22', 42).subscribe(res => { result = res; });

      expect(result).toEqual({ success: true });
    });

    it('should fallback safely when deleteAttendance fails offline', () => {
      mockHttp.delete.mockReturnValue(throwError(() => new Error('Offline')));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      let result: any;
      service.deleteAttendance('2026-10-22', 42).subscribe(res => { result = res; });

      expect(result).toEqual({ success: true });
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  // ==================== REPORTS ====================
  describe('getDailyReport', () => {
    it('should map daily report with allAttendances and fallback fields', () => {
      const backendReport = {
        date: '2026-10-22',
        statistics: { totalExpected: 10, present: 8, extraPresent: 1, absent: 2, excused: 0, totalInserted: 9 },
        allAttendances: [
          {
            attendance_id: 'att-1',
            date: '2026-10-22',
            student_id: 1,
            first_name: 'Pippo',
            last_name: 'Baudo',
            is_present: true,
            is_absent_justified: false,
            canteen_used: true,
            is_extra: false
          },
          {
            id: 'att-2',
            date: '2026-10-22',
            student_id: 2,
            studentName: 'Custom Name',
            school: 'Test School',
            tutor_name: 'Custom Tutor',
            tutor_phone: '999',
            created_at: '2026-10-22',
            updated_at: '2026-10-22'
          }
        ],
        extraStudents: [
          {
            student_id: 20,
            first_name: 'Extra',
            last_name: 'One',
            has_meal: true
          }
        ],
        unjustifiedAbsences: [
          {
            student: { id: 3, firstName: 'A', lastName: 'B' },
            school: 'School 3',
            mainTutor: { fullName: 'Tutor A', phone: '123' }
          },
          {
            student_id: 4,
            first_name: 'C',
            last_name: 'D',
            tutor_name: 'Tutor C',
            tutor_phone: '456'
          },
          {
            student_id: 5,
            first_name: 'E',
            last_name: 'F'
          }
        ]
      };
      mockHttp.get.mockReturnValue(of({ success: true, data: backendReport }));

      let result: any;
      service.getDailyReport('2026-10-22').subscribe(res => { result = res; });

      expect(result.statistics.totalExpected).toBe(10);
      expect(result.statistics.totalInserted).toBe(9);
      expect(result.allAttendances[0].attendance_id).toBe('att-1');
      expect(result.allAttendances[0].studentName).toBe('Pippo Baudo');
      expect(result.allAttendances[1].attendance_id).toBe('att-2');
      expect(result.allAttendances[1].studentName).toBe('Custom Name');
      expect(result.extraStudents[0].studentName).toBe('Extra One');
      expect(result.extraStudents[0].tutor_name).toBe('N/D');
      expect(result.unjustifiedAbsences[0].student_id).toBe(3);
      expect(result.unjustifiedAbsences[1].student_id).toBe(4);
      expect(result.unjustifiedAbsences[2].tutor_name).toBe('N/D');
      expect(result.unjustifiedAbsences[2].tutor_phone).toBe('');
      expect(result.unjustifiedAbsences[1].first_name).toBe('C');
    });

    it('should map daily report when statistics and arrays are missing', () => {
      const backendReport = {
        date: '2026-10-22'
      };
      mockHttp.get.mockReturnValue(of({ success: true, data: backendReport }));

      let result: any;
      service.getDailyReport('2026-10-22').subscribe(res => { result = res; });

      expect(result.statistics.totalExpected).toBe(0);
      expect(result.statistics.totalInserted).toBe(0);
      expect(result.allAttendances).toEqual([]);
      expect(result.extraStudents).toEqual([]);
      expect(result.unjustifiedAbsences).toEqual([]);
    });

    it('should fallback to mock report when API fails', () => {
      mockHttp.get.mockReturnValue(throwError(() => new Error('Report error')));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      let result: any;
      service.getDailyReport('2026-10-22').subscribe(res => { result = res; });

      expect(result).toBeDefined();
      expect(result.statistics.totalExpected).toBe(18);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  describe('getMensaReport', () => {
    it('should map mensa report with numbers (year and month)', () => {
      const backendReport = {
        year: 2026,
        month: 10,
        from: '2026-10-01',
        to: '2026-10-31',
        deliveredTotal: 35,
        deliveredRegular: 30,
        deliveredExtra: 5,
        expectedMeals: 36,
        dailyBreakdown: [{ date: '2026-10-15', regularMensa: 5, extraMensa: 1, totalMensa: 6, students: [{ id: 1 }] }],
        studentsBreakdown: [{ student_id: 1, first_name: 'Mario', last_name: 'Rossi', pasti_settimanali: 2, expectedMeals: 9, deliveredRegular: 8, deliveredExtra: 1, deliveredTotal: 9 }]
      };
      mockHttp.get.mockReturnValue(of({ success: true, data: backendReport }));

      let result: any;
      service.getMensaReport(2026, 10).subscribe(res => { result = res; });

      expect(result.year).toBe(2026);
      expect(result.month).toBe(10);
      expect(result.total_meals).toBe(35);
      expect(result.delivered_regular).toBe(30);
      expect(result.students_breakdown[0].studentName).toBe('Mario Rossi');
      expect(result.breakdown[0].students).toEqual([{ id: 1 }]);
    });

    it('should map mensa report with string range (from and to) and fallback calculations', () => {
      const backendReport = {
        range: { from: '2026-10-01', to: '2026-10-15' },
        totalMensa: 20,
        extraMensa: 4,
        expectedMensa: 22,
        dailyBreakdown: [{ date: '2026-10-05', students: 'not an array' }],
        studentsBreakdown: [{ student_id: 2, studentName: 'Pre-formatted Name' }]
      };
      mockHttp.get.mockReturnValue(of({ success: true, data: backendReport }));

      let result: any;
      service.getMensaReport('2026-10-01', '2026-10-15').subscribe(res => { result = res; });

      expect(result.from).toBe('2026-10-01');
      expect(result.to).toBe('2026-10-15');
      expect(result.total_meals).toBe(20);
      expect(result.delivered_regular).toBe(16); // 20 - 4
      expect(result.delivered_extra).toBe(4);
      expect(result.expected_meals).toBe(22);
      expect(result.breakdown[0].students).toEqual([]);
      expect(result.students_breakdown[0].studentName).toBe('Pre-formatted Name');
    });

    it('should handle missing deliveredRegular and totalMensa fallback to 0', () => {
      const backendReport = {};
      mockHttp.get.mockReturnValue(of({ success: true, data: backendReport }));

      let result: any;
      service.getMensaReport(2026, 10).subscribe(res => { result = res; });

      expect(result.delivered_regular).toBe(0);
      expect(result.total_meals).toBe(0);
    });

    it('should fallback to mock mensa report when API fails', () => {
      mockHttp.get.mockReturnValue(throwError(() => new Error('Mensa error')));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      let result: any;
      service.getMensaReport(2026, 10).subscribe(res => { result = res; });

      expect(result).toBeDefined();
      expect(result.total_meals).toBe(42);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  describe('getMonthlyReport', () => {
    it('should map monthly report correctly from API payload', () => {
      const backendReport = {
        year: 2026,
        month: 10,
        from: '2026-10-01',
        to: '2026-10-31',
        summary: {
          totalPresent: 80,
          totalExtraPresent: 2,
          totalUnjustifiedAbsent: 5,
          totalExcused: 1,
          totalMeals: 75,
          activeDays: 20
        },
        dailyTrend: [
          { date: '2026-10-01', present: 4, extra: 1, absent: 0, excused: 0, meals: 4 },
          { date: '2026-10-02' } // tests ?? 0 fallbacks for present, extra, absent, excused, meals
        ],
        studentsSummary: [
          {
            student_id: 1,
            first_name: 'Mario',
            last_name: 'Rossi',
            days_present: 18,
            days_absent: 2,
            presenze_pagate: 20,
            eccedenza: 0
          },
          {
            student_id: 2,
            studentName: 'Luigi Verdi',
            days_present: 22,
            days_absent: 0,
            presenze_pagate: 20
            // eccedenza undefined -> Math.max(0, 22 - 20) = 2
          },
          {
            student_id: 3,
            first_name: 'P',
            last_name: 'Q'
            // tests ?? 0 fallbacks for days_present, days_absent, presenze_pagate, meals_count
          }
        ]
      };
      mockHttp.get.mockReturnValue(of({ success: true, data: backendReport }));

      let result: any;
      service.getMonthlyReport(2026, 10).subscribe(res => { result = res; });

      expect(result.year).toBe(2026);
      expect(result.summary.totalPresent).toBe(80);
      expect(result.summary.totalExtraPresent).toBe(2);
      expect(result.dailyTrend[0].present).toBe(4);
      expect(result.dailyTrend[1].present).toBe(0);
      expect(result.dailyTrend[1].extra).toBe(0);
      expect(result.dailyTrend[1].absent).toBe(0);
      expect(result.dailyTrend[1].excused).toBe(0);
      expect(result.dailyTrend[1].meals).toBe(0);
      expect(result.studentsSummary[0].days_present).toBe(18);
      expect(result.studentsSummary[0].presenze_pagate).toBe(20);
      expect(result.studentsSummary[0].eccedenza).toBe(0);
      expect(result.studentsSummary[1].studentName).toBe('Luigi Verdi');
      expect(result.studentsSummary[1].eccedenza).toBe(2);
      expect(result.studentsSummary[2].days_present).toBe(0);
      expect(result.studentsSummary[2].days_absent).toBe(0);
      expect(result.studentsSummary[2].presenze_pagate).toBe(0);
      expect(result.studentsSummary[2].meals_count).toBe(0);
    });

    it('should fallback to defaults when report payload properties are empty', () => {
      const backendReport = {
        year: 2026,
        month: 10
      };
      mockHttp.get.mockReturnValue(of({ success: true, data: backendReport }));

      let result: any;
      service.getMonthlyReport(2026, 10).subscribe(res => { result = res; });

      expect(result.summary.totalPresent).toBe(0);
      expect(result.dailyTrend).toEqual([]);
      expect(result.studentsSummary).toEqual([]);
    });

    it('should fallback to mock monthly report when API fails', () => {
      mockHttp.get.mockReturnValue(throwError(() => new Error('Monthly report error')));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      let result: any;
      service.getMonthlyReport(2026, 10).subscribe(res => { result = res; });

      expect(result).toBeDefined();
      expect(result.studentsSummary.length).toBe(1);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  describe('saveMonthlyPlans', () => {
    it('should put monthly plans with payload object', () => {
      const payload = {
        year: 2026,
        month: 10,
        plans: [{ student_id: 1, presenze_pagate: 20 }]
      };
      mockHttp.put.mockReturnValue(of({ success: true, data: { updated: 1 } }));

      let result: any;
      service.saveMonthlyPlans(payload).subscribe(res => { result = res; });

      expect(mockHttp.put).toHaveBeenCalledWith('/api/reports/monthly-plans', payload);
      expect(result.success).toBe(true);
    });

    it('should put monthly plans with separate arguments (year, month, plans)', () => {
      const plans = [{ student_id: 's-1', presenze_pagate: 15 }];
      mockHttp.put.mockReturnValue(of({ success: true, data: { updated: 1 } }));

      let result: any;
      service.saveMonthlyPlans(2026, 11, plans).subscribe(res => { result = res; });

      expect(mockHttp.put).toHaveBeenCalledWith('/api/reports/monthly-plans', {
        year: 2026,
        month: 11,
        plans
      });
      expect(result.success).toBe(true);
    });
  });

  // ==================== USERS API ====================
  describe('Users API', () => {
    it('getUsers should return user list or empty array', () => {
      const mockUsers: User[] = [
        { id: 'u-1', email: 'u1@test.com', first_name: 'U1', last_name: 'Test', role: 'ADMIN', status: 'APPROVED', created_at: '2026-01-01', updated_at: '2026-01-01' }
      ];
      mockHttp.get.mockReturnValue(of({ success: true, data: mockUsers }));

      let result: User[] | undefined;
      service.getUsers().subscribe(res => { result = res; });

      expect(result).toEqual(mockUsers);
      expect(mockHttp.get).toHaveBeenCalledWith('/api/users');

      // null data test
      mockHttp.get.mockReturnValue(of({ success: true, data: null }));
      service.getUsers().subscribe(res => { result = res; });
      expect(result).toEqual([]);
    });

    it('getUserById should return single user', () => {
      const mockUser: User = { id: 'u-1', email: 'u1@test.com', first_name: 'U1', last_name: 'Test', role: 'ADMIN', status: 'APPROVED', created_at: '2026-01-01', updated_at: '2026-01-01' };
      mockHttp.get.mockReturnValue(of({ success: true, data: mockUser }));

      let result: User | undefined;
      service.getUserById('u-1').subscribe(res => { result = res; });

      expect(result).toEqual(mockUser);
      expect(mockHttp.get).toHaveBeenCalledWith('/api/users/u-1');
    });

    it('createUser should post user data and return created user', () => {
      const newUser = { email: 'new@test.com', first_name: 'New', last_name: 'User', role: 'TEACHER' as const, status: 'PENDING' as const };
      mockHttp.post.mockReturnValue(of({ success: true, data: { id: 'u-2', ...newUser } }));

      let result: User | undefined;
      service.createUser(newUser).subscribe(res => { result = res; });

      expect(result?.id).toBe('u-2');
      expect(mockHttp.post).toHaveBeenCalledWith('/api/users', newUser);
    });

    it('updateUser should put updated user data and return user', () => {
      const updateData = { first_name: 'Updated' };
      mockHttp.put.mockReturnValue(of({ success: true, data: { id: 'u-1', first_name: 'Updated' } }));

      let result: User | undefined;
      service.updateUser('u-1', updateData).subscribe(res => { result = res; });

      expect(result?.first_name).toBe('Updated');
      expect(mockHttp.put).toHaveBeenCalledWith('/api/users/u-1', updateData);
    });

    it('updateUserStatus should patch status and return user', () => {
      mockHttp.patch.mockReturnValue(of({ success: true, data: { id: 'u-1', status: 'APPROVED' } }));

      let result: User | undefined;
      service.updateUserStatus('u-1', 'APPROVED').subscribe(res => { result = res; });

      expect(result?.status).toBe('APPROVED');
      expect(mockHttp.patch).toHaveBeenCalledWith('/api/users/u-1/status', { status: 'APPROVED' });
    });

    it('deleteUser should call DELETE and return boolean success', () => {
      mockHttp.delete.mockReturnValue(of({ success: true, data: { message: 'Deleted' } }));

      let result: boolean | undefined;
      service.deleteUser('u-1').subscribe(res => { result = res; });

      expect(result).toBe(true);
      expect(mockHttp.delete).toHaveBeenCalledWith('/api/users/u-1');
    });
  });

  // ==================== PROJECTS API ====================
  describe('Projects API', () => {
    it('getProjects should return project list or empty array', () => {
      const mockProjects: Project[] = [
        { id: 'p-1', name: 'Project Alpha', status: 'ACTIVE', start_date: '2026-01-01', created_at: '2026-01-01', updated_at: '2026-01-01' }
      ];
      mockHttp.get.mockReturnValue(of({ success: true, data: mockProjects }));

      let result: Project[] | undefined;
      service.getProjects().subscribe(res => { result = res; });

      expect(result).toEqual(mockProjects);
      expect(mockHttp.get).toHaveBeenCalledWith('/api/projects');

      // null data test
      mockHttp.get.mockReturnValue(of({ success: true, data: null }));
      service.getProjects().subscribe(res => { result = res; });
      expect(result).toEqual([]);
    });

    it('getProjectById should return single project', () => {
      const mockProject: Project = { id: 'p-1', name: 'Project Alpha', status: 'ACTIVE', start_date: '2026-01-01', created_at: '2026-01-01', updated_at: '2026-01-01' };
      mockHttp.get.mockReturnValue(of({ success: true, data: mockProject }));

      let result: Project | undefined;
      service.getProjectById('p-1').subscribe(res => { result = res; });

      expect(result).toEqual(mockProject);
      expect(mockHttp.get).toHaveBeenCalledWith('/api/projects/p-1');
    });

    it('createProject should post project and return result', () => {
      const newProj = { name: 'Project Beta' };
      mockHttp.post.mockReturnValue(of({ success: true, data: { id: 'p-2', ...newProj } }));

      let result: Project | undefined;
      service.createProject(newProj).subscribe(res => { result = res; });

      expect(result?.id).toBe('p-2');
      expect(mockHttp.post).toHaveBeenCalledWith('/api/projects', newProj);
    });

    it('updateProject should put project updates and return result', () => {
      const updateProj = { name: 'Beta Updated' };
      mockHttp.put.mockReturnValue(of({ success: true, data: { id: 'p-2', ...updateProj } }));

      let result: Project | undefined;
      service.updateProject('p-2', updateProj).subscribe(res => { result = res; });

      expect(result?.name).toBe('Beta Updated');
      expect(mockHttp.put).toHaveBeenCalledWith('/api/projects/p-2', updateProj);
    });

    it('deleteProject should call DELETE and return boolean success', () => {
      mockHttp.delete.mockReturnValue(of({ success: true, data: { message: 'Deleted' } }));

      let result: boolean | undefined;
      service.deleteProject('p-2').subscribe(res => { result = res; });

      expect(result).toBe(true);
      expect(mockHttp.delete).toHaveBeenCalledWith('/api/projects/p-2');
    });

    it('assignTeacherToProject should post teacher assignment and return result', () => {
      const assignData = { user_id: 'u-1', hourly_rate: 25, assigned_hours: 10 };
      mockHttp.post.mockReturnValue(of({ success: true, data: { id: 'pt-1', ...assignData } }));

      let result: any;
      service.assignTeacherToProject('p-1', assignData).subscribe(res => { result = res; });

      expect(result?.id).toBe('pt-1');
      expect(mockHttp.post).toHaveBeenCalledWith('/api/projects/p-1/teachers', assignData);
    });

    it('removeTeacherFromProject should delete teacher from project and return boolean success', () => {
      mockHttp.delete.mockReturnValue(of({ success: true }));

      let result: boolean | undefined;
      service.removeTeacherFromProject('p-1', 'u-1').subscribe(res => { result = res; });

      expect(result).toBe(true);
      expect(mockHttp.delete).toHaveBeenCalledWith('/api/projects/p-1/teachers/u-1');
    });
  });

  // ==================== REPORTS API (PROJECTS, FINANCIAL, OPERATIONAL) ====================
  describe('Other Reports API', () => {
    it('getProjectsReport should call /api/reports/projects', () => {
      const mockReport = { summary: { total_projects: 5 }, projects: [] };
      mockHttp.get.mockReturnValue(of({ success: true, data: mockReport }));

      let result: any;
      service.getProjectsReport().subscribe(res => { result = res; });

      expect(result).toEqual(mockReport);
      expect(mockHttp.get).toHaveBeenCalledWith('/api/reports/projects');
    });

    it('getFinancialMonthlyReport should call /api/reports/financial-monthly with params', () => {
      const mockReport = { year: 2026, month: 10, total_revenue: 1000 };
      mockHttp.get.mockReturnValue(of({ success: true, data: mockReport }));

      let result: any;
      service.getFinancialMonthlyReport(2026, 10).subscribe(res => { result = res; });

      expect(result).toEqual(mockReport);
      expect(mockHttp.get).toHaveBeenCalledWith('/api/reports/financial-monthly', expect.any(Object));
    });

    it('getOperationalMonthlyReport should call /api/reports/operational-monthly with params', () => {
      const mockReport = { year: 2026, month: 10, total_students: 50 };
      mockHttp.get.mockReturnValue(of({ success: true, data: mockReport }));

      let result: any;
      service.getOperationalMonthlyReport(2026, 10).subscribe(res => { result = res; });

      expect(result).toEqual(mockReport);
      expect(mockHttp.get).toHaveBeenCalledWith('/api/reports/operational-monthly', expect.any(Object));
    });
  });

  // ==================== SETTINGS API ====================
  describe('Settings API', () => {
    it('getSystemSettings should call /api/settings', () => {
      const mockSettings = { list: [], settings: {} as any };
      mockHttp.get.mockReturnValue(of({ success: true, data: mockSettings }));

      let result: any;
      service.getSystemSettings().subscribe(res => { result = res; });

      expect(result).toEqual(mockSettings);
      expect(mockHttp.get).toHaveBeenCalledWith('/api/settings');
    });

    it('updateSystemSettings should call PUT /api/settings', () => {
      const updateData = { max_students_per_shift: '25' };
      mockHttp.put.mockReturnValue(of({ success: true, data: { updated: true } }));

      let result: any;
      service.updateSystemSettings(updateData).subscribe(res => { result = res; });

      expect(result).toEqual({ updated: true });
      expect(mockHttp.put).toHaveBeenCalledWith('/api/settings', updateData);
    });
  });

  // ==================== AFTERSCHOOL ASSIGNMENTS API ====================
  describe('Afterschool Assignments API', () => {
    it('getAfterschoolAssignments should return list or empty array', () => {
      const mockAssignments = [{ id: 'a-1', user_id: 'u-1', hourly_rate: 20 }];
      mockHttp.get.mockReturnValue(of({ success: true, data: mockAssignments }));

      let result: any;
      service.getAfterschoolAssignments().subscribe(res => { result = res; });

      expect(result).toEqual(mockAssignments);
      expect(mockHttp.get).toHaveBeenCalledWith('/api/afterschool/assignments');

      mockHttp.get.mockReturnValue(of({ success: true, data: null }));
      service.getAfterschoolAssignments().subscribe(res => { result = res; });
      expect(result).toEqual([]);
    });

    it('getAfterschoolAssignmentByUser should return assignment or null', () => {
      const mockAssignment = { id: 'a-1', user_id: 'u-1', hourly_rate: 20 };
      mockHttp.get.mockReturnValue(of({ success: true, data: mockAssignment }));

      let result: any;
      service.getAfterschoolAssignmentByUser('u-1').subscribe(res => { result = res; });

      expect(result).toEqual(mockAssignment);
      expect(mockHttp.get).toHaveBeenCalledWith('/api/afterschool/assignments/u-1');

      mockHttp.get.mockReturnValue(of({ success: true, data: null }));
      service.getAfterschoolAssignmentByUser('u-2').subscribe(res => { result = res; });
      expect(result).toBeNull();
    });

    it('assignAfterschool should post assignment', () => {
      const payload = { user_id: 'u-1', hourly_rate: 20, notes: 'Test' };
      mockHttp.post.mockReturnValue(of({ success: true, data: { id: 'a-1', ...payload } }));

      let result: any;
      service.assignAfterschool(payload).subscribe(res => { result = res; });

      expect(result.id).toBe('a-1');
      expect(mockHttp.post).toHaveBeenCalledWith('/api/afterschool/assignments', payload);
    });

    it('removeAfterschoolAssignment should call DELETE and return boolean success', () => {
      mockHttp.delete.mockReturnValue(of({ success: true, data: { message: 'Removed' } }));

      let result: boolean | undefined;
      service.removeAfterschoolAssignment('u-1').subscribe(res => { result = res; });

      expect(result).toBe(true);
      expect(mockHttp.delete).toHaveBeenCalledWith('/api/afterschool/assignments/u-1');
    });
  });

  // ==================== CALENDAR / SHIFTS API ====================
  describe('Afterschool Calendar and Shifts API', () => {
    it('getAfterschoolWeekSchedule should call /api/afterschool/week-summary with startDate', () => {
      const mockSchedule = { start_date: '2026-10-19', days: [] };
      mockHttp.get.mockReturnValue(of({ success: true, data: mockSchedule }));

      let result: any;
      service.getAfterschoolWeekSchedule('2026-10-19').subscribe(res => { result = res; });

      expect(result).toEqual(mockSchedule);
      expect(mockHttp.get).toHaveBeenCalledWith('/api/afterschool/week-summary', expect.any(Object));
    });

    it('createTeacherShift should post new shift', () => {
      const shiftData = { user_id: 'u-1', shift_date: '2026-10-19', start_time: '14:00', end_time: '17:00' };
      mockHttp.post.mockReturnValue(of({ success: true, data: { id: 's-1', ...shiftData } }));

      let result: any;
      service.createTeacherShift(shiftData).subscribe(res => { result = res; });

      expect(result.id).toBe('s-1');
      expect(mockHttp.post).toHaveBeenCalledWith('/api/afterschool/shifts', shiftData);
    });

    it('updateTeacherShift should put shift updates', () => {
      const shiftData = { start_time: '14:30' };
      mockHttp.put.mockReturnValue(of({ success: true, data: { id: 's-1', ...shiftData } }));

      let result: any;
      service.updateTeacherShift('s-1', shiftData).subscribe(res => { result = res; });

      expect(result.start_time).toBe('14:30');
      expect(mockHttp.put).toHaveBeenCalledWith('/api/afterschool/shifts/s-1', shiftData);
    });

    it('deleteTeacherShift should call DELETE and return boolean success', () => {
      mockHttp.delete.mockReturnValue(of({ success: true, data: { message: 'Deleted' } }));

      let result: boolean | undefined;
      service.deleteTeacherShift('s-1').subscribe(res => { result = res; });

      expect(result).toBe(true);
      expect(mockHttp.delete).toHaveBeenCalledWith('/api/afterschool/shifts/s-1');
    });

    it('copyPreviousWeekStudents & copyPreviousWeekTeachers', () => {
      mockHttp.post.mockReturnValue(of({ success: true, data: { copied_count: 12 } }));

      let result: any;
      service.copyPreviousWeekStudents('2026-10-19').subscribe(res => { result = res; });
      expect(mockHttp.post).toHaveBeenCalledWith('/api/afterschool/copy-previous-students', { weekStartDate: '2026-10-19' });
      expect(result).toEqual({ copied_count: 12 });

      mockHttp.post.mockReturnValue(of({ success: true, data: { copied_count: 4 } }));
      service.copyPreviousWeekTeachers('2026-10-19').subscribe(res => { result = res; });
      expect(mockHttp.post).toHaveBeenCalledWith('/api/afterschool/copy-previous-teachers', { weekStartDate: '2026-10-19' });
      expect(result).toEqual({ copied_count: 4 });
    });
  });

  // ==================== CLOSURES API ====================
  describe('Afterschool Closures API', () => {
    it('getAfterschoolClosures should return closures list or empty array', () => {
      const mockClosures = [{ id: 'c-1', date: '2026-12-25', title: 'Natale' }];
      mockHttp.get.mockReturnValue(of({ success: true, data: mockClosures }));

      let result: any;
      service.getAfterschoolClosures().subscribe(res => { result = res; });

      expect(result).toEqual(mockClosures);
      expect(mockHttp.get).toHaveBeenCalledWith('/api/afterschool/closures');

      mockHttp.get.mockReturnValue(of({ success: true, data: null }));
      service.getAfterschoolClosures().subscribe(res => { result = res; });
      expect(result).toEqual([]);
    });

    it('createAfterschoolClosure should post closure and return result', () => {
      const payload = { date: '2026-12-25', title: 'Natale' };
      mockHttp.post.mockReturnValue(of({ success: true, data: { id: 'c-1', ...payload } }));

      let result: any;
      service.createAfterschoolClosure(payload).subscribe(res => { result = res; });

      expect(result.id).toBe('c-1');
      expect(mockHttp.post).toHaveBeenCalledWith('/api/afterschool/closures', payload);
    });

    it('deleteAfterschoolClosure should call DELETE and return boolean success', () => {
      mockHttp.delete.mockReturnValue(of({ success: true, data: { message: 'Deleted' } }));

      let result: boolean | undefined;
      service.deleteAfterschoolClosure('c-1').subscribe(res => { result = res; });

      expect(result).toBe(true);
      expect(mockHttp.delete).toHaveBeenCalledWith('/api/afterschool/closures/c-1');
    });
  });

  // ==================== PACKAGES & TARIFFS API ====================
  describe('Packages and Tariffs API', () => {
    it('getAfterschoolPackages should call /api/afterschool-packages with/without referenceDate', () => {
      const mockPackages: AfterschoolPackage[] = [
        { id: 'pkg-1', name: 'Standard', days_per_week: 5, is_active: true, created_at: '2026-01-01', updated_at: '2026-01-01' }
      ];
      mockHttp.get.mockReturnValue(of({ success: true, data: mockPackages }));

      let result: any;
      service.getAfterschoolPackages('2026-10-01').subscribe(res => { result = res; });

      expect(result).toEqual(mockPackages);
      expect(mockHttp.get).toHaveBeenCalledWith('/api/afterschool-packages', expect.any(Object));

      // Without referenceDate and null data
      mockHttp.get.mockReturnValue(of({ success: true, data: null }));
      service.getAfterschoolPackages().subscribe(res => { result = res; });
      expect(result).toEqual([]);
    });

    it('getPackageTariffs should return tariffs list or empty array', () => {
      const mockTariffs = [{ id: 'tar-1', package_id: 'pkg-1', monthly_rate: 100 }];
      mockHttp.get.mockReturnValue(of({ success: true, data: mockTariffs }));

      let result: any;
      service.getPackageTariffs('pkg-1').subscribe(res => { result = res; });

      expect(result).toEqual(mockTariffs);
      expect(mockHttp.get).toHaveBeenCalledWith('/api/afterschool-packages/pkg-1/tariffs');

      mockHttp.get.mockReturnValue(of({ success: true, data: null }));
      service.getPackageTariffs('pkg-1').subscribe(res => { result = res; });
      expect(result).toEqual([]);
    });

    it('createAfterschoolPackage should post package payload', () => {
      const payload = { name: 'Full', days_per_week: 5, initial_monthly_rate: 150, valid_from: '2026-09-01' };
      mockHttp.post.mockReturnValue(of({ success: true, data: { id: 'pkg-2', ...payload } }));

      let result: any;
      service.createAfterschoolPackage(payload).subscribe(res => { result = res; });

      expect(result.id).toBe('pkg-2');
      expect(mockHttp.post).toHaveBeenCalledWith('/api/afterschool-packages', payload);
    });

    it('updateAfterschoolPackage should put package updates', () => {
      const payload = { name: 'Full Updated' };
      mockHttp.put.mockReturnValue(of({ success: true, data: { id: 'pkg-2', ...payload } }));

      let result: any;
      service.updateAfterschoolPackage('pkg-2', payload).subscribe(res => { result = res; });

      expect(result.name).toBe('Full Updated');
      expect(mockHttp.put).toHaveBeenCalledWith('/api/afterschool-packages/pkg-2', payload);
    });

    it('updateAfterschoolTariff should put tariff updates', () => {
      const payload = { monthly_rate: 160 };
      mockHttp.put.mockReturnValue(of({ success: true, data: { id: 'tar-1', ...payload } }));

      let result: any;
      service.updateAfterschoolTariff('tar-1', payload).subscribe(res => { result = res; });

      expect(result.monthly_rate).toBe(160);
      expect(mockHttp.put).toHaveBeenCalledWith('/api/afterschool-packages/tariffs/tar-1', payload);
    });

    it('transitionAfterschoolTariff should post transition payload', () => {
      const payload = { new_monthly_rate: 180, valid_from: '2026-11-01' };
      mockHttp.post.mockReturnValue(of({ success: true, data: { oldTariff: {}, newTariff: {} } }));

      let result: any;
      service.transitionAfterschoolTariff('pkg-1', payload).subscribe(res => { result = res; });

      expect(result).toBeDefined();
      expect(mockHttp.post).toHaveBeenCalledWith('/api/afterschool-packages/pkg-1/transition-tariff', payload);
    });
  });

  // ==================== MEAL TARIFFS API ====================
  describe('Meal Tariffs API', () => {
    it('getMealTariffs should call with/without referenceDate and fallback to default object', () => {
      const mockResponse = { active: { id: 'mt-1', meal_rate: 5.5 }, history: [] };
      mockHttp.get.mockReturnValue(of({ success: true, data: mockResponse }));

      let result: any;
      service.getMealTariffs('2026-10-01').subscribe(res => { result = res; });

      expect(result).toEqual(mockResponse);
      expect(mockHttp.get).toHaveBeenCalledWith('/api/afterschool-packages/meal-tariffs', expect.any(Object));

      mockHttp.get.mockReturnValue(of({ success: true, data: null }));
      service.getMealTariffs().subscribe(res => { result = res; });
      expect(result).toEqual({ active: null, history: [] });
    });

    it('updateMealTariff should put tariff update', () => {
      const payload = { meal_rate: 6.0 };
      mockHttp.put.mockReturnValue(of({ success: true, data: { id: 'mt-1', ...payload } }));

      let result: any;
      service.updateMealTariff('mt-1', payload).subscribe(res => { result = res; });

      expect(result.meal_rate).toBe(6.0);
      expect(mockHttp.put).toHaveBeenCalledWith('/api/afterschool-packages/meal-tariffs/mt-1', payload);
    });

    it('transitionMealTariff should post transition payload', () => {
      const payload = { new_meal_rate: 6.5, valid_from: '2026-11-01' };
      mockHttp.post.mockReturnValue(of({ success: true, data: { oldTariff: null, newTariff: { id: 'mt-2', meal_rate: 6.5 } } }));

      let result: any;
      service.transitionMealTariff(payload).subscribe(res => { result = res; });

      expect(result.newTariff.meal_rate).toBe(6.5);
      expect(mockHttp.post).toHaveBeenCalledWith('/api/afterschool-packages/meal-tariffs/transition', payload);
    });
  });

  // ==================== AFTERSCHOOL EXPENSES API ====================
  describe('Afterschool Expenses API', () => {
    it('getAfterschoolExpenses should call /api/afterschool/expenses with and without category', () => {
      const mockData = { summary: { total_expenses: 100 }, expenses: [] };
      mockHttp.get.mockReturnValue(of({ success: true, data: mockData }));

      let result: any;
      service.getAfterschoolExpenses(2026, 10, 'MENSA').subscribe(res => { result = res; });

      expect(result).toEqual(mockData);
      expect(mockHttp.get).toHaveBeenCalledWith('/api/afterschool/expenses', expect.any(Object));

      service.getAfterschoolExpenses(2026, 10).subscribe(res => { result = res; });
      expect(mockHttp.get).toHaveBeenCalledWith('/api/afterschool/expenses', expect.any(Object));
    });

    it('createAfterschoolExpense should post expense payload', () => {
      const payload = { expense_date: '2026-10-15', category: 'CANCELLERIA' as AfterschoolExpenseCategory, amount: 45.5, description: 'Fogli e penne' };
      mockHttp.post.mockReturnValue(of({ success: true, data: { id: 'exp-1', ...payload } }));

      let result: any;
      service.createAfterschoolExpense(payload).subscribe(res => { result = res; });

      expect(result.id).toBe('exp-1');
      expect(mockHttp.post).toHaveBeenCalledWith('/api/afterschool/expenses', payload);
    });

    it('updateAfterschoolExpense should put expense update', () => {
      const payload = { amount: 50.0 };
      mockHttp.put.mockReturnValue(of({ success: true, data: { id: 'exp-1', ...payload } }));

      let result: any;
      service.updateAfterschoolExpense('exp-1', payload).subscribe(res => { result = res; });

      expect(result.amount).toBe(50.0);
      expect(mockHttp.put).toHaveBeenCalledWith('/api/afterschool/expenses/exp-1', payload);
    });

    it('deleteAfterschoolExpense should call DELETE and return boolean success', () => {
      mockHttp.delete.mockReturnValue(of({ success: true, data: { message: 'Deleted' } }));

      let result: boolean | undefined;
      service.deleteAfterschoolExpense('exp-1').subscribe(res => { result = res; });

      expect(result).toBe(true);
      expect(mockHttp.delete).toHaveBeenCalledWith('/api/afterschool/expenses/exp-1');
    });
  });

  // ==================== PAYMENTS / BILLING API ====================
  describe('Payments and Billing API', () => {
    it('getMonthlyBilling should call /api/payments/monthly with year and month', () => {
      const mockSummary = { year: 2026, month: 10, students: [] };
      mockHttp.get.mockReturnValue(of({ success: true, data: mockSummary }));

      let result: any;
      service.getMonthlyBilling(2026, 10).subscribe(res => { result = res; });

      expect(result).toEqual(mockSummary);
      expect(mockHttp.get).toHaveBeenCalledWith('/api/payments/monthly', expect.any(Object));
    });

    it('assignTariffToStudent should post package assignment', () => {
      const payload = { student_id: 's-1', package_id: 'pkg-1', valid_from: '2026-10-01' };
      mockHttp.post.mockReturnValue(of({ success: true, data: { id: 'asgn-1', ...payload } }));

      let result: any;
      service.assignTariffToStudent(payload).subscribe(res => { result = res; });

      expect(result.id).toBe('asgn-1');
      expect(mockHttp.post).toHaveBeenCalledWith('/api/payments/assign-tariff', payload);
    });

    it('updateStudentTariff should put tariff assignment update', () => {
      const payload = { custom_monthly_rate: 120 };
      mockHttp.put.mockReturnValue(of({ success: true, data: { id: 'asgn-1', ...payload } }));

      let result: any;
      service.updateStudentTariff('asgn-1', payload).subscribe(res => { result = res; });

      expect(result.custom_monthly_rate).toBe(120);
      expect(mockHttp.put).toHaveBeenCalledWith('/api/payments/tariffs/asgn-1', payload);
    });

    it('removeStudentTariff should delete tariff assignment and return boolean success', () => {
      mockHttp.delete.mockReturnValue(of({ success: true }));

      let result: boolean | undefined;
      service.removeStudentTariff('asgn-1').subscribe(res => { result = res; });

      expect(result).toBe(true);
      expect(mockHttp.delete).toHaveBeenCalledWith('/api/payments/tariffs/asgn-1');
    });

    it('settleMonthlyPayments should post settle payload', () => {
      const payload = { year: 2026, month: 10, student_ids: ['s-1', 's-2'] };
      mockHttp.post.mockReturnValue(of({ success: true, data: { settled_count: 2 } }));

      let result: any;
      service.settleMonthlyPayments(payload).subscribe(res => { result = res; });

      expect(result.settled_count).toBe(2);
      expect(mockHttp.post).toHaveBeenCalledWith('/api/payments/settle', payload);
    });
  });

  // ==================== COURSE STUDENTS API ====================
  describe('Course Students API', () => {
    it('getCourseStudents should support optional query params and default fallback', () => {
      const mockResponse = {
        students: [{ id: 'cs-1', first_name: 'Mario', last_name: 'Rossi' }],
        summary: { total: 1, valid: 1, expiring_soon: 0, expired: 0, no_card: 0 }
      };
      mockHttp.get.mockReturnValue(of({ success: true, data: mockResponse }));

      let result: any;
      service.getCourseStudents({ search: 'Mario', card_status: 'VALID' }).subscribe(res => { result = res; });

      expect(result).toEqual(mockResponse);
      expect(mockHttp.get).toHaveBeenCalledWith('/api/course-students', expect.any(Object));

      // Without params and null data
      mockHttp.get.mockReturnValue(of({ success: true, data: null }));
      service.getCourseStudents().subscribe(res => { result = res; });
      expect(result).toEqual({
        students: [],
        summary: { total: 0, valid: 0, expiring_soon: 0, expired: 0, no_card: 0 }
      });
    });

    it('getCourseStudent should return single course student', () => {
      const mockStudent = { id: 'cs-1', first_name: 'Mario', last_name: 'Rossi' };
      mockHttp.get.mockReturnValue(of({ success: true, data: mockStudent }));

      let result: any;
      service.getCourseStudent('cs-1').subscribe(res => { result = res; });

      expect(result).toEqual(mockStudent);
      expect(mockHttp.get).toHaveBeenCalledWith('/api/course-students/cs-1');
    });

    it('createCourseStudent should post course student data', () => {
      const newStudent = { first_name: 'Mario', last_name: 'Rossi' };
      mockHttp.post.mockReturnValue(of({ success: true, data: { id: 'cs-1', ...newStudent } }));

      let result: any;
      service.createCourseStudent(newStudent).subscribe(res => { result = res; });

      expect(result.id).toBe('cs-1');
      expect(mockHttp.post).toHaveBeenCalledWith('/api/course-students', newStudent);
    });

    it('updateCourseStudent should put course student update', () => {
      const updateData = { notes: 'Updated notes' };
      mockHttp.put.mockReturnValue(of({ success: true, data: { id: 'cs-1', ...updateData } }));

      let result: any;
      service.updateCourseStudent('cs-1', updateData).subscribe(res => { result = res; });

      expect(result.notes).toBe('Updated notes');
      expect(mockHttp.put).toHaveBeenCalledWith('/api/course-students/cs-1', updateData);
    });

    it('deleteCourseStudent should call DELETE and return boolean success', () => {
      mockHttp.delete.mockReturnValue(of({ success: true, data: { message: 'Deleted' } }));

      let result: boolean | undefined;
      service.deleteCourseStudent('cs-1').subscribe(res => { result = res; });

      expect(result).toBe(true);
      expect(mockHttp.delete).toHaveBeenCalledWith('/api/course-students/cs-1');
    });
  });

  // ==================== COURSE ENROLLMENTS API ====================
  describe('Course Enrollments API', () => {
    it('getCourseEnrollments should support query params and default fallback', () => {
      const mockResponse = {
        enrollments: [{ id: 'en-1', project_id: 'p-1', course_student_id: 'cs-1' }],
        summary: { total_enrollments: 1, total_amount: 100, total_paid: 50, total_remaining: 50 }
      };
      mockHttp.get.mockReturnValue(of({ success: true, data: mockResponse }));

      let result: any;
      service.getCourseEnrollments({
        project_id: 'p-1',
        course_student_id: 'cs-1',
        payment_status: 'PARTIAL',
        search: 'test'
      }).subscribe(res => { result = res; });

      expect(result).toEqual(mockResponse);
      expect(mockHttp.get).toHaveBeenCalledWith('/api/course-enrollments', expect.any(Object));

      // Without params and null data
      mockHttp.get.mockReturnValue(of({ success: true, data: null }));
      service.getCourseEnrollments().subscribe(res => { result = res; });
      expect(result).toEqual({
        enrollments: [],
        summary: { total_enrollments: 0, total_amount: 0, total_paid: 0, total_remaining: 0 }
      });
    });

    it('createCourseEnrollment should post enrollment data', () => {
      const payload = { course_student_id: 'cs-1', project_id: 'p-1', installments_count: 2 };
      mockHttp.post.mockReturnValue(of({ success: true, data: { enrollment: { id: 'en-1' } } }));

      let result: any;
      service.createCourseEnrollment(payload).subscribe(res => { result = res; });

      expect(result.enrollment.id).toBe('en-1');
      expect(mockHttp.post).toHaveBeenCalledWith('/api/course-enrollments', payload);
    });

    it('deleteCourseEnrollment should call DELETE and return boolean success', () => {
      mockHttp.delete.mockReturnValue(of({ success: true, data: { message: 'Deleted' } }));

      let result: boolean | undefined;
      service.deleteCourseEnrollment('en-1').subscribe(res => { result = res; });

      expect(result).toBe(true);
      expect(mockHttp.delete).toHaveBeenCalledWith('/api/course-enrollments/en-1');
    });

    it('settleCourseEnrollment should post settle and return enrollment', () => {
      const mockEnrollment = { id: 'en-1', is_fully_paid: true };
      mockHttp.post.mockReturnValue(of({ success: true, data: { enrollment: mockEnrollment } }));

      let result: any;
      service.settleCourseEnrollment('en-1', { payment_method: 'CASH' }).subscribe(res => { result = res; });

      expect(result).toEqual(mockEnrollment);
      expect(mockHttp.post).toHaveBeenCalledWith('/api/course-enrollments/en-1/settle', { payment_method: 'CASH' });
    });

    it('payCourseInstallment should post pay and return enrollment', () => {
      const mockEnrollment = { id: 'en-1' };
      mockHttp.post.mockReturnValue(of({ success: true, data: { enrollment: mockEnrollment } }));

      let result: any;
      service.payCourseInstallment('inst-1', { payment_method: 'BONIFICO' }).subscribe(res => { result = res; });

      expect(result).toEqual(mockEnrollment);
      expect(mockHttp.post).toHaveBeenCalledWith('/api/course-enrollments/installments/inst-1/pay', { payment_method: 'BONIFICO' });
    });

    it('unpayCourseInstallment should post unpay with empty body and return enrollment', () => {
      const mockEnrollment = { id: 'en-1' };
      mockHttp.post.mockReturnValue(of({ success: true, data: { enrollment: mockEnrollment } }));

      let result: any;
      service.unpayCourseInstallment('inst-1').subscribe(res => { result = res; });

      expect(result).toEqual(mockEnrollment);
      expect(mockHttp.post).toHaveBeenCalledWith('/api/course-enrollments/installments/inst-1/unpay', {});
    });

    it('updateCourseInstallment should put installment updates and return enrollment', () => {
      const mockEnrollment = { id: 'en-1' };
      mockHttp.put.mockReturnValue(of({ success: true, data: { enrollment: mockEnrollment } }));

      let result: any;
      service.updateCourseInstallment('inst-1', { amount: 60, notes: 'Adjusted' }).subscribe(res => { result = res; });

      expect(result).toEqual(mockEnrollment);
      expect(mockHttp.put).toHaveBeenCalledWith('/api/course-enrollments/installments/inst-1', { amount: 60, notes: 'Adjusted' });
    });
  });
});
