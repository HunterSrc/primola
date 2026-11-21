import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ProjectDetailComponent } from './project-detail.component';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

describe('ProjectDetailComponent', () => {
  let component: ProjectDetailComponent;
  let mockApiService: any;
  let mockAuthService: any;
  let mockRouter: any;
  let routeId: string | null;

  beforeEach(() => {
    routeId = 'new';
    mockApiService = {
      getProjectById: vi.fn(),
      createProject: vi.fn(),
      updateProject: vi.fn(),
      getCourseEnrollments: vi.fn().mockReturnValue(of([{ id: 'e1', course_student_id: 'cs1' }])),
      getCourseStudents: vi.fn().mockReturnValue(of([{ id: 'cs1' }, { id: 'cs2' }])),
      createCourseEnrollment: vi.fn(),
      deleteCourseEnrollment: vi.fn(),
      getUsers: vi.fn().mockReturnValue(of([{ id: 'u1', email: 't@primola.it' }])),
      assignTeacherToProject: vi.fn(),
      removeTeacherFromProject: vi.fn()
    };

    mockAuthService = {
      isAdmin: vi.fn().mockReturnValue(true),
      isOffice: vi.fn().mockReturnValue(false)
    };

    mockRouter = {
      navigate: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        FormBuilder,
        ProjectDetailComponent,
        { provide: ApiService, useValue: mockApiService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: () => routeId
              }
            }
          }
        }
      ]
    });

    component = TestBed.inject(ProjectDetailComponent);
  });

  it('should create a new project and navigate to its detail page', () => {
    component.ngOnInit();
    expect(component.isEditMode()).toBe(false);

    component.saveProject();
    expect(mockApiService.createProject).not.toHaveBeenCalled();

    component.projectForm.patchValue({ title: 'Nuovo Corso' });
    mockApiService.createProject.mockReturnValue(of({ id: 'p-new' }));
    component.saveProject();

    expect(mockApiService.createProject).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/projects', 'p-new']);
  });

  it('should load project, enrollments, students, and users in edit mode', () => {
    routeId = 'p1';
    mockApiService.getProjectById.mockReturnValue(
      of({
        id: 'p1',
        title: 'Corso Musica',
        type: 'CORSO',
        enrollment_fee: 100,
        max_enrolled: 2,
        actual_enrolled: 1,
        start_date: '2026-10-01T00:00:00Z',
        end_date: new Date(2026, 11, 15),
        teachers: [{ user_id: 'u1' }]
      })
    );

    component.ngOnInit();

    expect(component.isEditMode()).toBe(true);
    expect(component.isNonDoposcuolaEdit()).toBe(true);
    expect(component.enrollableStudents().map(s => s.id)).toEqual(['cs2']);
    expect(component.isAtOrOverCapacity()).toBe(false);

    mockApiService.updateProject.mockReturnValue(of({}));
    component.saveProject();
    expect(mockApiService.updateProject).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/projects']);
  });

  it('should handle DOPOSCUOLA type in loadProject without loading enrollments', () => {
    routeId = 'p1';
    mockApiService.getProjectById.mockReturnValue(
      of({
        id: 'p1',
        title: 'Doposcuola',
        type: 'DOPOSCUOLA',
        teachers: []
      })
    );

    component.ngOnInit();
    expect(component.isNonDoposcuolaEdit()).toBe(false);
  });

  it('should enroll and remove course student with success and errors', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    component.projectId.set('p1');
    component.projectForm.patchValue({ enrollment_fee: 150 });

    component.toggleEnrollForm();
    expect(component.showEnrollForm()).toBe(true);
    expect(component.enrollForm.get('total_amount')?.value).toBe(150);

    component.enrollStudent(); // invalid
    expect(mockApiService.createCourseEnrollment).not.toHaveBeenCalled();

    component.enrollForm.patchValue({ course_student_id: 'cs2', total_amount: 150, installments_count: 2 });
    mockApiService.createCourseEnrollment.mockReturnValue(of({}));
    component.enrollStudent();

    expect(mockApiService.createCourseEnrollment).toHaveBeenCalled();
    expect(component.showEnrollForm()).toBe(false);

    // Enroll student error
    component.showEnrollForm.set(true);
    mockApiService.createCourseEnrollment.mockReturnValue(throwError(() => ({ error: { error: 'Iscrizione fallita' } })));
    component.enrollStudent();
    expect(alertSpy).toHaveBeenCalledWith('Iscrizione fallita');

    // Remove enrollment cancelled
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    component.removeEnrollment({ id: 'e1' } as any);
    expect(mockApiService.deleteCourseEnrollment).not.toHaveBeenCalled();

    // Remove enrollment confirmed & success
    confirmSpy.mockReturnValue(true);
    mockApiService.deleteCourseEnrollment.mockReturnValue(of({}));
    component.removeEnrollment({ id: 'e1', student_nome: 'Mario', student_cognome: 'Rossi' } as any);
    expect(mockApiService.deleteCourseEnrollment).toHaveBeenCalledWith('e1');

    // Remove enrollment error
    mockApiService.deleteCourseEnrollment.mockReturnValue(throwError(() => ({})));
    component.removeEnrollment({ id: 'e1' } as any);
    expect(alertSpy).toHaveBeenCalledWith("Errore durante la rimozione dell'iscrizione");

    confirmSpy.mockRestore();
    alertSpy.mockRestore();
  });

  it('should assign and remove teacher with success and errors', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    component.projectId.set('p1');
    component.assignedTeachers.set([{ user_id: 'u1' } as any]);

    component.toggleAssignForm();
    expect(component.showAssignForm()).toBe(true);

    // Invalid form
    component.assignTeacher();
    expect(mockApiService.assignTeacherToProject).not.toHaveBeenCalled();

    // Valid form & success
    component.assignForm.patchValue({ user_id: 'u2', hourly_rate: 25 });
    mockApiService.assignTeacherToProject.mockReturnValue(of({}));
    mockApiService.getProjectById.mockReturnValue(of({ id: 'p1', title: 'X', type: 'DOPOSCUOLA' }));
    component.assignTeacher();

    expect(mockApiService.assignTeacherToProject).toHaveBeenCalledWith('p1', expect.objectContaining({ user_id: 'u2' }));
    expect(component.showAssignForm()).toBe(false);

    // Assign teacher error
    component.assignForm.patchValue({ user_id: 'u2' });
    mockApiService.assignTeacherToProject.mockReturnValue(throwError(() => ({ error: { error: 'Docente già assegnato' } })));
    component.assignTeacher();
    expect(alertSpy).toHaveBeenCalledWith('Docente già assegnato');

    // Remove teacher cancel
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    component.removeTeacher('u1');
    expect(mockApiService.removeTeacherFromProject).not.toHaveBeenCalled();

    // Remove teacher confirmed & success
    confirmSpy.mockReturnValue(true);
    mockApiService.removeTeacherFromProject.mockReturnValue(of({}));
    component.removeTeacher('u1');
    expect(component.assignedTeachers()).toEqual([]);

    // Remove teacher error
    mockApiService.removeTeacherFromProject.mockReturnValue(throwError(() => ({})));
    component.removeTeacher('u1');
    expect(alertSpy).toHaveBeenCalledWith('Errore rimozione docente');

    confirmSpy.mockRestore();
    alertSpy.mockRestore();
  });

  it('should return card badge classes and labels', () => {
    expect(component.getCardBadgeClass('VALIDA')).toContain('emerald');
    expect(component.getCardBadgeClass('IN_SCADENZA')).toContain('amber');
    expect(component.getCardBadgeClass('SCADUTA')).toContain('rose');
    expect(component.getCardBadgeClass(undefined)).toContain('slate');

    expect(component.getCardLabel('VALIDA')).toBe('Tessera Valida');
    expect(component.getCardLabel('IN_SCADENZA')).toBe('In Scadenza');
    expect(component.getCardLabel('SCADUTA')).toBe('Tessera Scaduta');
    expect(component.getCardLabel(undefined)).toBe('Nessuna Tessera');
  });

  it('should handle API errors gracefully across methods', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    component.projectId.set('p1');
    component.isEditMode.set(true);
    component.projectForm.patchValue({ title: 'Test' });

    mockApiService.updateProject.mockReturnValue(throwError(() => ({})));
    component.saveProject();
    expect(alertSpy).toHaveBeenCalledWith('Errore salvataggio commessa');

    component.isEditMode.set(false);
    mockApiService.createProject.mockReturnValue(throwError(() => ({})));
    component.saveProject();
    expect(alertSpy).toHaveBeenCalledWith('Errore creazione commessa');

    // Load errors
    mockApiService.getProjectById.mockReturnValue(throwError(() => new Error('err')));
    component.loadProject('p1');
    expect(consoleSpy).toHaveBeenCalledWith('Errore nel caricamento commessa:', expect.any(Error));

    mockApiService.getCourseEnrollments.mockReturnValue(throwError(() => new Error('err')));
    component.loadCourseEnrollments('p1');
    expect(component.loadingEnrollments()).toBe(false);

    mockApiService.getCourseStudents.mockReturnValue(throwError(() => new Error('err')));
    component.loadCourseStudents();

    mockApiService.getUsers.mockReturnValue(throwError(() => new Error('err')));
    component.loadUsers();

    alertSpy.mockRestore();
    consoleSpy.mockRestore();
  });

  it('should parse toDateInputValue correctly with all format variations', () => {
    const toDate = (component as any).toDateInputValue.bind(component);

    expect(toDate(null)).toBe('');
    expect(toDate(undefined)).toBe('');
    expect(toDate('')).toBe('');
    expect(toDate('2026-05-12T10:00:00')).toBe('2026-05-12');
    expect(toDate('2026/04/01')).toBe('2026-04-01');
    expect(toDate('invalid date string')).toBe('');
    expect(toDate(new Date(2026, 2, 5))).toBe('2026-03-05');
    expect(toDate(new Date('invalid'))).toBe('');
    expect(toDate(12345 as any)).toBe('');
  });

  it('should check capacity when max_enrolled is 0 or greater', () => {
    component.projectForm.patchValue({ max_enrolled: 0, actual_enrolled: 5 });
    expect(component.isAtOrOverCapacity()).toBe(false);

    component.projectForm.patchValue({ max_enrolled: 5, actual_enrolled: 5 });
    expect(component.isAtOrOverCapacity()).toBe(true);

    component.projectForm.patchValue({ max_enrolled: 10, actual_enrolled: 5 });
    expect(component.isAtOrOverCapacity()).toBe(false);
  });
});
