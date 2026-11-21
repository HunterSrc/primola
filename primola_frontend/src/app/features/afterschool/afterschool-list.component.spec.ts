import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AfterschoolListComponent } from './afterschool-list.component';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { AfterschoolAssignment, User } from '../../core/models';

describe('AfterschoolListComponent', () => {
  let component: AfterschoolListComponent;
  let mockApiService: any;
  let mockAuthService: any;

  const sampleAssignments: AfterschoolAssignment[] = [
    {
      id: 'a1',
      user_id: 'u1',
      first_name: 'Mario',
      last_name: 'Rossi',
      email: 'mario@primola.it',
      phone: '123456',
      hourly_rate: 20,
      notes: 'Pomeriggio'
    },
    {
      id: 'a2',
      user_id: 'u2',
      first_name: 'Luca',
      last_name: 'Bianchi',
      email: 'luca@primola.it',
      hourly_rate: 30
    }
  ];

  const sampleUsers: User[] = [
    { id: 'u1', email: 'mario@primola.it', groups: ['TEACHER'] } as User,
    { id: 'u2', email: 'luca@primola.it', role: 'TEACHER' } as User,
    { id: 'u3', email: 'elena@primola.it', groups: ['TEACHER'], first_name: 'Elena', last_name: 'Verdi' } as User,
    { id: 'u4', email: 'admin@primola.it', groups: ['ADMIN'] } as User
  ];

  beforeEach(() => {
    mockApiService = {
      getAfterschoolAssignments: vi.fn().mockReturnValue(of(sampleAssignments)),
      getUsers: vi.fn().mockReturnValue(of(sampleUsers)),
      assignAfterschool: vi.fn(),
      removeAfterschoolAssignment: vi.fn()
    };

    mockAuthService = {
      canManageUsers: vi.fn().mockReturnValue(true)
    };

    TestBed.configureTestingModule({
      providers: [
        AfterschoolListComponent,
        { provide: ApiService, useValue: mockApiService },
        { provide: AuthService, useValue: mockAuthService }
      ]
    });

    component = TestBed.inject(AfterschoolListComponent);
  });

  it('should load data on init and compute averageHourlyRate correctly', () => {
    component.ngOnInit();

    expect(component.assignments()).toEqual(sampleAssignments);
    expect(component.allUsers()).toEqual(sampleUsers);
    expect(component.loading()).toBe(false);
    expect(component.averageHourlyRate()).toBe(25);

    // Empty list fallback
    component.assignments.set([]);
    expect(component.averageHourlyRate()).toBe(0);
  });

  it('should handle loadData errors gracefully', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockApiService.getAfterschoolAssignments.mockReturnValue(throwError(() => new Error('err1')));
    mockApiService.getUsers.mockReturnValue(throwError(() => new Error('err2')));

    component.loadData();

    expect(component.loading()).toBe(false);
    expect(consoleSpy).toHaveBeenCalledTimes(2);
    consoleSpy.mockRestore();
  });

  it('should compute availableTeachers filtering out already assigned users and non-teachers', () => {
    component.assignments.set(sampleAssignments); // u1 and u2 assigned
    component.allUsers.set(sampleUsers);

    const available = component.availableTeachers();
    expect(available.map(u => u.id)).toEqual(['u3']);
  });

  it('should open assign modal in create mode and validate inputs', () => {
    component.openAssignModal();
    expect(component.showModal()).toBe(true);
    expect(component.editingId()).toBeNull();
    expect(component.selectedUserId).toBe('');

    // Missing user
    component.submitModal();
    expect(component.modalError()).toBe('Seleziona un docente.');

    // Invalid rate
    component.selectedUserId = 'u3';
    component.modalRate = -5;
    component.submitModal();
    expect(component.modalError()).toContain('tariffa oraria valida');

    // Valid rate & create
    component.modalRate = 22;
    component.modalNotes = 'Nuove note';
    mockApiService.assignAfterschool.mockReturnValue(of({}));
    component.submitModal();

    expect(mockApiService.assignAfterschool).toHaveBeenCalledWith({
      user_id: 'u3',
      hourly_rate: 22,
      notes: 'Nuove note'
    });
    expect(component.showModal()).toBe(false);

    // Server error on submit
    component.openAssignModal();
    component.selectedUserId = 'u3';
    component.modalRate = 22;
    mockApiService.assignAfterschool.mockReturnValue(throwError(() => ({ error: { error: 'Duplicate' } })));
    component.submitModal();
    expect(component.modalError()).toBe('Duplicate');

    component.closeModal();
    expect(component.showModal()).toBe(false);
  });

  it('should edit assignment and submit updates', () => {
    component.editAssignment(sampleAssignments[0]);
    expect(component.showModal()).toBe(true);
    expect(component.editingId()).toBe('a1');
    expect(component.editingTeacherName()).toContain('Rossi Mario');
    expect(component.modalRate).toBe(20);

    mockApiService.assignAfterschool.mockReturnValue(of({}));
    component.submitModal();
    expect(component.showModal()).toBe(false);

    // Edit item without id, names, hourly_rate, notes
    component.editAssignment({ user_id: 'u-empty', email: 'empty@primola.it' } as any);
    expect(component.editingId()).toBe('u-empty');
    expect(component.modalRate).toBe(0);
    expect(component.modalNotes).toBe('');
  });

  it('should remove assignment when confirmed', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    component.removeAssignment(sampleAssignments[0]);
    expect(mockApiService.removeAfterschoolAssignment).not.toHaveBeenCalled();

    confirmSpy.mockReturnValue(true);
    mockApiService.removeAfterschoolAssignment.mockReturnValue(of({}));
    component.removeAssignment(sampleAssignments[0]);
    expect(mockApiService.removeAfterschoolAssignment).toHaveBeenCalledWith('u1');

    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    mockApiService.removeAfterschoolAssignment.mockReturnValue(throwError(() => ({})));
    component.removeAssignment(sampleAssignments[0]);
    expect(alertSpy).toHaveBeenCalledWith('Errore nella rimozione della commessa.');

    // Remove item without names
    component.removeAssignment({ user_id: 'u-empty' } as any);

    // Submit modal fallback error
    component.openAssignModal();
    component.selectedUserId = 'u3';
    component.modalRate = 22;
    mockApiService.assignAfterschool.mockReturnValue(throwError(() => ({})));
    component.submitModal();
    expect(component.modalError()).toBe("Errore durante l'assegnazione.");

    confirmSpy.mockRestore();
    alertSpy.mockRestore();
  });
});
