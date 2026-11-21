import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { jwtInterceptor } from './jwt.interceptor';
import { AuthService } from '../services/auth.service';

describe('jwtInterceptor', () => {
  let mockAuthService: any;

  beforeEach(() => {
    mockAuthService = {
      getToken: vi.fn(),
      getRefreshToken: vi.fn(),
      refreshToken: vi.fn(),
      logout: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuthService }
      ]
    });
  });

  describe('Request token attachment', () => {
    it('should attach Bearer token to request headers when token is present on standard endpoints', () => {
      mockAuthService.getToken.mockReturnValue('jwt-token-xyz');

      const originalReq = new HttpRequest('GET', '/api/students');
      let capturedReq: any = null;

      const nextFn: HttpHandlerFn = (req) => {
        capturedReq = req;
        return of({} as any);
      };

      TestBed.runInInjectionContext(() => {
        jwtInterceptor(originalReq, nextFn).subscribe();
      });

      expect(capturedReq).toBeTruthy();
      expect(capturedReq.headers.get('Authorization')).toBe('Bearer jwt-token-xyz');
    });

    it('should attach Bearer token to external or other requests when token is present', () => {
      mockAuthService.getToken.mockReturnValue('jwt-token-xyz');

      const originalReq = new HttpRequest('GET', 'https://api.external.com/data');
      let capturedReq: any = null;

      const nextFn: HttpHandlerFn = (req) => {
        capturedReq = req;
        return of({} as any);
      };

      TestBed.runInInjectionContext(() => {
        jwtInterceptor(originalReq, nextFn).subscribe();
      });

      expect(capturedReq.headers.get('Authorization')).toBe('Bearer jwt-token-xyz');
    });

    it('should not modify headers when no token is available', () => {
      mockAuthService.getToken.mockReturnValue(null);

      const originalReq = new HttpRequest('GET', '/api/public');
      let capturedReq: any = null;

      const nextFn: HttpHandlerFn = (req) => {
        capturedReq = req;
        return of({} as any);
      };

      TestBed.runInInjectionContext(() => {
        jwtInterceptor(originalReq, nextFn).subscribe();
      });

      expect(capturedReq).toBeTruthy();
      expect(capturedReq.headers.has('Authorization')).toBe(false);
    });

    it('should not attach Bearer token when url is /api/auth/login even if token is present', () => {
      mockAuthService.getToken.mockReturnValue('jwt-token-xyz');

      const originalReq = new HttpRequest('POST', '/api/auth/login');
      let capturedReq: any = null;

      const nextFn: HttpHandlerFn = (req) => {
        capturedReq = req;
        return of({} as any);
      };

      TestBed.runInInjectionContext(() => {
        jwtInterceptor(originalReq, nextFn).subscribe();
      });

      expect(capturedReq.headers.has('Authorization')).toBe(false);
    });

    it('should not attach Bearer token when url is /api/auth/refresh even if token is present', () => {
      mockAuthService.getToken.mockReturnValue('jwt-token-xyz');

      const originalReq = new HttpRequest('POST', '/api/auth/refresh');
      let capturedReq: any = null;

      const nextFn: HttpHandlerFn = (req) => {
        capturedReq = req;
        return of({} as any);
      };

      TestBed.runInInjectionContext(() => {
        jwtInterceptor(originalReq, nextFn).subscribe();
      });

      expect(capturedReq.headers.has('Authorization')).toBe(false);
    });
  });

  describe('Error handling & Token Refresh', () => {
    it('should attempt refresh and retry when 401 Unauthorized is intercepted with refresh token', () => {
      mockAuthService.getToken.mockReturnValue('expired-jwt');
      mockAuthService.getRefreshToken.mockReturnValue('valid-refresh');
      mockAuthService.refreshToken.mockReturnValue(of({
        success: true,
        data: { accessToken: 'refreshed-jwt-token' }
      }));

      const originalReq = new HttpRequest('GET', '/api/protected');
      const errorResponse = new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' });

      let callCount = 0;
      let finalReq: any = null;
      const nextFn: HttpHandlerFn = (req) => {
        callCount++;
        if (callCount === 1) {
          return throwError(() => errorResponse);
        }
        finalReq = req;
        return of({ success: true } as any);
      };

      TestBed.runInInjectionContext(() => {
        jwtInterceptor(originalReq, nextFn).subscribe();
      });

      expect(mockAuthService.refreshToken).toHaveBeenCalledTimes(1);
      expect(finalReq.headers.get('Authorization')).toBe('Bearer refreshed-jwt-token');
    });

    it('should call logout and propagate error when 401 occurs and refresh attempt fails', () => {
      mockAuthService.getToken.mockReturnValue('expired-jwt');
      mockAuthService.getRefreshToken.mockReturnValue('invalid-refresh');
      const refreshError = new Error('Refresh failed');
      mockAuthService.refreshToken.mockReturnValue(throwError(() => refreshError));

      const originalReq = new HttpRequest('GET', '/api/protected');
      const errorResponse = new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' });

      const nextFn: HttpHandlerFn = () => throwError(() => errorResponse);

      let caughtError: any = null;
      TestBed.runInInjectionContext(() => {
        jwtInterceptor(originalReq, nextFn).subscribe({
          error: (err) => { caughtError = err; }
        });
      });

      expect(mockAuthService.refreshToken).toHaveBeenCalledTimes(1);
      expect(mockAuthService.logout).toHaveBeenCalledTimes(1);
      expect(caughtError).toBe(refreshError);
    });

    it('should trigger logout when 401 occurs on protected endpoint and no refresh token is present', () => {
      mockAuthService.getToken.mockReturnValue('expired-jwt');
      mockAuthService.getRefreshToken.mockReturnValue(null);

      const originalReq = new HttpRequest('GET', '/api/protected');
      const errorResponse = new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' });

      const nextFn: HttpHandlerFn = () => throwError(() => errorResponse);

      let receivedError: any = null;
      TestBed.runInInjectionContext(() => {
        jwtInterceptor(originalReq, nextFn).subscribe({
          error: (err) => { receivedError = err; }
        });
      });

      expect(receivedError).toBe(errorResponse);
      expect(mockAuthService.logout).toHaveBeenCalledTimes(1);
      expect(mockAuthService.refreshToken).not.toHaveBeenCalled();
    });

    it('should not refresh or logout when 401 occurs on /api/auth/login', () => {
      mockAuthService.getRefreshToken.mockReturnValue('some-refresh-token');

      const originalReq = new HttpRequest('POST', '/api/auth/login');
      const errorResponse = new HttpErrorResponse({ status: 401, statusText: 'Invalid Credentials' });

      const nextFn: HttpHandlerFn = () => throwError(() => errorResponse);

      let receivedError: any = null;
      TestBed.runInInjectionContext(() => {
        jwtInterceptor(originalReq, nextFn).subscribe({
          error: (err) => { receivedError = err; }
        });
      });

      expect(receivedError).toBe(errorResponse);
      expect(mockAuthService.refreshToken).not.toHaveBeenCalled();
      expect(mockAuthService.logout).not.toHaveBeenCalled();
    });

    it('should logout without refreshing when 401 occurs on /api/auth/refresh', () => {
      mockAuthService.getRefreshToken.mockReturnValue('expired-refresh-token');

      const originalReq = new HttpRequest('POST', '/api/auth/refresh');
      const errorResponse = new HttpErrorResponse({ status: 401, statusText: 'Refresh Expired' });

      const nextFn: HttpHandlerFn = () => throwError(() => errorResponse);

      let receivedError: any = null;
      TestBed.runInInjectionContext(() => {
        jwtInterceptor(originalReq, nextFn).subscribe({
          error: (err) => { receivedError = err; }
        });
      });

      expect(receivedError).toBe(errorResponse);
      expect(mockAuthService.refreshToken).not.toHaveBeenCalled();
      expect(mockAuthService.logout).toHaveBeenCalledTimes(1);
    });

    it('should rethrow error without logging out for non-401 HTTP errors', () => {
      mockAuthService.getToken.mockReturnValue('valid-jwt');

      const originalReq = new HttpRequest('GET', '/api/error');
      const errorResponse = new HttpErrorResponse({ status: 500, statusText: 'Internal Server Error' });

      const nextFn: HttpHandlerFn = () => throwError(() => errorResponse);

      let receivedError: any = null;
      TestBed.runInInjectionContext(() => {
        jwtInterceptor(originalReq, nextFn).subscribe({
          error: (err) => { receivedError = err; }
        });
      });

      expect(receivedError).toBe(errorResponse);
      expect(mockAuthService.logout).not.toHaveBeenCalled();
    });
  });
});
