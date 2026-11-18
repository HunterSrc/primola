import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { MainLayoutComponent } from './main-layout.component';
import { AuthService } from '../core/services/auth.service';
import { signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

describe('MainLayoutComponent', () => {
  let component: MainLayoutComponent;
  let mockAuthService: any;
  let fixture: any;

  beforeEach(() => {
    mockAuthService = {
      currentUser: signal({ id: 1, name: 'Admin Test', role: 'ADMIN', token: 'xyz' }),
      role: signal('ADMIN'),
      isAdmin: signal(true),
      isOffice: signal(false),
      isTeacher: signal(false),
      isStaff: signal(true),
      canManageUsers: signal(true),
      canManageStudents: signal(true),
      logout: vi.fn()
    };

    TestBed.configureTestingModule({
      imports: [MainLayoutComponent],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: ActivatedRoute, useValue: {} }
      ]
    });

    fixture = TestBed.createComponent(MainLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should instantiate successfully and display updated sidebar labels (D8)', () => {
    expect(component).toBeTruthy();
    expect(component.authService.isAdmin()!).toBe(true);
    expect(component.authService.currentUser()?.name).toBe('Admin Test');

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Rendicontazione Operativa');
    expect(text).toContain('Riepiloghi & Bilancio Admin');
    expect(text).not.toContain('Rendicontazione Ore Corsi');
  });
});
