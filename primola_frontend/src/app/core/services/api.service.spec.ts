import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ApiService } from './api.service';
import { HttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { AttendanceRecord, Student } from '../models';

describe('ApiService', () => {
  let service: ApiService;
  let mockHttp: any;

  beforeEach(() => {
    mockHttp = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        ApiService,
        { provide: HttpClient, useValue: mockHttp }
      ]
    });

    service = TestBed.inject(ApiService);
  });

  describe('getStudents', () => {
    it('should map students from API response', () => {
      const backendStudents = [
        {
          student_id: 10,
          student_first_name: 'Giulia',
          student_last_name: 'Bianchi',
          scuola: 'Scuola Rodari',
          giorni_abbonamento: [1, 3],
          tutor_first_name: 'Mario',
          tutor_last_name: 'Bianchi',
          tutor_phone: '+39 123'
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
      expect(result![0].main_tutor_name).toBe('Mario Bianchi');
      expect(mockHttp.get).toHaveBeenCalledWith('/api/students');
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

  describe('createStudent', () => {
    it('should map payload and return created student on success', () => {
      const studentData: Partial<Student> = {
        first_name: 'Mario',
        last_name: 'Rossi',
        school: 'Scuola Test',
        tutors: [{ first_name: 'P', last_name: 'R', phone: '123', is_main: true }]
      };
      mockHttp.post.mockReturnValue(of({ success: true, data: { student_id: 101 } }));

      let result: Student | undefined;
      service.createStudent(studentData).subscribe(res => { result = res; });

      expect(result?.id).toBe(101);
      expect(result?.first_name).toBe('Mario');
      expect(mockHttp.post).toHaveBeenCalledWith('/api/students', expect.any(Object));
    });

    it('should fallback to mock simulation when create fails', () => {
      const studentData: Partial<Student> = { first_name: 'Mario', last_name: 'Rossi' };
      mockHttp.post.mockReturnValue(throwError(() => new Error('Server down')));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      let result: Student | undefined;
      service.createStudent(studentData).subscribe(res => { result = res; });

      expect(result).toBeDefined();
      expect(result?.first_name).toBe('Mario');
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  describe('getStudentById', () => {
    it('should map single student details from API response', () => {
      const backendStudent = {
        id: 's-10',
        nome: 'Sofia',
        cognome: 'Ferrari',
        scuola: 'Scuola Manzoni',
        data_nascita: '2016-02-15T00:00:00.000Z',
        luogo_nascita: 'Bologna',
        residenza: 'Via Roma',
        giorni_abbonamento: [1, 3, 5],
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
      expect(result?.sub_lun).toBe(true);
      expect(result?.sub_mar).toBe(false);
      expect(result?.sub_mer).toBe(true);
      expect(result?.main_tutor_name).toBe('Elena Ferrari');
      expect(mockHttp.get).toHaveBeenCalledWith('/api/students/s-10');
    });

    it('should return null when API returns null data', () => {
      mockHttp.get.mockReturnValue(of({ success: true, data: null }));

      let result: Student | null | undefined;
      service.getStudentById('s-999').subscribe(res => { result = res; });

      expect(result).toBeNull();
    });

    it('should fallback to mock student or null when API fails', () => {
      mockHttp.get.mockReturnValue(throwError(() => new Error('Server down')));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      let result: Student | null | undefined;
      service.getStudentById(1).subscribe(res => { result = res; });

      expect(result).toBeDefined();
      expect(result?.id).toBe(1);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  describe('updateStudent', () => {
    it('should send PUT request and return updated student on success', () => {
      const updateData: Partial<Student> = {
        first_name: 'Sofia Modificata',
        last_name: 'Ferrari',
        sub_lun: true,
        sub_mar: false,
        sub_mer: true,
        sub_gio: false,
        sub_ven: true,
        tutors: [{ first_name: 'E', last_name: 'F', phone: '123', is_main: true }]
      };
      mockHttp.put.mockReturnValue(of({ success: true, data: { student: { id: 's-10' } } }));

      let result: Student | undefined;
      service.updateStudent('s-10', updateData).subscribe(res => { result = res; });

      expect(result?.id).toBe('s-10');
      expect(result?.first_name).toBe('Sofia Modificata');
      expect(mockHttp.put).toHaveBeenCalledWith('/api/students/s-10', expect.any(Object));
    });

    it('should fallback to mock simulation when PUT fails', () => {
      const updateData: Partial<Student> = { first_name: 'Sofia' };
      mockHttp.put.mockReturnValue(throwError(() => new Error('Server down')));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      let result: Student | undefined;
      service.updateStudent('s-10', updateData).subscribe(res => { result = res; });

      expect(result?.id).toBe('s-10');
      expect(result?.first_name).toBe('Sofia');
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  describe('getExpectedAttendances', () => {
    it('should map attendances from API response', () => {
      const backendAttendances = [
        {
          student_id: 1,
          first_name: 'L',
          last_name: 'B',
          scuola: 'Scuola',
          is_present: true,
          canteen_used: true,
          is_absent_justified: false,
          is_extra: true
        }
      ];
      mockHttp.get.mockReturnValue(of({ success: true, data: backendAttendances }));

      let result: AttendanceRecord[] | undefined;
      service.getExpectedAttendances('2026-10-22').subscribe(res => { result = res; });

      expect(result).toBeDefined();
      expect(result![0].student_id).toBe(1);
      expect(result![0].has_meal).toBe(true);
      expect(result![0].is_extra).toBe(true);
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
    it('should post attendance bulk data to API and return saved count', () => {
      const records: AttendanceRecord[] = [
        { student_id: 1, first_name: 'A', last_name: 'B', is_present: true, has_meal: false, is_excused: false }
      ];
      mockHttp.post.mockReturnValue(of({ success: true, data: { records: [{ id: 1 }] } }));

      let result: { count: number } | undefined;
      service.saveAttendancesBulk('2026-10-22', records).subscribe(res => { result = res; });

      expect(result?.count).toBe(1);
      expect(mockHttp.post).toHaveBeenCalledWith('/api/attendances/bulk', expect.any(Array));
    });

    it('should fallback to simulation when bulk save API fails', () => {
      const records: AttendanceRecord[] = [
        { student_id: 1, first_name: 'A', last_name: 'B', is_present: true, has_meal: false, is_excused: false }
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

  describe('getDailyReport', () => {
    it('should map daily report correctly from API payload', () => {
      const backendReport = {
        date: '2026-10-22',
        statistics: { totalExpected: 10, present: 8, extraPresent: 1, absent: 2, excused: 0 },
        extraStudents: [
          {
            student_id: 20,
            first_name: 'Extra',
            last_name: 'One',
            school: 'Scuola Test',
            has_meal: true,
            tutor_name: 'Tutor Extra',
            tutor_phone: '999'
          }
        ],
        unjustifiedAbsences: [
          {
            student: { id: 1, firstName: 'A', lastName: 'B' },
            mainTutor: { fullName: 'Tutor A', phone: '123' }
          }
        ]
      };
      mockHttp.get.mockReturnValue(of({ success: true, data: backendReport }));

      let result: any;
      service.getDailyReport('2026-10-22').subscribe(res => { result = res; });

      expect(result.statistics.totalExpected).toBe(10);
      expect(result.statistics.extraPresent).toBe(1);
      expect(result.extraStudents[0].studentName).toBe('Extra One');
      expect(result.extraStudents[0].has_meal).toBe(true);
      expect(result.unjustifiedAbsences[0].tutor_name).toBe('Tutor A');
    });

    it('should fallback to mock report when API fails', () => {
      mockHttp.get.mockReturnValue(throwError(() => new Error('Report error')));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      let result: any;
      service.getDailyReport('2026-10-22').subscribe(res => { result = res; });

      expect(result).toBeDefined();
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
          totalExtraPresent: 10,
          totalUnjustifiedAbsent: 5,
          totalExcused: 3,
          totalMeals: 75,
          activeDays: 20
        },
        dailyTrend: [{ date: '2026-10-01', present: 4, extra: 1, absent: 0, excused: 0, meals: 4 }],
        studentsSummary: [{ student_id: 1, first_name: 'Mario', last_name: 'Rossi', days_present: 18 }]
      };
      mockHttp.get.mockReturnValue(of({ success: true, data: backendReport }));

      let result: any;
      service.getMonthlyReport(2026, 10).subscribe(res => { result = res; });

      expect(result.year).toBe(2026);
      expect(result.summary.totalPresent).toBe(80);
      expect(result.summary.totalExtraPresent).toBe(10);
      expect(result.dailyTrend[0].present).toBe(4);
      expect(result.studentsSummary[0].days_present).toBe(18);
    });

    it('should fallback to mock monthly report when API fails', () => {
      mockHttp.get.mockReturnValue(throwError(() => new Error('Monthly report error')));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      let result: any;
      service.getMonthlyReport(2026, 10).subscribe(res => { result = res; });

      expect(result).toBeDefined();
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });
});
