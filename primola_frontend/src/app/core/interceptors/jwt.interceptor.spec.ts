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

  it('should attach Bearer token to request headers when token is present', () => {
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

  it('should trigger logout when 401 occurs and no refresh token is present', () => {
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
