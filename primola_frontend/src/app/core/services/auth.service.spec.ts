import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from './auth.service';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';

describe('AuthService', () => {
  let service: AuthService;
  let mockRouter: any;
  let mockHttp: any;
  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
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

  it('should initialize unauthenticated when localStorage has no user', () => {
    service = new AuthService(mockRouter as Router, mockHttp as HttpClient);
    expect(service.isAuthenticated()).toBe(false);
    expect(service.currentUser()).toBeNull();
    expect(service.role()).toBeNull();
    expect(service.isAdmin()).toBe(false);
    expect(service.isStaff()).toBe(false);
    expect(service.getToken()).toBeNull();
    expect(service.getRefreshToken()).toBeNull();
  });

  it('should restore existing user from localStorage on initialization', () => {
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
    expect(service.getToken()).toBe('jwt-admin-token');
    expect(service.getRefreshToken()).toBe('jwt-refresh-token');
  });

  it('should handle JSON parse error gracefully when loading initial user', () => {
    mockStorage['primola_user'] = '{invalid-json}';
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    service = new AuthService(mockRouter as Router, mockHttp as HttpClient);
    expect(service.isAuthenticated()).toBe(false);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should loginWithCredentials successfully and store tokens', () => {
    const mockAuthResponse = {
      success: true,
      data: {
        user: {
          id: '00000000-0000-0000-0000-000000000001',
          email: 'admin@primola.it',
          nome: 'Amministratore',
          cognome: 'Primola',
          role: 'ADMIN' as const
        },
        accessToken: 'access-jwt-123',
        refreshToken: 'refresh-jwt-456'
      }
    };

    mockHttp.post.mockReturnValue(of(mockAuthResponse));

    service = new AuthService(mockRouter as Router, mockHttp as HttpClient);
    service.loginWithCredentials({ email: 'admin@primola.it', password: 'AdminPrimola2026!' }).subscribe();

    expect(service.isAuthenticated()).toBe(true);
    expect(service.isAdmin()).toBe(true);
    expect(service.role()).toBe('ADMIN');
    expect(service.getToken()).toBe('access-jwt-123');
    expect(service.getRefreshToken()).toBe('refresh-jwt-456');
    expect(mockStorage['jwt_token']).toBe('access-jwt-123');
    expect(mockStorage['jwt_refresh_token']).toBe('refresh-jwt-456');
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

    expect(service.getToken()).toBe('new-access-jwt-789');
    expect(service.getRefreshToken()).toBe('new-refresh-jwt-999');
  });

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
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
