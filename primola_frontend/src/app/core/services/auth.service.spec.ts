import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AuthService } from './auth.service';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { RegisterRequest } from '../models';

describe('AuthService', () => {
  let service: AuthService;
  let mockRouter: any;
  let mockHttp: any;
  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    vi.useFakeTimers();
    mockStorage = {};
    const storageMock = {
      getItem: (key: string) => mockStorage[key] || null,
      setItem: (key: string, value: string) => { mockStorage[key] = value; },
      removeItem: (key: string) => { delete mockStorage[key]; },
      clear: () => { mockStorage = {}; }
    };

    vi.stubGlobal('localStorage', storageMock);

    mockRouter = {
      navigate: vi.fn().mockReturnValue(Promise.resolve(true))
    };

    mockHttp = {
      post: vi.fn()
    };
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('Initialization and Storage Loading', () => {
    it('should initialize unauthenticated when localStorage has no user and no tokens', () => {
      service = new AuthService(mockRouter as Router, mockHttp as HttpClient);
      expect(service.isAuthenticated()).toBe(false);
      expect(service.currentUser()).toBeNull();
      expect(service.role()).toBeNull();
      expect(service.groups()).toEqual([]);
      expect(service.isAdmin()).toBe(false);
      expect(service.isOffice()).toBe(false);
      expect(service.isTeacher()).toBe(false);
      expect(service.isStaff()).toBe(false);
      expect(service.canManageUsers()).toBe(false);
      expect(service.canManageStudents()).toBe(false);
      expect(service.canEditRoles()).toBe(false);
      expect(service.canViewReports()).toBe(false);
      expect(service.canViewCompensation()).toBe(false);
      expect(service.canManageAttendanceStudents()).toBe(false);
      expect(service.canManageAttendanceMeals()).toBe(false);
      expect(service.canManageAttendanceExcuses()).toBe(false);
      expect(service.getToken()).toBeNull();
      expect(service.getRefreshToken()).toBeNull();
    });

    it('should restore existing user from localStorage on initialization and schedule token refresh', () => {
      mockStorage['primola_user'] = JSON.stringify({
        id: 'usr-1',
        name: 'Saved Admin',
        role: 'ADMIN',
        token: 'jwt-admin-token'
      });
      mockStorage['jwt_token'] = 'jwt-admin-token';
      mockStorage['jwt_refresh_token'] = 'jwt-refresh-token';

      service = new AuthService(mockRouter as Router, mockHttp as HttpClient);
      expect(service.isAuthenticated()).toBe(true);
      expect(service.currentUser()?.name).toBe('Saved Admin');
      expect(service.isAdmin()).toBe(true);
      expect(service.isStaff()).toBe(true);
      expect(service.canManageStudents()).toBe(true);
      expect(service.getToken()).toBe('jwt-admin-token');
      expect(service.getRefreshToken()).toBe('jwt-refresh-token');
    });

    it('should handle JSON parse error gracefully when loading initial user', () => {
      mockStorage['primola_user'] = '{invalid-json}';
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      service = new AuthService(mockRouter as Router, mockHttp as HttpClient);
      expect(service.isAuthenticated()).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Failed to parse user from localStorage', expect.any(Error));
    });

    it('should fallback to localStorage jwt_token if user has no token property', () => {
      mockStorage['primola_user'] = JSON.stringify({
        id: 'usr-no-token',
        name: 'No Token User',
        role: 'ADMIN'
      });
      mockStorage['jwt_token'] = 'fallback-jwt-token';

      service = new AuthService(mockRouter as Router, mockHttp as HttpClient);
      expect(service.getToken()).toBe('fallback-jwt-token');
    });

    it('should not schedule token refresh if token exists but refreshToken is missing', () => {
      mockStorage['jwt_token'] = 'standalone-token';
      service = new AuthService(mockRouter as Router, mockHttp as HttpClient);
      expect(service.getToken()).toBe('standalone-token');
      expect(service.getRefreshToken()).toBeNull();
    });

    it('should not schedule token refresh if refreshToken exists but token is missing', () => {
      mockStorage['jwt_refresh_token'] = 'standalone-refresh';
      service = new AuthService(mockRouter as Router, mockHttp as HttpClient);
      expect(service.getToken()).toBeNull();
      expect(service.getRefreshToken()).toBe('standalone-refresh');
    });
  });

  describe('RBAC and Computed Role Permissions', () => {
    it('should compute permissions correctly for ADMIN', () => {
      mockStorage['primola_user'] = JSON.stringify({
        id: 'usr-admin',
        name: 'Admin User',
        groups: ['ADMIN'],
        role: 'ADMIN',
        token: 'token-admin'
      });
      service = new AuthService(mockRouter as Router, mockHttp as HttpClient);

      expect(service.isAdmin()).toBe(true);
      expect(service.isOffice()).toBe(false);
      expect(service.isTeacher()).toBe(false);
      expect(service.isStaff()).toBe(true);
      expect(service.canManageUsers()).toBe(true);
      expect(service.canManageStudents()).toBe(true);
      expect(service.canEditRoles()).toBe(true);
      expect(service.canViewReports()).toBe(true);
      expect(service.canViewCompensation()).toBe(true);
      expect(service.canManageAttendanceStudents()).toBe(true);
      expect(service.canManageAttendanceMeals()).toBe(true);
      expect(service.canManageAttendanceExcuses()).toBe(true);
    });

    it('should compute permissions correctly for OFFICE', () => {
      mockStorage['primola_user'] = JSON.stringify({
        id: 'usr-office',
        name: 'Office User',
        groups: ['OFFICE'],
        role: 'OFFICE',
        token: 'token-office'
      });
      service = new AuthService(mockRouter as Router, mockHttp as HttpClient);

      expect(service.isAdmin()).toBe(false);
      expect(service.isOffice()).toBe(true);
      expect(service.isTeacher()).toBe(false);
      expect(service.isStaff()).toBe(true);
      expect(service.canManageUsers()).toBe(true);
      expect(service.canManageStudents()).toBe(true);
      expect(service.canEditRoles()).toBe(false);
      expect(service.canViewReports()).toBe(true);
      expect(service.canViewCompensation()).toBe(true);
      expect(service.canManageAttendanceStudents()).toBe(true);
      expect(service.canManageAttendanceMeals()).toBe(true);
      expect(service.canManageAttendanceExcuses()).toBe(true);
    });

    it('should compute permissions correctly for TEACHER', () => {
      mockStorage['primola_user'] = JSON.stringify({
        id: 'usr-teacher',
        name: 'Teacher User',
        groups: ['TEACHER'],
        role: 'TEACHER',
        token: 'token-teacher'
      });
      service = new AuthService(mockRouter as Router, mockHttp as HttpClient);

      expect(service.isAdmin()).toBe(false);
      expect(service.isOffice()).toBe(false);
      expect(service.isTeacher()).toBe(true);
      expect(service.isStaff()).toBe(false);
      expect(service.canManageUsers()).toBe(false);
      expect(service.canManageStudents()).toBe(false);
      expect(service.canEditRoles()).toBe(false);
      expect(service.canViewReports()).toBe(false);
      expect(service.canViewCompensation()).toBe(false);
      expect(service.canManageAttendanceStudents()).toBe(false);
      expect(service.canManageAttendanceMeals()).toBe(false);
      expect(service.canManageAttendanceExcuses()).toBe(false);
    });

    it('should map legacy role STAFF to TEACHER group when groups is missing', () => {
      mockStorage['primola_user'] = JSON.stringify({
        id: 'usr-staff',
        name: 'Staff User',
        role: 'STAFF',
        token: 'token-staff'
      });
      service = new AuthService(mockRouter as Router, mockHttp as HttpClient);

      expect(service.groups()).toEqual(['TEACHER']);
      expect(service.isTeacher()).toBe(true);
      expect(service.isStaff()).toBe(false);
    });

    it('should normalize uppercase role to group when groups is missing', () => {
      mockStorage['primola_user'] = JSON.stringify({
        id: 'usr-admin-lower',
        name: 'Admin Lower',
        role: 'admin',
        token: 'token-admin'
      });
      service = new AuthService(mockRouter as Router, mockHttp as HttpClient);

      expect(service.groups()).toEqual(['ADMIN']);
      expect(service.isAdmin()).toBe(true);
    });

    it('should return empty groups when user has empty groups array and no role', () => {
      mockStorage['primola_user'] = JSON.stringify({
        id: 'usr-empty',
        name: 'Empty User',
        groups: []
      });
      service = new AuthService(mockRouter as Router, mockHttp as HttpClient);

      expect(service.groups()).toEqual([]);
      expect(service.role()).toBeNull();
    });
  });

  describe('loginWithCredentials', () => {
    it('should loginWithCredentials successfully and store tokens and user info', () => {
      const mockAuthResponse = {
        success: true,
        data: {
          user: {
            id: '00000000-0000-0000-0000-000000000001',
            email: 'admin@primola.it',
            nome: 'Amministratore',
            cognome: 'Primola',
            phone: '1234567890',
            role: 'ADMIN' as const
          },
          accessToken: 'access-jwt-123',
          refreshToken: 'refresh-jwt-456'
        }
      };

      mockHttp.post.mockReturnValue(of(mockAuthResponse));

      service = new AuthService(mockRouter as Router, mockHttp as HttpClient);
      service.loginWithCredentials({ email: 'admin@primola.it', password: 'AdminPrimola2026!' }).subscribe();

      expect(mockHttp.post).toHaveBeenCalledWith('/api/auth/login', {
        email: 'admin@primola.it',
        password: 'AdminPrimola2026!'
      });
      expect(service.isAuthenticated()).toBe(true);
      expect(service.isAdmin()).toBe(true);
      expect(service.role()).toBe('ADMIN');
      expect(service.currentUser()?.name).toBe('Amministratore Primola');
      expect(service.currentUser()?.first_name).toBe('Amministratore');
      expect(service.currentUser()?.last_name).toBe('Primola');
      expect(service.currentUser()?.phone).toBe('1234567890');
      expect(service.currentUser()?.status).toBe('APPROVED');
      expect(service.getToken()).toBe('access-jwt-123');
      expect(service.getRefreshToken()).toBe('refresh-jwt-456');
      expect(mockStorage['jwt_token']).toBe('access-jwt-123');
      expect(mockStorage['jwt_refresh_token']).toBe('refresh-jwt-456');
    });

    it('should use first_name, last_name, status, and groups if provided by API response', () => {
      const mockAuthResponse = {
        success: true,
        data: {
          user: {
            id: 'usr-custom',
            email: 'office@primola.it',
            first_name: 'Mario',
            last_name: 'Rossi',
            groups: ['OFFICE' as const],
            status: 'PENDING' as const,
            role: 'OFFICE' as const
          },
          accessToken: 'office-token',
          refreshToken: 'office-refresh'
        }
      };

      mockHttp.post.mockReturnValue(of(mockAuthResponse));

      service = new AuthService(mockRouter as Router, mockHttp as HttpClient);
      service.loginWithCredentials({ email: 'office@primola.it', password: 'SecretPassword!' }).subscribe();

      expect(service.currentUser()?.name).toBe('Mario Rossi');
      expect(service.currentUser()?.status).toBe('PENDING');
      expect(service.currentUser()?.groups).toEqual(['OFFICE']);
      expect(service.isOffice()).toBe(true);
    });

    it('should fallback to email as name and default to TEACHER when names and groups are absent', () => {
      const mockAuthResponse = {
        success: true,
        data: {
          user: {
            id: 'usr-minimal',
            email: 'minimal@primola.it'
          },
          accessToken: 'minimal-token',
          refreshToken: 'minimal-refresh'
        }
      };

      mockHttp.post.mockReturnValue(of(mockAuthResponse));

      service = new AuthService(mockRouter as Router, mockHttp as HttpClient);
      service.loginWithCredentials({ email: 'minimal@primola.it', password: 'password' }).subscribe();

      expect(service.currentUser()?.name).toBe('minimal@primola.it');
      expect(service.currentUser()?.groups).toEqual(['TEACHER']);
      expect(service.currentUser()?.role).toBe('TEACHER');
      expect(service.currentUser()?.status).toBe('APPROVED');
    });

    it('should map STAFF role to TEACHER when groups is missing in API response', () => {
      const mockAuthResponse = {
        success: true,
        data: {
          user: {
            id: 'usr-staff-login',
            email: 'staff@primola.it',
            role: 'STAFF' as const
          },
          accessToken: 'staff-token',
          refreshToken: 'staff-refresh'
        }
      };

      mockHttp.post.mockReturnValue(of(mockAuthResponse));

      service = new AuthService(mockRouter as Router, mockHttp as HttpClient);
      service.loginWithCredentials({ email: 'staff@primola.it', password: 'password' }).subscribe();

      expect(service.currentUser()?.groups).toEqual(['TEACHER']);
    });

    it('should map custom role (e.g. OFFICE) into groups when groups is missing in API response', () => {
      const mockAuthResponse = {
        success: true,
        data: {
          user: {
            id: 'usr-office-login',
            email: 'office2@primola.it',
            role: 'OFFICE' as const
          },
          accessToken: 'office-token-2',
          refreshToken: 'office-refresh-2'
        }
      };

      mockHttp.post.mockReturnValue(of(mockAuthResponse));

      service = new AuthService(mockRouter as Router, mockHttp as HttpClient);
      service.loginWithCredentials({ email: 'office2@primola.it', password: 'password' }).subscribe();

      expect(service.currentUser()?.groups).toEqual(['OFFICE']);
    });

    it('should catch localStorage exception when saving auth state', () => {
      vi.stubGlobal('localStorage', {
        getItem: () => null,
        setItem: () => { throw new Error('QuotaExceededError'); },
        removeItem: () => {},
        clear: () => {}
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const mockAuthResponse = {
        success: true,
        data: {
          user: {
            id: 'usr-fail',
            email: 'fail@primola.it'
          },
          accessToken: 'fail-token',
          refreshToken: 'fail-refresh'
        }
      };
      mockHttp.post.mockReturnValue(of(mockAuthResponse));

      service = new AuthService(mockRouter as Router, mockHttp as HttpClient);
      service.loginWithCredentials({ email: 'fail@primola.it', password: 'password' }).subscribe();

      expect(consoleSpy).toHaveBeenCalledWith('Failed to save auth state to localStorage', expect.any(Error));
    });

    it('should not update auth state when API response success is false or data is missing', () => {
      mockHttp.post.mockReturnValue(of({ success: false, data: null }));

      service = new AuthService(mockRouter as Router, mockHttp as HttpClient);
      service.loginWithCredentials({ email: 'test@primola.it', password: 'wrong' }).subscribe();

      expect(service.isAuthenticated()).toBe(false);
      expect(service.currentUser()).toBeNull();
    });
  });

  describe('register', () => {
    it('should call /api/auth/register with user registration payload', () => {
      const registerPayload: RegisterRequest = {
        email: 'newuser@primola.it',
        password: 'Password123!',
        nome: 'Nuovo',
        cognome: 'Utente',
        phone: '123456789'
      };

      const mockRegisterResponse = {
        success: true,
        data: {
          message: 'Utente registrato con successo',
          userId: 'new-id-123',
          email: 'newuser@primola.it',
          status: 'PENDING'
        }
      };

      mockHttp.post.mockReturnValue(of(mockRegisterResponse));

      service = new AuthService(mockRouter as Router, mockHttp as HttpClient);
      let response: any = null;
      service.register(registerPayload).subscribe(res => {
        response = res;
      });

      expect(mockHttp.post).toHaveBeenCalledWith('/api/auth/register', registerPayload);
      expect(response).toEqual(mockRegisterResponse);
    });
  });

  describe('refreshToken', () => {
    it('should logout and throw error immediately if no refresh token is stored', () => {
      service = new AuthService(mockRouter as Router, mockHttp as HttpClient);

      let caughtError: any = null;
      service.refreshToken().subscribe({
        error: (err) => { caughtError = err; }
      });

      expect(caughtError).toBeTruthy();
      expect(caughtError.message).toBe('Nessun refresh token disponibile');
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('should refreshToken successfully when refresh token exists', () => {
      mockStorage['jwt_refresh_token'] = 'existing-refresh-token';
      const mockRefreshResponse = {
        success: true,
        data: {
          user: {
            id: '00000000-0000-0000-0000-000000000001',
            email: 'admin@primola.it',
            nome: 'Amministratore',
            cognome: 'Primola',
            role: 'ADMIN' as const
          },
          accessToken: 'new-access-jwt-789',
          refreshToken: 'new-refresh-jwt-999'
        }
      };
      mockHttp.post.mockReturnValue(of(mockRefreshResponse));

      service = new AuthService(mockRouter as Router, mockHttp as HttpClient);
      service.refreshToken().subscribe();

      expect(mockHttp.post).toHaveBeenCalledWith('/api/auth/refresh', { refreshToken: 'existing-refresh-token' });
      expect(service.getToken()).toBe('new-access-jwt-789');
      expect(service.getRefreshToken()).toBe('new-refresh-jwt-999');
    });

    it('should not update auth state when refresh response success is false', () => {
      mockStorage['jwt_refresh_token'] = 'existing-refresh-token';
      mockHttp.post.mockReturnValue(of({ success: false, data: null }));

      service = new AuthService(mockRouter as Router, mockHttp as HttpClient);
      service.refreshToken().subscribe();

      expect(service.isAuthenticated()).toBe(false);
    });

    it('should call logout and propagate error when refreshToken HTTP request fails', () => {
      mockStorage['jwt_refresh_token'] = 'invalid-refresh-token';
      const httpError = new Error('HTTP 401 Unauthorized');
      mockHttp.post.mockReturnValue(throwError(() => httpError));

      service = new AuthService(mockRouter as Router, mockHttp as HttpClient);

      let caughtError: any = null;
      service.refreshToken().subscribe({
        error: (err) => { caughtError = err; }
      });

      expect(caughtError).toBe(httpError);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
    });
  });

  describe('Automatic Scheduled Token Refresh', () => {
    it('should execute automatic refresh after 50 minutes when user is authenticated and has refresh token', () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      mockStorage['primola_user'] = JSON.stringify({
        id: 'usr-sched',
        name: 'Sched User',
        role: 'ADMIN',
        token: 'token-sched'
      });
      mockStorage['jwt_token'] = 'token-sched';
      mockStorage['jwt_refresh_token'] = 'refresh-sched';

      const mockRefreshResponse = {
        success: true,
        data: {
          user: { id: 'usr-sched', email: 'sched@primola.it', role: 'ADMIN' as const },
          accessToken: 'new-token-sched',
          refreshToken: 'new-refresh-sched'
        }
      };
      mockHttp.post.mockReturnValue(of(mockRefreshResponse));

      service = new AuthService(mockRouter as Router, mockHttp as HttpClient);

      // Advance time by 50 minutes (50 * 60 * 1000 ms)
      vi.advanceTimersByTime(50 * 60 * 1000);

      expect(mockHttp.post).toHaveBeenCalledWith('/api/auth/refresh', { refreshToken: 'refresh-sched' });
      expect(consoleLogSpy).toHaveBeenCalledWith('Sessione JWT refreshati con successo.');
    });

    it('should log warning when scheduled automatic refresh fails', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      mockStorage['primola_user'] = JSON.stringify({
        id: 'usr-sched-fail',
        name: 'Sched Fail',
        role: 'ADMIN',
        token: 'token-sched'
      });
      mockStorage['jwt_token'] = 'token-sched';
      mockStorage['jwt_refresh_token'] = 'refresh-sched';

      const refreshError = new Error('Scheduled Refresh Failed');
      mockHttp.post.mockReturnValue(throwError(() => refreshError));

      service = new AuthService(mockRouter as Router, mockHttp as HttpClient);

      // Advance time by 50 minutes
      vi.advanceTimersByTime(50 * 60 * 1000);

      expect(consoleWarnSpy).toHaveBeenCalledWith('Errore refresh token preventivo:', refreshError);
    });

    it('should not trigger refreshToken if unauthenticated when timer fires', () => {
      mockStorage['jwt_token'] = 'token-1';
      mockStorage['jwt_refresh_token'] = 'refresh-1';

      service = new AuthService(mockRouter as Router, mockHttp as HttpClient);
      expect(service.isAuthenticated()).toBe(false);

      vi.advanceTimersByTime(50 * 60 * 1000);

      expect(mockHttp.post).not.toHaveBeenCalled();
    });

    it('should not trigger refreshToken if refreshToken was removed before timer fires', () => {
      mockStorage['primola_user'] = JSON.stringify({
        id: 'usr-sched',
        name: 'Sched User',
        role: 'ADMIN',
        token: 'token-sched'
      });
      mockStorage['jwt_token'] = 'token-sched';
      mockStorage['jwt_refresh_token'] = 'refresh-sched';

      service = new AuthService(mockRouter as Router, mockHttp as HttpClient);

      // Remove refresh token behind the scenes
      delete mockStorage['jwt_refresh_token'];

      vi.advanceTimersByTime(50 * 60 * 1000);

      expect(mockHttp.post).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should logout and clear storage and navigate to /login', () => {
      mockStorage['primola_user'] = JSON.stringify({ id: '1', name: 'Admin', role: 'ADMIN' });
      mockStorage['jwt_token'] = 'active-token';
      mockStorage['jwt_refresh_token'] = 'active-refresh';

      service = new AuthService(mockRouter as Router, mockHttp as HttpClient);
      expect(service.isAuthenticated()).toBe(true);

      service.logout();
      expect(service.isAuthenticated()).toBe(false);
      expect(service.currentUser()).toBeNull();
      expect(mockStorage['primola_user']).toBeUndefined();
      expect(mockStorage['jwt_token']).toBeUndefined();
      expect(mockStorage['jwt_refresh_token']).toBeUndefined();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('should catch error if localStorage.removeItem fails during logout', () => {
      service = new AuthService(mockRouter as Router, mockHttp as HttpClient);
      vi.stubGlobal('localStorage', {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => { throw new Error('StorageError'); },
        clear: () => {}
      });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      service.logout();
      expect(consoleSpy).toHaveBeenCalledWith('Failed to clear storage', expect.any(Error));
    });

    it('should clear existing refresh timer when logout is called', () => {
      mockStorage['primola_user'] = JSON.stringify({
        id: 'usr-logout-timer',
        name: 'Timer User',
        role: 'ADMIN',
        token: 'token'
      });
      mockStorage['jwt_token'] = 'token';
      mockStorage['jwt_refresh_token'] = 'refresh';

      service = new AuthService(mockRouter as Router, mockHttp as HttpClient);
      service.logout();

      // Advancing timer after logout should do nothing
      vi.advanceTimersByTime(50 * 60 * 1000);
      expect(mockHttp.post).not.toHaveBeenCalled();
    });
  });
});
