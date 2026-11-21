import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { UserFormComponent } from './user-form.component';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

describe('UserFormComponent', () => {
  let component: UserFormComponent;
  let mockApiService: any;
  let mockAuthService: any;
  let mockRouter: any;
  let routeId: string | null;

  beforeEach(() => {
    routeId = 'new';
    mockApiService = {
      getUserById: vi.fn(),
      createUser: vi.fn(),
      updateUser: vi.fn(),
      assignAfterschool: vi.fn(),
      removeAfterschoolAssignment: vi.fn()
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
        UserFormComponent,
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

    component = TestBed.inject(UserFormComponent);
  });

  it('should require password in create mode and create user on valid submit', () => {
    component.ngOnInit();
    expect(component.isEditMode()).toBe(false);

    // Invalid without email/password
    component.saveUser();
    expect(mockApiService.createUser).not.toHaveBeenCalled();

    mockApiService.createUser.mockReturnValue(of({ id: 'new-1' }));
    component.userForm.setValue({
      first_name: 'Anna',
      last_name: 'Verdi',
      email: 'anna@primola.it',
      phone: '123456',
      password: 'password123'
    });

    component.saveUser();
    expect(mockApiService.createUser).toHaveBeenCalledWith({
      first_name: 'Anna',
      last_name: 'Verdi',
      email: 'anna@primola.it',
      phone: '123456',
      password: 'password123',
      groups: ['TEACHER']
    });
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/users']);
  });

  it('should handle create user error', () => {
    component.ngOnInit();
    mockApiService.createUser.mockReturnValue(throwError(() => ({ error: { error: 'Email già in uso' } })));
    component.userForm.setValue({
      first_name: 'Anna',
      last_name: 'Verdi',
      email: 'anna@primola.it',
      phone: '',
      password: 'password123'
    });

    component.saveUser();
    expect(component.saving()).toBe(false);
    expect(component.errorMessage()).toBe('Email già in uso');
  });

  it('should load user details in edit mode and update user', () => {
    routeId = 'u1';
    mockApiService.getUserById.mockReturnValue(
      of({
        id: 'u1',
        first_name: 'Mario',
        last_name: 'Rossi',
        email: 'mario@primola.it',
        phone: '999',
        groups: ['ADMIN', 'TEACHER'],
        status: 'APPROVED',
        projects: [{ id: 'p1', name: 'Progetto A' }],
        afterschool_assignment: { hourly_rate: 20, notes: 'Note' }
      })
    );

    component.ngOnInit();
    expect(component.isEditMode()).toBe(true);
    expect(component.userId()).toBe('u1');
    expect(component.userGroups()).toEqual(['ADMIN', 'TEACHER']);
    expect(component.assignedProjects()).toHaveLength(1);
    expect(component.afterschoolRate()).toBe(20);

    mockApiService.updateUser.mockReturnValue(of({}));
    component.saveUser();
    expect(mockApiService.updateUser).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/users']);

    // Load user without afterschool assignment
    mockApiService.getUserById.mockReturnValue(of({ id: 'u2', email: 'u2@primola.it' }));
    component.loadUserDetail('u2');
    expect(component.afterschoolAssignment()).toBeNull();
    expect(component.afterschoolRate()).toBe('');
  });

  it('should handle loadUserDetail and updateUser errors', () => {
    routeId = 'u1';
    mockApiService.getUserById.mockReturnValue(throwError(() => ({})));
    component.ngOnInit();
    expect(component.errorMessage()).toBe("Errore nel recupero dell'utente.");

    component.userForm.patchValue({ email: 'mario@primola.it' });
    mockApiService.updateUser.mockReturnValue(throwError(() => ({})));
    component.saveUser();
    expect(component.errorMessage()).toBe("Errore durante l'aggiornamento.");
  });

  it('should toggle groups while keeping at least one group and return descriptions', () => {
    expect(component.isGroupSelected('TEACHER')).toBe(true);
    component.toggleGroup('TEACHER'); // only 1 group, should not remove
    expect(component.userGroups()).toEqual(['TEACHER']);

    component.toggleGroup('ADMIN');
    expect(component.userGroups()).toEqual(['TEACHER', 'ADMIN']);
    component.toggleGroup('TEACHER');
    expect(component.userGroups()).toEqual(['ADMIN']);

    expect(component.getGroupDescription('ADMIN')).toContain('Accesso globale');
    expect(component.getGroupDescription('OFFICE')).toContain('Segreteria');
    expect(component.getGroupDescription('TEACHER')).toContain('Docente');
  });

  it('should validate, save, and remove afterschool assignment', () => {
    component.userId.set('u1');
    component.onRateChange({ target: { value: '-5' } } as unknown as Event);
    component.onNotesChange({ target: { value: 'Nota test' } } as unknown as Event);

    component.saveAfterschool();
    expect(component.afterschoolSuccess()).toBe(false);
    expect(component.afterschoolMessage()).toContain('valida');

    component.onRateChange({ target: { value: '25' } } as unknown as Event);
    mockApiService.assignAfterschool.mockReturnValue(of({ hourly_rate: 25, notes: 'Nota test' }));
    component.saveAfterschool();
    expect(component.afterschoolSuccess()).toBe(true);
    expect(component.afterschoolAssignment()).toEqual({ hourly_rate: 25, notes: 'Nota test' });

    mockApiService.assignAfterschool.mockReturnValue(throwError(() => ({})));
    component.saveAfterschool();
    expect(component.afterschoolSuccess()).toBe(false);

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    component.removeAfterschool();
    expect(mockApiService.removeAfterschoolAssignment).not.toHaveBeenCalled();

    confirmSpy.mockReturnValue(true);
    mockApiService.removeAfterschoolAssignment.mockReturnValue(of({}));
    component.removeAfterschool();
    expect(component.afterschoolAssignment()).toBeNull();
    expect(component.afterschoolSuccess()).toBe(true);

    mockApiService.removeAfterschoolAssignment.mockReturnValue(throwError(() => ({})));
    component.removeAfterschool();
    expect(component.afterschoolSuccess()).toBe(false);

    confirmSpy.mockRestore();

    component.userId.set(null);
    component.saveAfterschool();
    component.removeAfterschool();
    expect(mockApiService.assignAfterschool).toHaveBeenCalledTimes(2);
  });
});
