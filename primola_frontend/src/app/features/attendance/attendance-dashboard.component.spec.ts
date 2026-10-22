import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { AttendanceDashboardComponent } from './attendance-dashboard.component';
import { ApiService } from '../../core/services/api.service';
import { of, throwError } from 'rxjs';
import { AttendanceRecord, Student } from '../../core/models';

describe('AttendanceDashboardComponent', () => {
  let component: AttendanceDashboardComponent;
  let mockApi: any;

  const mockStudents: Student[] = [
    { id: 1, first_name: 'Leo', last_name: 'B' },
    { id: 2, first_name: 'Sara', last_name: 'R' }
  ];

  const mockRecords: AttendanceRecord[] = [
    { student_id: 1, first_name: 'Leo', last_name: 'B', is_present: true, has_meal: true, is_excused: false },
    { student_id: 2, first_name: 'Sara', last_name: 'R', is_present: false, has_meal: false, is_excused: false }
  ];

  beforeEach(() => {
    mockApi = {
      getStudents: vi.fn().mockReturnValue(of(mockStudents)),
      getExpectedAttendances: vi.fn().mockReturnValue(of(mockRecords)),
      saveAttendancesBulk: vi.fn().mockReturnValue(of({ count: 2 }))
    };

    TestBed.configureTestingModule({
      providers: [
        AttendanceDashboardComponent,
        { provide: ApiService, useValue: mockApi }
      ]
    });

    component = TestBed.inject(AttendanceDashboardComponent);
  });

  it('should initialize and load data', () => {
    component.ngOnInit();
    expect(mockApi.getStudents).toHaveBeenCalled();
    expect(mockApi.getExpectedAttendances).toHaveBeenCalled();
    expect(component.records().length).toBe(2);
    expect(component.presentCount()).toBe(1);
    expect(component.absentCount()).toBe(1);
    expect(component.mealCount()).toBe(1);
    expect(component.formattedDate()).toBeDefined();
  });

  it('should handle date change', () => {
    component.onDateChange('2026-11-05');
    expect(component.selectedDate()).toBe('2026-11-05');
    expect(mockApi.getExpectedAttendances).toHaveBeenCalledWith('2026-11-05');
  });

  it('should toggle presence and reset meal/excused accordingly', () => {
    component.records.set([
      { student_id: 1, first_name: 'A', last_name: 'B', is_present: true, has_meal: true, is_excused: false }
    ]);

    // Disattiva presenza -> pasto deve diventare false
    component.togglePresence(0);
    expect(component.records()[0].is_present).toBe(false);
    expect(component.records()[0].has_meal).toBe(false);

    // Riattiva presenza -> giustificato deve diventare false
    component.records()[0].is_excused = true;
    component.togglePresence(0);
    expect(component.records()[0].is_present).toBe(true);
    expect(component.records()[0].is_excused).toBe(false);
  });

  it('should toggle meal only when student is present', () => {
    component.records.set([
      { student_id: 1, first_name: 'A', last_name: 'B', is_present: true, has_meal: false, is_excused: false },
      { student_id: 2, first_name: 'C', last_name: 'D', is_present: false, has_meal: false, is_excused: false }
    ]);

    component.toggleMeal(0);
    expect(component.records()[0].has_meal).toBe(true);

    component.toggleMeal(0); // Toggle back
    expect(component.records()[0].has_meal).toBe(false);

    component.toggleMeal(1); // non presente
    expect(component.records()[1].has_meal).toBe(false);
  });

  it('should toggle excused only when student is absent', () => {
    component.records.set([
      { student_id: 1, first_name: 'A', last_name: 'B', is_present: true, has_meal: false, is_excused: false },
      { student_id: 2, first_name: 'C', last_name: 'D', is_present: false, has_meal: false, is_excused: false }
    ]);

    component.toggleExcused(0); // presente
    expect(component.records()[0].is_excused).toBe(false);

    component.toggleExcused(1); // assente -> true
    expect(component.records()[1].is_excused).toBe(true);

    component.toggleExcused(1); // assente -> false
    expect(component.records()[1].is_excused).toBe(false);
  });

  it('should compute available extra students excluding already present students', () => {
    component.allStudents.set([
      { id: 1, first_name: 'A', last_name: 'B' },
      { id: 3, first_name: 'Extra', last_name: 'Student', school: 'School' }
    ]);
    component.records.set([
      { student_id: 1, first_name: 'A', last_name: 'B', is_present: true, has_meal: true, is_excused: false }
    ]);

    const extras = component.availableExtraStudents();
    expect(extras.length).toBe(1);
    expect(extras[0].id).toBe(3);
  });

  it('should add extra student', () => {
    component.records.set([]);
    component.showExtraModal.set(true);

    const extra: Student = {
      id: 99,
      first_name: 'Extra',
      last_name: 'Boy',
      school: 'Scuola Test',
      main_tutor_phone: '+39 111'
    };

    component.addExtraStudent(extra);
    expect(component.records().length).toBe(1);
    expect(component.records()[0].is_extra).toBe(true);
    expect(component.showExtraModal()).toBe(false);
  });

  it('should add extra student with empty school when school is undefined', () => {
    component.records.set([]);
    const extra: Student = {
      id: 100,
      first_name: 'NoSchool',
      last_name: 'Student'
    };

    component.addExtraStudent(extra);
    expect(component.records()[0].school).toBe('');
  });

  it('should remove extra student', () => {
    component.records.set([
      { student_id: 1, first_name: 'Regular', last_name: 'Student', is_present: true, has_meal: false, is_excused: false, is_extra: false },
      { student_id: 99, first_name: 'Extra', last_name: 'Student', is_present: true, has_meal: false, is_excused: false, is_extra: true },
    ]);

    // Tentativo di rimuovere lo studente normale non dovrebbe rimuoverlo con la logica extra
    component.removeExtraStudent(1);
    expect(component.records().length).toBe(2);

    // Rimuove lo studente extra
    component.removeExtraStudent(99);
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
