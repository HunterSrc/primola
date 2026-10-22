import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { authGuard, adminGuard, guestGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';
import { Router, UrlTree } from '@angular/router';
import { TestBed } from '@angular/core/testing';

describe('Auth Guards', () => {
  let mockAuthService: any;
  let mockRouter: any;

  beforeEach(() => {
    mockAuthService = {
      isAuthenticated: vi.fn(),
      isAdmin: vi.fn()
    };

    mockRouter = {
      parseUrl: vi.fn((url: string) => ({ url } as unknown as UrlTree))
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter }
      ]
    });
  });

  describe('authGuard', () => {
    it('should allow access if user is authenticated', () => {
      mockAuthService.isAuthenticated.mockReturnValue(true);
      const result = TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));
      expect(result).toBe(true);
    });

    it('should redirect to /login if user is not authenticated', () => {
      mockAuthService.isAuthenticated.mockReturnValue(false);
      const result = TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));
      expect(result).toEqual({ url: '/login' });
      expect(mockRouter.parseUrl).toHaveBeenCalledWith('/login');
    });
  });

  describe('adminGuard', () => {
    it('should allow access if user is authenticated and isAdmin', () => {
      mockAuthService.isAuthenticated.mockReturnValue(true);
      mockAuthService.isAdmin.mockReturnValue(true);
      const result = TestBed.runInInjectionContext(() => adminGuard({} as any, {} as any));
      expect(result).toBe(true);
    });

    it('should redirect to /dashboard if user is authenticated but not admin', () => {
      mockAuthService.isAuthenticated.mockReturnValue(true);
      mockAuthService.isAdmin.mockReturnValue(false);
      const result = TestBed.runInInjectionContext(() => adminGuard({} as any, {} as any));
      expect(result).toEqual({ url: '/dashboard' });
      expect(mockRouter.parseUrl).toHaveBeenCalledWith('/dashboard');
    });

    it('should redirect to /dashboard if user is not authenticated', () => {
      mockAuthService.isAuthenticated.mockReturnValue(false);
      mockAuthService.isAdmin.mockReturnValue(false);
      const result = TestBed.runInInjectionContext(() => adminGuard({} as any, {} as any));
      expect(result).toEqual({ url: '/dashboard' });
      expect(mockRouter.parseUrl).toHaveBeenCalledWith('/dashboard');
    });
  });

  describe('guestGuard', () => {
    it('should allow access if user is not authenticated', () => {
      mockAuthService.isAuthenticated.mockReturnValue(false);
      const result = TestBed.runInInjectionContext(() => guestGuard({} as any, {} as any));
      expect(result).toBe(true);
    });

    it('should redirect to /dashboard if user is already authenticated', () => {
      mockAuthService.isAuthenticated.mockReturnValue(true);
      const result = TestBed.runInInjectionContext(() => guestGuard({} as any, {} as any));
      expect(result).toEqual({ url: '/dashboard' });
      expect(mockRouter.parseUrl).toHaveBeenCalledWith('/dashboard');
    });
  });
});
