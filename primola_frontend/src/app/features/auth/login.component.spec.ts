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

  it('should instantiate successfully', () => {
    expect(component).toBeTruthy();
    expect(component.email).toBe('admin@primola.it');
  });

  it('should trigger loginWithCredentials on submit and navigate to dashboard on success', () => {
    mockAuthService.loginWithCredentials.mockReturnValue(of({ success: true }));

    component.email = 'admin@primola.it';
    component.password = 'AdminPrimola2026!';
    component.onSubmit();

    expect(mockAuthService.loginWithCredentials).toHaveBeenCalledWith({
      email: 'admin@primola.it',
      password: 'AdminPrimola2026!'
    });
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard']);
    expect(component.errorMessage()).toBeNull();
  });

  it('should set error message on failed login', () => {
    mockAuthService.loginWithCredentials.mockReturnValue(throwError(() => ({
      error: { error: 'Credenziali non valide.' }
    })));

    component.email = 'admin@primola.it';
    component.password = 'WrongPass';
    component.onSubmit();

    expect(component.errorMessage()).toBe('Credenziali non valide.');
    expect(component.isLoading()).toBe(false);
  });

  it('should prefill admin credentials when prefillAdmin is called', () => {
    component.email = '';
    component.password = '';
    component.errorMessage.set('errore pregresso');

    component.prefillAdmin();

    expect(component.email).toBe('admin@primola.it');
    expect(component.password).toBe('AdminPrimola2026!');
    expect(component.errorMessage()).toBeNull();
  });
});
