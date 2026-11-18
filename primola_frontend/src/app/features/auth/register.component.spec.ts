import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { RegisterComponent } from './register.component';
import { AuthService } from '../../core/services/auth.service';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let mockAuthService: any;
  let mockRouter: any;

  beforeEach(() => {
    mockAuthService = {
      register: vi.fn()
    };

    mockRouter = {
      navigate: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        RegisterComponent,
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter }
      ]
    });

    component = TestBed.inject(RegisterComponent);
  });

  it('should instantiate successfully with empty form and initial states', () => {
    expect(component).toBeTruthy();
    expect(component.registerForm.valid).toBe(false);
    expect(component.isLoading()).toBe(false);
    expect(component.registrationSuccess()).toBe(false);
    expect(component.errorMessage()).toBeNull();
  });

  it('should not submit if form is invalid', () => {
    component.onSubmit();

    expect(mockAuthService.register).not.toHaveBeenCalled();
    expect(component.registerForm.touched).toBe(true);
  });

  it('should not submit and display error if passwords do not match', () => {
    component.registerForm.setValue({
      first_name: 'Giulia',
      last_name: 'Bianchi',
      email: 'giulia.bianchi@primola.it',
      phone: '+39 340 0000000',
      password: 'Password123!',
      confirm_password: 'DifferentPassword!'
    });

    component.onSubmit();

    expect(mockAuthService.register).not.toHaveBeenCalled();
    expect(component.errorMessage()).toBe('Le password inserite non coincidono.');
  });

  it('should call authService.register and set registrationSuccess on valid submission', () => {
    mockAuthService.register.mockReturnValue(of({
      success: true,
      data: { message: 'In attesa', userId: '123' }
    }));

    component.registerForm.setValue({
      first_name: 'Giulia',
      last_name: 'Bianchi',
      email: 'giulia.bianchi@primola.it',
      phone: '+39 340 0000000',
      password: 'Password123!',
      confirm_password: 'Password123!'
    });

    component.onSubmit();

    expect(mockAuthService.register).toHaveBeenCalledWith({
      first_name: 'Giulia',
      last_name: 'Bianchi',
      email: 'giulia.bianchi@primola.it',
      phone: '+39 340 0000000',
      password: 'Password123!'
    });
    expect(component.isLoading()).toBe(false);
    expect(component.registrationSuccess()).toBe(true);
    expect(component.errorMessage()).toBeNull();
  });

  it('should set error message on server error during registration', () => {
    mockAuthService.register.mockReturnValue(throwError(() => ({
      error: { error: 'Un utente con questo indirizzo email è già registrato.' }
    })));

    component.registerForm.setValue({
      first_name: 'Giulia',
      last_name: 'Bianchi',
      email: 'giulia.bianchi@primola.it',
      phone: '',
      password: 'Password123!',
      confirm_password: 'Password123!'
    });

    component.onSubmit();

    expect(component.isLoading()).toBe(false);
    expect(component.registrationSuccess()).toBe(false);
    expect(component.errorMessage()).toBe('Un utente con questo indirizzo email è già registrato.');
  });
});
