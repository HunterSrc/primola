import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { MainLayoutComponent } from './main-layout.component';
import { AuthService } from '../core/services/auth.service';
import { signal } from '@angular/core';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { Subject } from 'rxjs';

describe('MainLayoutComponent', () => {
  let component: MainLayoutComponent;
  let mockAuthService: any;
  let mockRouter: any;
  let routerEvents$: Subject<any>;
  let fixture: any;

  beforeEach(() => {
    routerEvents$ = new Subject<any>();
    mockRouter = {
      url: '/dashboard',
      events: routerEvents$.asObservable(),
      navigate: vi.fn()
    };

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
        { provide: Router, useValue: mockRouter },
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
    expect(text).toContain('Rendicontazione Doposcuola');
    expect(text).toContain('Rendicontazione Corsi');
    expect(text).toContain('Riepiloghi & Bilancio Admin');
    expect(text).not.toContain('Rendicontazione Ore Corsi');
  });

  it('should auto-expand doposcuola section initially when on /dashboard', () => {
    expect(component.openSection()).toBe('doposcuola');
  });

  it('should toggle sections exclusively: opening one closes the other', () => {
    expect(component.openSection()).toBe('doposcuola');

    // Open corsi
    component.toggleSection('corsi');
    expect(component.openSection()).toBe('corsi');

    // Open admin
    component.toggleSection('admin');
    expect(component.openSection()).toBe('admin');

    // Open doposcuola
    component.toggleSection('doposcuola');
    expect(component.openSection()).toBe('doposcuola');
  });

  it('should allow closing the currently open section (free toggle to null)', () => {
    expect(component.openSection()).toBe('doposcuola');

    // Toggle same section should close it
    component.toggleSection('doposcuola');
    expect(component.openSection()).toBeNull();
  });

  it('should toggle desktop sidebar collapsed state', () => {
    expect(component.desktopSidebarCollapsed()).toBe(false);
    component.toggleDesktopSidebar();
    expect(component.desktopSidebarCollapsed()).toBe(true);
    component.toggleDesktopSidebar();
    expect(component.desktopSidebarCollapsed()).toBe(false);
  });

  it('should detect sections based on URLs correctly', () => {
    expect(component.detectSectionFromUrl('/dashboard')).toBe('doposcuola');
    expect(component.detectSectionFromUrl('/afterschool-calendar')).toBe('doposcuola');
    expect(component.detectSectionFromUrl('/payments')).toBe('doposcuola');
    expect(component.detectSectionFromUrl('/anagrafica')).toBe('doposcuola');
    expect(component.detectSectionFromUrl('/projects')).toBe('corsi');
    expect(component.detectSectionFromUrl('/course-reports')).toBe('corsi');
    expect(component.detectSectionFromUrl('/afterschool-reports')).toBe('doposcuola');
    expect(component.detectSectionFromUrl('/users')).toBe('admin');
    expect(component.detectSectionFromUrl('/admin/dashboard')).toBe('admin');
    expect(component.detectSectionFromUrl('/afterschool-expenses')).toBe('admin');
    expect(component.detectSectionFromUrl('/')).toBe('doposcuola');
  });

  it('should auto-expand the section when router navigation completes', () => {
    routerEvents$.next(new NavigationEnd(1, '/projects', '/projects'));
    expect(component.openSection()).toBe('corsi');

    routerEvents$.next(new NavigationEnd(2, '/admin/dashboard', '/admin/dashboard'));
    expect(component.openSection()).toBe('admin');
  });

  it('should show active dot indicator on the active section header when collapsed', () => {
    mockRouter.url = '/dashboard';
    component.openSection.set(null);
    fixture.detectChanges();

    expect(component.isSectionActive('doposcuola')).toBe(true);
    expect(component.isSectionActive('corsi')).toBe(false);

    const activeDot = fixture.nativeElement.querySelector('span[title="Sezione attiva"]');
    expect(activeDot).toBeTruthy();
  });

  it('should toggle and close mobile menu', () => {
    expect(component.mobileMenuOpen()).toBe(false);

    component.toggleMobileMenu();
    expect(component.mobileMenuOpen()).toBe(true);

    component.closeMobileMenu();
    expect(component.mobileMenuOpen()).toBe(false);
  });

  it('should handle localStorage errors gracefully when reading or saving sidebar state', () => {
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Access denied');
    });
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Access denied');
    });

    const readMethod = (component as any).readInitialSidebarState.bind(component);
    expect(readMethod()).toBe(false);

    // Toggle sidebar shouldn't crash when setItem throws
    component.toggleDesktopSidebar();
    expect(component.desktopSidebarCollapsed()).toBe(true);

    getItemSpy.mockRestore();
    setItemSpy.mockRestore();

    // Test syncSectionWithUrl when url is undefined or empty
    component.syncSectionWithUrl(undefined);
    component.syncSectionWithUrl('');

    // Test isSectionActive when router has empty url
    mockRouter.url = '';
    expect(component.isSectionActive('doposcuola')).toBe(true);

    // Test router events without urlAfterRedirects
    routerEvents$.next(new NavigationEnd(3, '/projects', ''));
    expect(component.openSection()).toBe('corsi');
  });
});
