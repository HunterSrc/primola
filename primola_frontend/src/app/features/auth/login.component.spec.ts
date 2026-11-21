import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { LoginComponent } from './login.component';
import { AuthService } from '../../core/services/auth.service';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let mockAuthService: any;
  let mockRouter: any;

  beforeEach(() => {
    mockAuthService = {
      loginWithCredentials: vi.fn()
    };

    mockRouter = {
      navigate: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        LoginComponent,
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter }
      ]
    });

    component = TestBed.inject(LoginComponent);
  });

  it('should instantiate successfully with empty credentials and no prefill', () => {
    expect(component).toBeTruthy();
    expect(component.email).toBe('');
    expect(component.password).toBe('');
    expect(component.isLoading()).toBe(false);
  });

  it('should not submit if email or password are empty', () => {
    component.email = '';
    component.password = '';
    component.onSubmit();

    expect(mockAuthService.loginWithCredentials).not.toHaveBeenCalled();
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it('should trigger loginWithCredentials on submit and navigate to dashboard on success', () => {
    mockAuthService.loginWithCredentials.mockReturnValue(of({ success: true }));

    component.email = 'docente@primola.it';
    component.password = 'Password123!';
    component.onSubmit();

    expect(mockAuthService.loginWithCredentials).toHaveBeenCalledWith({
      email: 'docente@primola.it',
      password: 'Password123!'
    });
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard']);
    expect(component.errorMessage()).toBeNull();
  });

  it('should set error message on failed login (e.g. pending admin approval or wrong credentials)', () => {
    mockAuthService.loginWithCredentials.mockReturnValue(throwError(() => ({
      error: { error: 'Il tuo account è in attesa di approvazione da parte di un amministratore.' }
    })));

    component.email = 'in.attesa@primola.it';
    component.password = 'Password123!';
    component.onSubmit();

    expect(component.errorMessage()).toBe('Il tuo account è in attesa di approvazione da parte di un amministratore.');
    expect(component.isLoading()).toBe(false);
  });

  it('should handle res.success false and fallback error message', () => {
    mockAuthService.loginWithCredentials.mockReturnValue(of({ success: false }));
    component.email = 'docente@primola.it';
    component.password = 'pass';
    component.onSubmit();
    expect(mockRouter.navigate).not.toHaveBeenCalled();

    mockAuthService.loginWithCredentials.mockReturnValue(throwError(() => ({})));
    component.onSubmit();
    expect(component.errorMessage()).toBe('Errore durante il login. Verifica le credenziali.');

    component.email = '';
    component.password = 'pass';
    component.onSubmit();

    component.email = 'test@primola.it';
    component.password = '';
    component.onSubmit();
  });
});
