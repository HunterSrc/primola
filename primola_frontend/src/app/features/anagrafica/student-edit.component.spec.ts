import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { StudentEditComponent } from './student-edit.component';
import { ApiService } from '../../core/services/api.service';
import { Student } from '../../core/models';

describe('StudentEditComponent', () => {
  let component: StudentEditComponent;
  let mockApi: any;
  let mockRouter: any;
  let mockActivatedRoute: any;

  const mockStudent: Student = {
    id: 's-123',
    first_name: 'Alessandro',
    last_name: 'Manzoni',
    school: 'Liceo Parini',
    birth_date: '2015-05-10',
    birth_place: 'Milano',
    residence: 'Via Manzoni 1',
    sub_lun: true,
    sub_mar: true,
    sub_mer: false,
    sub_gio: true,
    sub_ven: false,
    tutors: [
      {
        id: 't-1',
        first_name: 'Pietro',
        last_name: 'Manzoni',
        phone: '+39 340 000',
        relationship: 'Padre',
        is_main: true
      }
    ]
  };

  beforeEach(() => {
    mockApi = {
      getStudentById: vi.fn().mockReturnValue(of(mockStudent)),
      updateStudent: vi.fn().mockReturnValue(of(mockStudent))
    };

    mockRouter = {
      navigate: vi.fn()
    };

    mockActivatedRoute = {
      snapshot: {
        paramMap: {
          get: vi.fn().mockReturnValue('s-123')
        }
      }
    };

    TestBed.configureTestingModule({
      providers: [
        StudentEditComponent,
        FormBuilder,
        { provide: ApiService, useValue: mockApi },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute }
      ]
    });

    component = TestBed.inject(StudentEditComponent);
  });

  it('should initialize and load student data when id is present in route', () => {
    component.ngOnInit();

    expect(component.studentId()).toBe('s-123');
    expect(mockApi.getStudentById).toHaveBeenCalledWith('s-123');
    expect(component.isLoading()).toBe(false);

    expect(component.editForm.value.first_name).toBe('Alessandro');
    expect(component.editForm.value.last_name).toBe('Manzoni');
    expect(component.editForm.value.school).toBe('Liceo Parini');
    expect(component.editForm.value.sub_mer).toBe(false);
    expect(component.tutors.length).toBe(1);
    expect(component.tutors.at(0).value.first_name).toBe('Pietro');
    expect(component.tutors.at(0).value.is_main).toBe(true);
  });

  it('should redirect to /anagrafica if route has no id', () => {
    mockActivatedRoute.snapshot.paramMap.get.mockReturnValue(null);
    component.ngOnInit();

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/anagrafica']);
  });

  it('should handle student not found or null response gracefully', () => {
    mockApi.getStudentById.mockReturnValue(of(null));
    component.ngOnInit();

    expect(component.isLoading()).toBe(false);
    expect(component.editForm.value.first_name).toBe('');
  });

  it('should handle getStudentById API error', () => {
    mockApi.getStudentById.mockReturnValue(throwError(() => new Error('Network error')));
    component.ngOnInit();

    expect(component.isLoading()).toBe(false);
  });

  it('should add default empty tutor if student has empty tutors array', () => {
    const studentNoTutors = { ...mockStudent, tutors: [] };
    mockApi.getStudentById.mockReturnValue(of(studentNoTutors));
    component.ngOnInit();

    expect(component.tutors.length).toBe(1);
    expect(component.tutors.at(0).value.first_name).toBe('');
    expect(component.tutors.at(0).value.is_main).toBe(true);
  });

  it('should populate fallback default boolean values when flags are undefined', () => {
    const studentUndefinedFlags: any = {
      id: 's-undef',
      first_name: 'Test',
      last_name: 'Undef',
      sub_lun: undefined,
      sub_mar: undefined,
      sub_mer: undefined,
      sub_gio: undefined,
      sub_ven: undefined,
      tutors: null
    };
    mockApi.getStudentById.mockReturnValue(of(studentUndefinedFlags));
    component.ngOnInit();

    expect(component.editForm.value.sub_lun).toBe(true);
    expect(component.tutors.length).toBe(1);
  });

  it('should allow adding and removing tutors', () => {
    component.ngOnInit();
    expect(component.tutors.length).toBe(1);

    component.addTutor();
    expect(component.tutors.length).toBe(2);
    expect(component.tutors.at(1).value.is_main).toBe(false);

    component.removeTutor(1);
    expect(component.tutors.length).toBe(1);
  });

  it('should set selected tutor as main contact and clear others', () => {
    component.ngOnInit();
    component.addTutor(); // now 2 tutors

    expect(component.tutors.at(0).value.is_main).toBe(true);
    expect(component.tutors.at(1).value.is_main).toBe(false);

    component.setMainTutor(1);
    expect(component.tutors.at(0).value.is_main).toBe(false);
    expect(component.tutors.at(1).value.is_main).toBe(true);
  });

  it('should submit updated form and show notification', () => {
    vi.useFakeTimers();
    component.ngOnInit();

    component.onSubmit();
    expect(mockApi.updateStudent).toHaveBeenCalledWith('s-123', expect.any(Object));
    expect(component.isSaving()).toBe(false);
    expect(component.savedNotification()).toBe('Modifiche salvate con successo!');

    vi.advanceTimersByTime(3000);
    expect(component.savedNotification()).toBeNull();
    vi.useRealTimers();
  });

  it('should not submit if form is invalid', () => {
    component.ngOnInit();
    component.editForm.patchValue({ first_name: '' }); // invalid

    component.onSubmit();
    expect(mockApi.updateStudent).not.toHaveBeenCalled();
  });

  it('should handle updateStudent error gracefully', () => {
    component.ngOnInit();
    mockApi.updateStudent.mockReturnValue(throwError(() => new Error('Save error')));
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    component.onSubmit();
    expect(component.isSaving()).toBe(false);
    expect(alertSpy).toHaveBeenCalledWith('Errore durante il salvataggio: Save error');
    alertSpy.mockRestore();
  });

  it('should navigate back to /anagrafica when goBack is called', () => {
    component.goBack();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/anagrafica']);
  });
});
