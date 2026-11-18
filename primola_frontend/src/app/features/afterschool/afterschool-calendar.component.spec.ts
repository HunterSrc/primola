import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { AfterschoolCalendarComponent } from './afterschool-calendar.component';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { AfterschoolWeekSchedule, Student, User } from '../../core/models';

describe('AfterschoolCalendarComponent', () => {
  let component: AfterschoolCalendarComponent;
  let fixture: any;
  let mockApi: any;
  let mockAuth: any;

  const mockSchedule: AfterschoolWeekSchedule = {
    week_start: '2026-10-19',
    week_end: '2026-10-23',
    days: [
      {
        date: '2026-10-19',
        day_name: 'Lunedì',
        closure: { id: 'c-1', date: '2026-10-19', title: 'Assemblea' },
        shifts: [],
        students: [],
        total_teacher_hours: 0,
        expected_students_count: 0,
        meals_count: 0
      }
    ]
  };

  const mockUsers: User[] = [
    { id: 'u-admin', email: 'admin@primola.it', first_name: 'Mario', last_name: 'Admin', groups: ['ADMIN'], role: 'ADMIN' },
    { id: 'u-office', email: 'office@primola.it', first_name: 'Laura', last_name: 'Office', groups: ['OFFICE'], role: 'OFFICE' },
    { id: 'u-teacher', email: 'teach@primola.it', first_name: 'Giulia', last_name: 'Docente', groups: ['TEACHER'], role: 'TEACHER' },
    { id: 'u-staff', email: 'staff@primola.it', first_name: 'Paolo', last_name: 'Staff', groups: [], role: 'STAFF' }
  ];

  const mockStudents: Student[] = [
    { id: 1, first_name: 'Leonardo', last_name: 'Bianchi', school: 'Rodari', weekly_meals: 5 },
    { id: 2, first_name: 'Sofia', last_name: 'Rossi', school: 'Manzoni', weekly_meals: 0 }
  ];

  beforeEach(() => {
    mockApi = {
      getAfterschoolWeekSchedule: vi.fn().mockReturnValue(of(mockSchedule)),
      getUsers: vi.fn().mockReturnValue(of(mockUsers)),
      getStudents: vi.fn().mockReturnValue(of(mockStudents)),
      getAfterschoolClosures: vi.fn().mockReturnValue(of([])),
      createAfterschoolClosure: vi.fn().mockReturnValue(of({ id: 'c-2', date: '2026-10-20', title: 'Chiusura' })),
      deleteAfterschoolClosure: vi.fn().mockReturnValue(of(true)),
      saveAttendancesBulk: vi.fn().mockReturnValue(of({ count: 1 })),
      copyPreviousWeekStudents: vi.fn().mockReturnValue(of({ copied_count: 5 })),
      copyPreviousWeekTeachers: vi.fn().mockReturnValue(of({ copied_count: 3 }))
    };

    const isAdminSig = signal(false);
    const isOfficeSig = signal(true);
    const isTeacherSig = signal(false);
    const canManageStudentsSig = signal(true);
    const canManageMealsSig = signal(true);

    mockAuth = {
      isAdmin: isAdminSig,
      isOffice: isOfficeSig,
      isTeacher: isTeacherSig,
      canManageAttendanceStudents: canManageStudentsSig,
      canManageAttendanceMeals: canManageMealsSig,
      currentUser: signal({ id: 'u-office', email: 'office@primola.it', groups: ['OFFICE'] }),
      isAdminSig,
      isOfficeSig,
      isTeacherSig,
      canManageStudentsSig
    };

    TestBed.configureTestingModule({
      imports: [AfterschoolCalendarComponent],
      providers: [
        { provide: ApiService, useValue: mockApi },
        { provide: AuthService, useValue: mockAuth }
      ]
    });

    fixture = TestBed.createComponent(AfterschoolCalendarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should filter shift teachers strictly to TEACHER group or TEACHER/STAFF role (D9)', () => {
    const teachers = component.teachersList();
    expect(teachers.map(t => t.id)).toEqual(['u-teacher', 'u-staff']);
  });

  it('should return empty teachersList when no TEACHER users exist', () => {
    mockApi.getUsers.mockReturnValue(of([
      { id: 'u-admin', email: 'admin@primola.it', groups: ['ADMIN'], role: 'ADMIN' }
    ]));
    component.loadTeachers();
    expect(component.teachersList()).toEqual([]);
  });

  it('should allow OFFICE (non-ADMIN) to access closures button, delete closure button, and closures modal (D6b)', () => {
    expect(component.isAdmin()).toBe(false);
    expect(component.canEdit()).toBe(true);

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Chiusure');

    component.openClosuresModal();
    fixture.detectChanges();
    expect(component.showClosuresModal()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Date di Chiusura Straordinarie');
  });

  it('should hide closures controls when user is TEACHER only (D6b)', () => {
    mockAuth.canManageStudentsSig.set(false);
    mockAuth.isOfficeSig.set(false);
    mockAuth.isTeacherSig.set(true);
    fixture.detectChanges();

    expect(component.canEdit()).toBe(false);
    expect(fixture.nativeElement.textContent).not.toContain('Chiusure');
  });

  it('should filter availableStudentsForModal by name/school without fiscal_code (B1)', () => {
    component.selectedDayForAddStudent.set(mockSchedule.days[0]);
    component.allStudentsList.set(mockStudents);
    component.studentSearchQuery.set('manzoni');

    const available = component.availableStudentsForModal();
    expect(available.length).toBe(1);
    expect(available[0].id).toBe(2);
  });

  it('should keep addStudentForm.is_present and has_meal false by default even if student has weekly_meals > 0 (D7)', () => {
    component.openAddStudentModal(mockSchedule.days[0]);
    expect(component.addStudentForm.is_present).toBe(false);
    expect(component.addStudentForm.has_meal).toBe(false);

    component.selectStudentToAdd(mockStudents[0]);
    expect(component.addStudentForm.is_present).toBe(false);
    expect(component.addStudentForm.has_meal).toBe(false);
  });

  it('should show copy CTAs for OFFICE/ADMIN and hide them for TEACHER (D13)', () => {
    expect(fixture.nativeElement.textContent).toContain('Copia Alunni Sett. Prec.');
    expect(fixture.nativeElement.textContent).toContain('Copia Docenti Sett. Prec.');

    mockAuth.canManageStudentsSig.set(false);
    mockAuth.isOfficeSig.set(false);
    mockAuth.isTeacherSig.set(true);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Copia Alunni Sett. Prec.');
    expect(fixture.nativeElement.textContent).not.toContain('Copia Docenti Sett. Prec.');
  });

  it('should call copyPreviousWeekStudents and copyPreviousWeekTeachers on confirm and reload schedule (D13)', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    mockApi.getAfterschoolWeekSchedule.mockClear();

    component.copyPreviousWeekStudents();
    expect(mockApi.copyPreviousWeekStudents).toHaveBeenCalledWith(component.getMondayIso(component.currentDate()));
    expect(component.copySuccessMessage()).toContain('5');
    expect(mockApi.getAfterschoolWeekSchedule).toHaveBeenCalledTimes(1);

    component.copyPreviousWeekTeachers();
    expect(mockApi.copyPreviousWeekTeachers).toHaveBeenCalledWith(component.getMondayIso(component.currentDate()));
    expect(component.copySuccessMessage()).toContain('3');
    expect(mockApi.getAfterschoolWeekSchedule).toHaveBeenCalledTimes(2);

    confirmSpy.mockRestore();
  });

  it('should cross week boundaries when swiping left on Friday and right on Monday in mobile carousel (D13)', () => {
    const fiveDaysSchedule: AfterschoolWeekSchedule = {
      week_start: '2026-10-19',
      week_end: '2026-10-23',
      days: [
        { ...mockSchedule.days[0], date: '2026-10-19', day_name: 'Lunedì' },
        { ...mockSchedule.days[0], date: '2026-10-20', day_name: 'Martedì' },
        { ...mockSchedule.days[0], date: '2026-10-21', day_name: 'Mercoledì' },
        { ...mockSchedule.days[0], date: '2026-10-22', day_name: 'Giovedì' },
        { ...mockSchedule.days[0], date: '2026-10-23', day_name: 'Venerdì' }
      ]
    };
    component.schedule.set(fiveDaysSchedule);

    // Swipe left on Friday (index 4) -> next week Monday (index 0)
    component.selectMobileDay(4);
    const nextSpy = vi.spyOn(component, 'nextWeek');
    component.onTouchStart({ changedTouches: [{ clientX: 200, clientY: 100 }] } as unknown as TouchEvent);
    component.onTouchEnd({ changedTouches: [{ clientX: 100, clientY: 105 }] } as unknown as TouchEvent);
    expect(nextSpy).toHaveBeenCalledTimes(1);
    expect(component.selectedDayIndex()).toBe(0);

    // Swipe right on Monday (index 0) -> previous week Friday (index 4)
    const prevSpy = vi.spyOn(component, 'previousWeek');
    component.onTouchStart({ changedTouches: [{ clientX: 100, clientY: 100 }] } as unknown as TouchEvent);
    component.onTouchEnd({ changedTouches: [{ clientX: 200, clientY: 102 }] } as unknown as TouchEvent);
    expect(prevSpy).toHaveBeenCalledTimes(1);
    expect(component.selectedDayIndex()).toBe(4);
  });
});
