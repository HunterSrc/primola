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
    { id: 1, first_name: 'Leo', last_name: 'B', weekly_meals: 3 },
    { id: 2, first_name: 'Sara', last_name: 'R', weekly_meals: 0 }
  ];

  const mockRecords: AttendanceRecord[] = [
    { student_id: 1, first_name: 'Leo', last_name: 'B', is_present: true, has_meal: true },
    { student_id: 2, first_name: 'Sara', last_name: 'R', is_present: false, has_meal: false }
  ];

  beforeEach(() => {
    mockApi = {
      getStudents: vi.fn().mockReturnValue(of(mockStudents)),
      getExpectedAttendances: vi.fn().mockReturnValue(of(mockRecords)),
      saveAttendancesBulk: vi.fn().mockReturnValue(of({ count: 2 }))
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

  it('should initialize and load data', () => {
    component.ngOnInit();
    expect(mockApi.getStudents).toHaveBeenCalled();
    expect(mockApi.getExpectedAttendances).toHaveBeenCalled();
    expect(component.records().length).toBe(2);
    expect(component.formattedDate()).toBeDefined();
  });

  it('should handle date change', () => {
    component.onDateChange('2026-11-05');
    expect(component.selectedDate()).toBe('2026-11-05');
    expect(mockApi.getExpectedAttendances).toHaveBeenCalledWith('2026-11-05');
  });

  it('should toggle presence without resetting meal', () => {
    component.records.set([
      { student_id: 1, first_name: 'A', last_name: 'B', is_present: true, has_meal: true }
    ]);

    // Disattiva presenza -> pasto rimane prenotato (true)
    component.togglePresence(0);
    expect(component.records()[0].is_present).toBe(false);
    expect(component.records()[0].has_meal).toBe(true);

    // Riattiva presenza
    component.togglePresence(0);
    expect(component.records()[0].is_present).toBe(true);
    expect(component.records()[0].has_meal).toBe(true);
  });

  it('should toggle meal even when student is absent if user has permission', () => {
    component.records.set([
      { student_id: 1, first_name: 'A', last_name: 'B', is_present: true, has_meal: false },
      { student_id: 2, first_name: 'C', last_name: 'D', is_present: false, has_meal: false }
    ]);

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

  it('should compute available students excluding already registered students', () => {
    component.allStudents.set([
      { id: 1, first_name: 'A', last_name: 'B' },
      { id: 3, first_name: 'Nuovo', last_name: 'Studente', school: 'School' }
    ]);
    component.records.set([
      { student_id: 1, first_name: 'A', last_name: 'B', is_present: true, has_meal: true, is_excused: false }
    ]);

    const available = component.availableStudents();
    expect(available.length).toBe(1);
    expect(available[0].id).toBe(3);
  });

  it('should add student to attendance when user has permission', () => {
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
    expect(component.records()[0].has_meal).toBe(true);
    expect(component.showStudentModal()).toBe(false);
  });

  it('should not add student to attendance if user lacks permission', () => {
    mockAuth.canStudentsSig.set(false);
    component.records.set([]);

    const newStudent: Student = { id: 99, first_name: 'X', last_name: 'Y' };
    component.addStudentToAttendance(newStudent);
    expect(component.records().length).toBe(0);
  });

  it('should remove student from attendance when user has permission', () => {
    component.records.set([
      { student_id: 1, first_name: 'A', last_name: 'B', is_present: true, has_meal: false, is_excused: false },
      { student_id: 99, first_name: 'X', last_name: 'Y', is_present: true, has_meal: false, is_excused: false }
    ]);

    component.removeStudent(99);
    expect(component.records().length).toBe(1);
    expect(component.records()[0].student_id).toBe(1);
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

  it('should handle save error gracefully with fallback message', () => {
    mockApi.saveAttendancesBulk.mockReturnValue(throwError(() => ({})));
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    component.saveBulk();
    expect(component.isSaving()).toBe(false);
    expect(alertSpy).toHaveBeenCalledWith('Errore durante il salvataggio: Errore di rete');
    alertSpy.mockRestore();
  });
});
