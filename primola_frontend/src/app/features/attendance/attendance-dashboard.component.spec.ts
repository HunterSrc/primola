import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AttendanceDashboardComponent } from './attendance-dashboard.component';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { of, throwError } from 'rxjs';
import { AttendanceRecord, Student } from '../../core/models';

describe('AttendanceDashboardComponent', () => {
  let component: AttendanceDashboardComponent;
  let mockApi: any;
  let mockAuth: any;

  const mockStudents: Student[] = [
    { id: 1, first_name: 'Leo', last_name: 'B', school: 'Liceo', weekly_meals: 3 },
    { id: 2, first_name: 'Sara', last_name: 'R', weekly_meals: 0 }
  ];

  const mockRecords: AttendanceRecord[] = [
    { student_id: 1, first_name: 'Leo', last_name: 'B', school: 'Liceo', is_present: true, has_meal: true },
    { student_id: 2, first_name: 'Sara', last_name: 'R', is_present: false, has_meal: false }
  ];

  beforeEach(() => {
    mockApi = {
      getStudents: vi.fn().mockReturnValue(of(mockStudents)),
      getExpectedAttendances: vi.fn().mockReturnValue(of(mockRecords)),
      saveAttendancesBulk: vi.fn().mockReturnValue(of({ count: 2 })),
      deleteAttendance: vi.fn().mockReturnValue(of({ success: true }))
    };

    const canStudentsSig = signal(true);
    const canMealsSig = signal(true);

    mockAuth = {
      canManageAttendanceStudents: canStudentsSig,
      canManageAttendanceMeals: canMealsSig,
      canStudentsSig,
      canMealsSig
    };

    TestBed.configureTestingModule({
      providers: [
        AttendanceDashboardComponent,
        { provide: ApiService, useValue: mockApi },
        { provide: AuthService, useValue: mockAuth }
      ]
    });

    component = TestBed.inject(AttendanceDashboardComponent);
  });

  it('should initialize and load data when user has student management rights', () => {
    component.ngOnInit();
    expect(mockApi.getStudents).toHaveBeenCalled();
    expect(mockApi.getExpectedAttendances).toHaveBeenCalled();
    expect(component.records().length).toBe(2);
    expect(component.formattedDate()).toBeDefined();
  });

  it('should not call getStudents on init if user cannot manage students', () => {
    mockAuth.canStudentsSig.set(false);
    component.ngOnInit();
    expect(mockApi.getExpectedAttendances).toHaveBeenCalled();
    expect(mockApi.getStudents).not.toHaveBeenCalled();
  });

  it('should handle date change', () => {
    component.onDateChange('2026-11-05');
    expect(component.selectedDate()).toBe('2026-11-05');
    expect(mockApi.getExpectedAttendances).toHaveBeenCalledWith('2026-11-05');
  });

  it('should toggle presence without resetting meal and handle negative index', () => {
    component.records.set([
      { student_id: 1, first_name: 'A', last_name: 'B', is_present: true, has_meal: true }
    ]);

    // Negative index should do nothing
    component.togglePresence(-1);
    expect(component.records()[0].is_present).toBe(true);

    // Disattiva presenza -> pasto rimane prenotato (true)
    component.togglePresence(0);
    expect(component.records()[0].is_present).toBe(false);
    expect(component.records()[0].has_meal).toBe(true);

    // Riattiva presenza
    component.togglePresence(0);
    expect(component.records()[0].is_present).toBe(true);
    expect(component.records()[0].has_meal).toBe(true);
  });

  it('should toggle meal even when student is absent if user has permission, and ignore negative index', () => {
    component.records.set([
      { student_id: 1, first_name: 'A', last_name: 'B', is_present: true, has_meal: false },
      { student_id: 2, first_name: 'C', last_name: 'D', is_present: false, has_meal: false }
    ]);

    // Negative index
    component.toggleMeal(-1);
    expect(component.records()[0].has_meal).toBe(false);

    component.toggleMeal(0);
    expect(component.records()[0].has_meal).toBe(true);

    component.toggleMeal(0); // Toggle back
    expect(component.records()[0].has_meal).toBe(false);

    // Modifica mensa consentita anche se studente assente
    component.toggleMeal(1);
    expect(component.records()[1].has_meal).toBe(true);

    // Se l'utente non ha permessi mensa (es. TEACHER)
    mockAuth.canMealsSig.set(false);
    component.toggleMeal(0);
    expect(component.records()[0].has_meal).toBe(false); // non muta
  });

  it('should filter records properly by first name, last name, and school', () => {
    component.records.set([
      { student_id: 1, first_name: 'Marco', last_name: 'Rossi', school: 'Manzoni', is_present: true, has_meal: false },
      { student_id: 2, first_name: 'Anna', last_name: 'Verdi', is_present: false, has_meal: false }
    ]);

    // Empty query returns all records
    component.searchQuery = '   ';
    expect(component.filteredRecords().length).toBe(2);

    // Search by first name
    component.searchQuery = 'marco';
    expect(component.filteredRecords().length).toBe(1);
    expect(component.filteredRecords()[0].student_id).toBe(1);

    // Search by last name
    component.searchQuery = 'verdi';
    expect(component.filteredRecords().length).toBe(1);
    expect(component.filteredRecords()[0].student_id).toBe(2);

    // Search by school
    component.searchQuery = 'manzoni';
    expect(component.filteredRecords().length).toBe(1);
    expect(component.filteredRecords()[0].student_id).toBe(1);

    // Search with no match
    component.searchQuery = 'inexistent';
    expect(component.filteredRecords().length).toBe(0);
  });

  it('should compute available students and filter them by modalSearchQuery', () => {
    component.allStudents.set([
      { id: 1, first_name: 'Marco', last_name: 'Rossi', school: 'Manzoni' },
      { id: 2, first_name: 'Giulia', last_name: 'Bianchi', school: 'Carducci' },
      { id: 3, first_name: 'Luca', last_name: 'Ferrari' }
    ]);
    component.records.set([
      { student_id: 1, first_name: 'Marco', last_name: 'Rossi', is_present: true, has_meal: true }
    ]);

    // Available students exclude student with id 1
    const available = component.availableStudents();
    expect(available.length).toBe(2);
    expect(available.map(s => s.id)).toEqual([2, 3]);

    // Filter available students - empty query
    component.modalSearchQuery = '  ';
    expect(component.filteredAvailableStudents().length).toBe(2);

    // Filter available students by first name
    component.modalSearchQuery = 'giulia';
    expect(component.filteredAvailableStudents().length).toBe(1);
    expect(component.filteredAvailableStudents()[0].id).toBe(2);

    // Filter available students by last name
    component.modalSearchQuery = 'ferrari';
    expect(component.filteredAvailableStudents().length).toBe(1);
    expect(component.filteredAvailableStudents()[0].id).toBe(3);

    // Filter available students by school
    component.modalSearchQuery = 'carducci';
    expect(component.filteredAvailableStudents().length).toBe(1);
    expect(component.filteredAvailableStudents()[0].id).toBe(2);

    // Filter available students with no match
    component.modalSearchQuery = 'unknown';
    expect(component.filteredAvailableStudents().length).toBe(0);
  });

  it('should find original index of record with getOriginalIndex', () => {
    const rec1: AttendanceRecord = { student_id: 10, first_name: 'A', last_name: 'B', is_present: true, has_meal: false };
    const rec2: AttendanceRecord = { student_id: 20, first_name: 'C', last_name: 'D', is_present: false, has_meal: false };
    component.records.set([rec1, rec2]);

    expect(component.getOriginalIndex(rec1)).toBe(0);
    expect(component.getOriginalIndex(rec2)).toBe(1);
    expect(component.getOriginalIndex({ student_id: 99, first_name: 'X', last_name: 'Y', is_present: false, has_meal: false })).toBe(-1);
  });

  it('should add student to attendance as present without meal pre-activation', () => {
    component.records.set([]);
    component.showStudentModal.set(true);

    const newStudent: Student = {
      id: 99,
      first_name: 'Nuovo',
      last_name: 'Ragazzo',
      school: 'Scuola Test',
      weekly_meals: 2,
      main_tutor_phone: '+39 111'
    };

    component.addStudentToAttendance(newStudent);
    expect(component.records().length).toBe(1);
    expect(component.records()[0].student_id).toBe(99);
    expect(component.records()[0].is_present).toBe(true);
    expect(component.records()[0].has_meal).toBe(false);
    expect(component.records()[0].school).toBe('Scuola Test');
    expect(component.showStudentModal()).toBe(false);
  });

  it('should add student to attendance with empty school if undefined', () => {
    component.records.set([]);
    const studentNoSchool: Student = {
      id: 101,
      first_name: 'No',
      last_name: 'School'
    };
    component.addStudentToAttendance(studentNoSchool);
    expect(component.records()[0].school).toBe('');
  });

  it('should not add student to attendance if user lacks permission', () => {
    mockAuth.canStudentsSig.set(false);
    component.records.set([]);

    const newStudent: Student = { id: 99, first_name: 'X', last_name: 'Y' };
    component.addStudentToAttendance(newStudent);
    expect(component.records().length).toBe(0);
  });

  it('should remove student from attendance via deleteAttendance API when user has permission', () => {
    component.selectedDate.set('2026-10-22');
    component.records.set([
      { student_id: 1, first_name: 'A', last_name: 'B', is_present: true, has_meal: false },
      { student_id: 99, first_name: 'X', last_name: 'Y', is_present: true, has_meal: false }
    ]);

    component.removeStudent(99);
    expect(mockApi.deleteAttendance).toHaveBeenCalledWith('2026-10-22', 99);
    expect(component.records().length).toBe(1);
    expect(component.records()[0].student_id).toBe(1);
  });

  it('should handle error when removeStudent fails with server error or network fallback', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    // Error with error.error
    mockApi.deleteAttendance.mockReturnValue(throwError(() => ({ error: { error: 'Cancellazione non permessa' } })));
    component.records.set([{ student_id: 1, first_name: 'A', last_name: 'B', is_present: true, has_meal: false }]);
    component.removeStudent(1);
    expect(consoleSpy).toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith('Errore durante la rimozione dello studente: Cancellazione non permessa');

    // Error with message only
    mockApi.deleteAttendance.mockReturnValue(throwError(() => ({ message: 'Server down' })));
    component.removeStudent(1);
    expect(alertSpy).toHaveBeenCalledWith('Errore durante la rimozione dello studente: Server down');

    // Error with empty object fallback
    mockApi.deleteAttendance.mockReturnValue(throwError(() => ({})));
    component.removeStudent(1);
    expect(alertSpy).toHaveBeenCalledWith('Errore durante la rimozione dello studente: Errore di rete');

    consoleSpy.mockRestore();
    alertSpy.mockRestore();
  });

  it('should not remove student if user lacks permission', () => {
    mockAuth.canStudentsSig.set(false);
    component.records.set([
      { student_id: 1, first_name: 'A', last_name: 'B', is_present: true, has_meal: false }
    ]);

    component.removeStudent(1);
    expect(mockApi.deleteAttendance).not.toHaveBeenCalled();
    expect(component.records().length).toBe(1);
  });

  it('should save attendances bulk successfully', () => {
    vi.useFakeTimers();
    component.saveBulk();
    expect(component.isSaving()).toBe(false);
    expect(component.saveSuccessMessage()).toContain('Presenze salvate con successo per 2 studenti!');

    vi.advanceTimersByTime(5000);
    expect(component.saveSuccessMessage()).toBeNull();
    vi.useRealTimers();
  });

  it('should handle save error gracefully with message or fallback', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    // With message
    mockApi.saveAttendancesBulk.mockReturnValue(throwError(() => ({ message: 'Timeout' })));
    component.saveBulk();
    expect(component.isSaving()).toBe(false);
    expect(alertSpy).toHaveBeenCalledWith('Errore durante il salvataggio: Timeout');

    // Fallback message
    mockApi.saveAttendancesBulk.mockReturnValue(throwError(() => ({})));
    component.saveBulk();
    expect(component.isSaving()).toBe(false);
    expect(alertSpy).toHaveBeenCalledWith('Errore durante il salvataggio: Errore di rete');

    alertSpy.mockRestore();
  });
});
