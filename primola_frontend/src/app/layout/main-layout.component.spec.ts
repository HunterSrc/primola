import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { MainLayoutComponent } from './main-layout.component';
import { AuthService } from '../core/services/auth.service';
import { signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

describe('MainLayoutComponent', () => {
  let component: MainLayoutComponent;
  let mockAuthService: any;

  beforeEach(() => {
    mockAuthService = {
      currentUser: signal({ id: 1, name: 'Admin Test', role: 'ADMIN', token: 'xyz' }),
      role: signal('ADMIN'),
      isAdmin: signal(true),
      isStaff: signal(false),
      logout: vi.fn()
    };

    TestBed.configureTestingModule({
      imports: [MainLayoutComponent],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: ActivatedRoute, useValue: {} }
      ]
    });

    const fixture = TestBed.createComponent(MainLayoutComponent);
    component = fixture.componentInstance;
  });

  it('should instantiate successfully', () => {
    expect(component).toBeTruthy();
    expect(component.authService.isAdmin()!).toBe(true);
    expect(component.authService.currentUser()?.name).toBe('Admin Test');
  });
});
