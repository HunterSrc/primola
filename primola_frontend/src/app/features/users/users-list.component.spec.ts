import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { UsersListComponent } from './users-list.component';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models/user.model';

describe('UsersListComponent', () => {
  let component: UsersListComponent;
  let mockApiService: any;
  let mockAuthService: any;
  let mockRouter: any;

  const sampleUsers: User[] = [
    {
      id: 'u1',
      email: 'admin@primola.it',
      first_name: 'Mario',
      last_name: 'Rossi',
      phone: '333111222',
      groups: ['ADMIN'],
      status: 'APPROVED'
    },
    {
      id: 'u2',
      email: 'pending@primola.it',
      first_name: 'Luca',
      last_name: 'Bianchi',
      groups: ['TEACHER'],
      status: 'PENDING'
    },
    {
      id: 'u3',
      email: 'rejected@primola.it',
      groups: ['TEACHER'],
      status: 'REJECTED'
    }
  ];

  beforeEach(() => {
    mockApiService = {
      getUsers: vi.fn().mockReturnValue(of(sampleUsers)),
      updateUserStatus: vi.fn(),
      deleteUser: vi.fn()
    };

    mockAuthService = {
      isAdmin: vi.fn().mockReturnValue(true),
      isOffice: vi.fn().mockReturnValue(false),
      currentUser: vi.fn().mockReturnValue({ id: 'u1', email: 'admin@primola.it' })
    };

    mockRouter = {
      navigate: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        UsersListComponent,
        { provide: ApiService, useValue: mockApiService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter }
      ]
    });

    component = TestBed.inject(UsersListComponent);
  });

  it('should redirect pure teacher to their own profile on init', () => {
    mockAuthService.isAdmin.mockReturnValue(false);
    mockAuthService.isOffice.mockReturnValue(false);
    mockAuthService.currentUser.mockReturnValue({ id: 'teacher-1' });

    component.ngOnInit();

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/users', 'teacher-1']);
    expect(mockApiService.getUsers).not.toHaveBeenCalled();

    // When currentUser has no id
    mockAuthService.currentUser.mockReturnValue(null);
    component.ngOnInit();
    expect(mockApiService.getUsers).toHaveBeenCalled();
  });

  it('should load users on init for admin/office and compute pendingCount', () => {
    component.ngOnInit();

    expect(mockApiService.getUsers).toHaveBeenCalled();
    expect(component.users()).toHaveLength(3);
    expect(component.loading()).toBe(false);
    expect(component.pendingCount()).toBe(1);
  });

  it('should handle error when loading users fails', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockApiService.getUsers.mockReturnValue(throwError(() => new Error('Network error')));

    component.loadUsers();

    expect(component.loading()).toBe(false);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should filter users by status and search term', () => {
    component.users.set(sampleUsers);

    component.setStatusFilter('PENDING');
    expect(component.filteredUsers().map(u => u.id)).toEqual(['u2']);

    component.setStatusFilter('ALL');
    component.updateSearch({ target: { value: '333111' } } as unknown as Event);
    expect(component.filteredUsers().map(u => u.id)).toEqual(['u1']);

    component.updateSearch({ target: { value: 'bianchi' } } as unknown as Event);
    expect(component.filteredUsers().map(u => u.id)).toEqual(['u2']);

    component.updateSearch({ target: { value: 'rejected@primola.it' } } as unknown as Event);
    expect(component.filteredUsers().map(u => u.id)).toEqual(['u3']);
  });

  it('should change user status when confirmed and handle errors', () => {
    component.users.set(sampleUsers);
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    component.changeStatus(sampleUsers[1], 'APPROVED');
    expect(mockApiService.updateUserStatus).not.toHaveBeenCalled();

    confirmSpy.mockReturnValue(true);
    mockApiService.updateUserStatus.mockReturnValue(of({}));
    component.changeStatus(sampleUsers[1], 'APPROVED');

    expect(mockApiService.updateUserStatus).toHaveBeenCalledWith('u2', 'APPROVED');
    expect(component.users().find(u => u.id === 'u2')?.status).toBe('APPROVED');

    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    mockApiService.updateUserStatus.mockReturnValue(throwError(() => ({})));
    component.changeStatus(sampleUsers[1], 'REJECTED');
    expect(alertSpy).toHaveBeenCalledWith("Errore durante l'aggiornamento dello stato.");

    confirmSpy.mockRestore();
    alertSpy.mockRestore();
  });

  it('should delete user when confirmed and handle errors', () => {
    component.users.set(sampleUsers);
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    component.deleteUser(sampleUsers[2]);
    expect(mockApiService.deleteUser).not.toHaveBeenCalled();

    confirmSpy.mockReturnValue(true);
    mockApiService.deleteUser.mockReturnValue(of({}));
    component.deleteUser(sampleUsers[2]);

    expect(mockApiService.deleteUser).toHaveBeenCalledWith('u3');
    expect(component.users().find(u => u.id === 'u3')).toBeUndefined();

    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    mockApiService.deleteUser.mockReturnValue(throwError(() => ({})));
    component.deleteUser(sampleUsers[1]);
    expect(alertSpy).toHaveBeenCalledWith("Errore durante l'eliminazione dell'utente.");

    confirmSpy.mockRestore();
    alertSpy.mockRestore();
  });
});
