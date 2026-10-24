import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { adminGuard, adminOrOfficeGuard, reportsGuard } from './auth.guard';
import { signal } from '@angular/core';

describe('Auth Guards RBAC Tests', () => {
  let authServiceMock: any;
  let routerMock: any;

  beforeEach(() => {
    routerMock = {
      parseUrl: vi.fn((url: string) => url)
    };

    authServiceMock = {
      isAuthenticated: vi.fn(),
      isAdmin: vi.fn(),
      isOffice: vi.fn(),
      isTeacher: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock }
      ]
    });
  });

  describe('adminOrOfficeGuard', () => {
    it('allows access if user has ADMIN role', () => {
      authServiceMock.isAuthenticated.mockReturnValue(true);
      authServiceMock.isAdmin.mockReturnValue(true);
      authServiceMock.isOffice.mockReturnValue(false);

      const result = TestBed.runInInjectionContext(() => adminOrOfficeGuard({} as any, {} as any));
      expect(result).toBe(true);
    });

    it('allows access if user has OFFICE role', () => {
      authServiceMock.isAuthenticated.mockReturnValue(true);
      authServiceMock.isAdmin.mockReturnValue(false);
      authServiceMock.isOffice.mockReturnValue(true);

      const result = TestBed.runInInjectionContext(() => adminOrOfficeGuard({} as any, {} as any));
      expect(result).toBe(true);
    });

    it('redirects to /dashboard if user has only TEACHER role', () => {
      authServiceMock.isAuthenticated.mockReturnValue(true);
      authServiceMock.isAdmin.mockReturnValue(false);
      authServiceMock.isOffice.mockReturnValue(false);

      const result = TestBed.runInInjectionContext(() => adminOrOfficeGuard({} as any, {} as any));
      expect(routerMock.parseUrl).toHaveBeenCalledWith('/dashboard');
      expect(result).toBe('/dashboard');
    });
  });

  describe('reportsGuard', () => {
    it('allows access to ADMIN or OFFICE', () => {
      authServiceMock.isAuthenticated.mockReturnValue(true);
      authServiceMock.isAdmin.mockReturnValue(false);
      authServiceMock.isOffice.mockReturnValue(true);

      const result = TestBed.runInInjectionContext(() => reportsGuard({} as any, {} as any));
      expect(result).toBe(true);
    });

    it('blocks TEACHER and redirects to /dashboard', () => {
      authServiceMock.isAuthenticated.mockReturnValue(true);
      authServiceMock.isAdmin.mockReturnValue(false);
      authServiceMock.isOffice.mockReturnValue(false);

      const result = TestBed.runInInjectionContext(() => reportsGuard({} as any, {} as any));
      expect(routerMock.parseUrl).toHaveBeenCalledWith('/dashboard');
      expect(result).toBe('/dashboard');
    });
  });
});
