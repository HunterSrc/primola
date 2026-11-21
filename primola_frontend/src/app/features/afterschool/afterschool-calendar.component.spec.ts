import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { AfterschoolCalendarComponent } from './afterschool-calendar.component';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { AfterschoolWeekSchedule, Student, User, TeacherShift, AfterschoolWeekDay, AfterschoolStudentScheduleItem } from '../../core/models';

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
        shifts: [
          {
            id: 'shift-1',
            user_id: 'u-teacher',
            shift_date: '2026-10-19',
            start_time: '14:00',
            end_time: '17:30',
            first_name: 'Giulia',
            last_name: 'Docente',
            notes: 'Accoglienza'
          }
        ],
        students: [
          {
            student_id: 1,
            first_name: 'Leonardo',
            last_name: 'Bianchi',
            school: 'Rodari',
            is_present: false,
            has_meal: true,
            canteen_used: true
          }
        ],
        total_teacher_hours: 3.5,
        expected_students_count: 1,
        meals_count: 1
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
      copyPreviousWeekTeachers: vi.fn().mockReturnValue(of({ copied_count: 3 })),
      createTeacherShift: vi.fn().mockReturnValue(of({ id: 'shift-new' })),
      updateTeacherShift: vi.fn().mockReturnValue(of({ id: 'shift-edit' })),
      deleteTeacherShift: vi.fn().mockReturnValue(of(true))
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
      canManageStudentsSig,
      canManageMealsSig
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

  describe('Initial filtering & RBAC', () => {
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

    it('should handle users with undefined groups or roles correctly in loadTeachers', () => {
      mockApi.getUsers.mockReturnValue(of([
        { id: 'u-no-grp', email: 'none@primola.it', groups: undefined, role: 'TEACHER' },
        { id: 'u-no-role', email: 'grp@primola.it', groups: ['TEACHER'], role: undefined },
        { id: 'u-staff-only', email: 'st@primola.it', groups: undefined, role: 'STAFF' },
        { id: 'u-other', email: 'oth@primola.it', groups: undefined, role: 'OTHER' }
      ] as any));
      component.loadTeachers();
      expect(component.teachersList().map(u => u.id)).toEqual(['u-no-grp', 'u-no-role', 'u-staff-only']);
    });

    it('should log error when loadTeachers fails', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockApi.getUsers.mockReturnValue(throwError(() => new Error('API error')));
      component.loadTeachers();
      expect(consoleSpy).toHaveBeenCalledWith('Errore fetch docenti per turni:', expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('should not call loadTeachers on init if canEdit is false', () => {
      mockApi.getUsers.mockClear();
      mockAuth.canManageStudentsSig.set(false);
      const newFixture = TestBed.createComponent(AfterschoolCalendarComponent);
      newFixture.detectChanges();
      expect(mockApi.getUsers).not.toHaveBeenCalled();
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

    it('should verify canTogglePresence for teacher, office, and admin, and false otherwise', () => {
      mockAuth.isTeacherSig.set(true);
      mockAuth.isOfficeSig.set(false);
      mockAuth.isAdminSig.set(false);
      expect(component.canTogglePresence()).toBe(true);

      mockAuth.isTeacherSig.set(false);
      mockAuth.isOfficeSig.set(true);
      mockAuth.isAdminSig.set(false);
      expect(component.canTogglePresence()).toBe(true);

      mockAuth.isTeacherSig.set(false);
      mockAuth.isOfficeSig.set(false);
      mockAuth.isAdminSig.set(true);
      expect(component.canTogglePresence()).toBe(true);

      mockAuth.isTeacherSig.set(false);
      mockAuth.isOfficeSig.set(false);
      mockAuth.isAdminSig.set(false);
      expect(component.canTogglePresence()).toBe(false);
    });

    it('should correctly evaluate currentUserId', () => {
      expect(component.currentUserId()).toBe('u-office');

      mockAuth.currentUser.set(null);
      expect(component.currentUserId()).toBeNull();

      mockAuth.currentUser.set({ email: 'test@example.com' });
      expect(component.currentUserId()).toBeNull();
    });

    it('should correctly evaluate isMyShift', () => {
      mockAuth.currentUser.set({ id: 'u-123' });
      expect(component.isMyShift({ user_id: 'u-123' } as any)).toBe(true);
      expect(component.isMyShift({ user_id: 'u-999' } as any)).toBe(false);

      mockAuth.currentUser.set(null);
      expect(component.isMyShift({ user_id: 'u-123' } as any)).toBe(false);
    });
  });

  describe('Student filtering and modal', () => {
    it('should filter availableStudentsForModal by name/school without fiscal_code (B1)', () => {
      component.selectedDayForAddStudent.set(mockSchedule.days[0]);
      component.allStudentsList.set(mockStudents);
      component.studentSearchQuery.set('manzoni');

      const available = component.availableStudentsForModal();
      expect(available.length).toBe(1);
      expect(available[0].id).toBe(2);
    });

    it('should handle empty search query and missing student fields in availableStudentsForModal', () => {
      component.selectedDayForAddStudent.set(null);
      component.allStudentsList.set([
        { id: 10, first_name: '', last_name: '', school: '' },
        { id: 11, first_name: 'Test', last_name: undefined, school: undefined } as any
      ]);
      component.studentSearchQuery.set('');
      expect(component.availableStudentsForModal().length).toBe(2);

      component.studentSearchQuery.set('test');
      expect(component.availableStudentsForModal().length).toBe(1);
      expect(component.availableStudentsForModal()[0].id).toBe(11);
    });

    it('should keep addStudentForm.is_present and has_meal false by default even if student has weekly_meals > 0 (D7)', () => {
      component.openAddStudentModal(mockSchedule.days[0]);
      expect(component.addStudentForm.is_present).toBe(false);
      expect(component.addStudentForm.has_meal).toBe(false);

      component.selectStudentToAdd(mockStudents[0]);
      expect(component.addStudentForm.is_present).toBe(false);
      expect(component.addStudentForm.has_meal).toBe(false);
    });

    it('should not open addStudentModal if canManageStudents is false', () => {
      mockAuth.canManageStudentsSig.set(false);
      component.openAddStudentModal(mockSchedule.days[0]);
      expect(component.showAddStudentModal()).toBe(false);
    });

    it('should load students when allStudentsList is empty upon opening modal, and log error on failure', () => {
      component.allStudentsList.set([]);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockApi.getStudents.mockReturnValue(throwError(() => new Error('Student fetch error')));

      component.openAddStudentModal(mockSchedule.days[0]);
      expect(component.studentsLoading()).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Errore caricamento studenti per calendario:', expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('should not call getStudents if allStudentsList already has items', () => {
      component.allStudentsList.set(mockStudents);
      mockApi.getStudents.mockClear();
      component.openAddStudentModal(mockSchedule.days[0]);
      expect(mockApi.getStudents).not.toHaveBeenCalled();
    });

    it('should close addStudentModal and reset related signals', () => {
      component.openAddStudentModal(mockSchedule.days[0]);
      component.selectedStudentToAdd.set(mockStudents[0]);
      component.addStudentError.set('Some error');

      component.closeAddStudentModal();
      expect(component.showAddStudentModal()).toBe(false);
      expect(component.selectedDayForAddStudent()).toBeNull();
      expect(component.selectedStudentToAdd()).toBeNull();
      expect(component.addStudentError()).toBeNull();
    });

    it('should set addStudentError when confirmAddStudent is called without day or student', () => {
      component.selectedDayForAddStudent.set(null);
      component.selectedStudentToAdd.set(null);
      component.confirmAddStudent();
      expect(component.addStudentError()).toBe('Seleziona uno studente');

      component.selectedDayForAddStudent.set(mockSchedule.days[0]);
      component.confirmAddStudent();
      expect(component.addStudentError()).toBe('Seleziona uno studente');
    });

    it('should save attendance and update local schedule on confirmAddStudent success', () => {
      component.selectedDayForAddStudent.set(mockSchedule.days[0]);
      component.selectedStudentToAdd.set(mockStudents[1]); // Sofia Rossi
      component.addStudentForm.is_present = true;
      component.addStudentForm.has_meal = true;

      component.confirmAddStudent();
      expect(mockApi.saveAttendancesBulk).toHaveBeenCalledWith('2026-10-19', [
        {
          student_id: 2,
          first_name: 'Sofia',
          last_name: 'Rossi',
          school: 'Manzoni',
          is_present: true,
          has_meal: true
        }
      ]);

      const targetDay = component.schedule()?.days.find(d => d.date === '2026-10-19');
      expect(targetDay?.students.length).toBe(2);
      expect(targetDay?.expected_students_count).toBe(2);
      expect(targetDay?.meals_count).toBe(2);
      expect(component.showAddStudentModal()).toBe(false);

      // Also verify when student has no school specified
      const studentNoSchool: Student = { id: 3, first_name: 'Marco', last_name: 'Verdi', school: undefined } as any;
      component.selectedDayForAddStudent.set(targetDay!);
      component.selectedStudentToAdd.set(studentNoSchool);
      component.confirmAddStudent();
      expect(mockApi.saveAttendancesBulk).toHaveBeenCalledWith('2026-10-19', [
        expect.objectContaining({ student_id: 3, school: '' })
      ]);
    });

    it('should handle confirmAddStudent when schedule is null or target day not found', () => {
      component.schedule.set(null);
      component.selectedDayForAddStudent.set(mockSchedule.days[0]);
      component.selectedStudentToAdd.set(mockStudents[1]);
      component.confirmAddStudent();
      expect(component.showAddStudentModal()).toBe(false);

      component.schedule.set({ week_start: '2026-10-19', week_end: '2026-10-23', days: [] });
      component.selectedDayForAddStudent.set(mockSchedule.days[0]);
      component.selectedStudentToAdd.set(mockStudents[1]);
      component.confirmAddStudent();
      expect(component.showAddStudentModal()).toBe(false);
    });

    it('should set error message when confirmAddStudent fails', () => {
      mockApi.saveAttendancesBulk.mockReturnValue(throwError(() => ({ error: { error: 'Save failed' } })));
      component.selectedDayForAddStudent.set(mockSchedule.days[0]);
      component.selectedStudentToAdd.set(mockStudents[0]);
      component.confirmAddStudent();
      expect(component.addStudentError()).toBe('Save failed');

      mockApi.saveAttendancesBulk.mockReturnValue(throwError(() => ({ message: 'Generic error' })));
      component.confirmAddStudent();
      expect(component.addStudentError()).toBe('Generic error');

      mockApi.saveAttendancesBulk.mockReturnValue(throwError(() => ({})));
      component.confirmAddStudent();
      expect(component.addStudentError()).toBe('Errore nel salvataggio');
    });
  });

  describe('Toggle presence and meal', () => {
    it('should toggle student presence optimistically when permitted', () => {
      const day = mockSchedule.days[0];
      const studentItem: AfterschoolStudentScheduleItem = {
        student_id: 1,
        first_name: 'Leonardo',
        last_name: 'Bianchi',
        is_present: false,
        has_meal: true
      };

      component.toggleStudentPresence(day, studentItem);
      expect(studentItem.is_present).toBe(true);
      expect(mockApi.saveAttendancesBulk).toHaveBeenCalledWith('2026-10-19', [
        {
          student_id: 1,
          first_name: 'Leonardo',
          last_name: 'Bianchi',
          is_present: true,
          has_meal: true
        }
      ]);
    });

    it('should not toggle presence if canTogglePresence is false', () => {
      mockAuth.isTeacherSig.set(false);
      mockAuth.isOfficeSig.set(false);
      mockAuth.isAdminSig.set(false);
      mockApi.saveAttendancesBulk.mockClear();

      const day = mockSchedule.days[0];
      const studentItem = { ...day.students[0] };
      component.toggleStudentPresence(day, studentItem);
      expect(mockApi.saveAttendancesBulk).not.toHaveBeenCalled();
    });

    it('should revert student presence and alert error on toggleStudentPresence failure', () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      const day = mockSchedule.days[0];
      const studentItem: AfterschoolStudentScheduleItem = {
        student_id: 1,
        first_name: 'Leonardo',
        last_name: 'Bianchi',
        is_present: false
      };

      mockApi.saveAttendancesBulk.mockReturnValue(throwError(() => ({ error: { error: 'Network fail' } })));
      component.toggleStudentPresence(day, studentItem);
      expect(studentItem.is_present).toBe(false);
      expect(alertSpy).toHaveBeenCalledWith('Impossibile aggiornare la presenza: Network fail');

      mockApi.saveAttendancesBulk.mockReturnValue(throwError(() => ({ message: 'Timeout' })));
      component.toggleStudentPresence(day, studentItem);
      expect(alertSpy).toHaveBeenCalledWith('Impossibile aggiornare la presenza: Timeout');

      mockApi.saveAttendancesBulk.mockReturnValue(throwError(() => ({})));
      component.toggleStudentPresence(day, studentItem);
      expect(alertSpy).toHaveBeenCalledWith('Impossibile aggiornare la presenza: Errore di rete');

      alertSpy.mockRestore();
    });

    it('should toggle student meal optimistically when permitted', () => {
      const day: AfterschoolWeekDay = {
        date: '2026-10-19',
        day_name: 'Lunedì',
        shifts: [],
        students: [
          { student_id: 1, first_name: 'A', last_name: 'B', has_meal: false, is_present: true }
        ],
        total_teacher_hours: 0,
        expected_students_count: 1,
        meals_count: 0
      };
      const st = day.students[0];

      component.toggleStudentMeal(day, st);
      expect(st.has_meal).toBe(true);
      expect(st.canteen_used).toBe(true);
      expect(day.meals_count).toBe(1);
      expect(mockApi.saveAttendancesBulk).toHaveBeenCalled();
    });

    it('should not toggle student meal if canManageMeals is false', () => {
      mockAuth.canManageMealsSig.set(false);
      mockApi.saveAttendancesBulk.mockClear();

      const day = mockSchedule.days[0];
      const st = day.students[0];
      component.toggleStudentMeal(day, st);
      expect(mockApi.saveAttendancesBulk).not.toHaveBeenCalled();
    });

    it('should revert student meal and alert error on toggleStudentMeal failure', () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      const day: AfterschoolWeekDay = {
        date: '2026-10-19',
        day_name: 'Lunedì',
        shifts: [],
        students: [
          { student_id: 1, first_name: 'A', last_name: 'B', has_meal: false, is_present: true }
        ],
        total_teacher_hours: 0,
        expected_students_count: 1,
        meals_count: 0
      };
      const st = day.students[0];

      mockApi.saveAttendancesBulk.mockReturnValue(throwError(() => ({ error: { error: 'DB locked' } })));
      component.toggleStudentMeal(day, st);
      expect(st.has_meal).toBe(false);
      expect(st.canteen_used).toBe(false);
      expect(day.meals_count).toBe(0);
      expect(alertSpy).toHaveBeenCalledWith('Impossibile aggiornare la mensa: DB locked');

      mockApi.saveAttendancesBulk.mockReturnValue(throwError(() => ({ message: 'Timeout' })));
      component.toggleStudentMeal(day, st);
      expect(alertSpy).toHaveBeenCalledWith('Impossibile aggiornare la mensa: Timeout');

      mockApi.saveAttendancesBulk.mockReturnValue(throwError(() => ({})));
      component.toggleStudentMeal(day, st);
      expect(alertSpy).toHaveBeenCalledWith('Impossibile aggiornare la mensa: Errore di rete');

      alertSpy.mockRestore();
    });
  });

  describe('Copy previous week actions', () => {
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

    it('should handle cancel confirm for copyPreviousWeekStudents and copyPreviousWeekTeachers', () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
      mockApi.copyPreviousWeekStudents.mockClear();
      mockApi.copyPreviousWeekTeachers.mockClear();

      component.copyPreviousWeekStudents();
      expect(mockApi.copyPreviousWeekStudents).not.toHaveBeenCalled();

      component.copyPreviousWeekTeachers();
      expect(mockApi.copyPreviousWeekTeachers).not.toHaveBeenCalled();

      confirmSpy.mockRestore();
    });

    it('should not trigger copy actions if canEdit is false or already copying', () => {
      mockAuth.canManageStudentsSig.set(false);
      mockApi.copyPreviousWeekStudents.mockClear();
      mockApi.copyPreviousWeekTeachers.mockClear();

      component.copyPreviousWeekStudents();
      component.copyPreviousWeekTeachers();
      expect(mockApi.copyPreviousWeekStudents).not.toHaveBeenCalled();
      expect(mockApi.copyPreviousWeekTeachers).not.toHaveBeenCalled();

      mockAuth.canManageStudentsSig.set(true);
      component.copyingStudents.set(true);
      component.copyPreviousWeekStudents();
      expect(mockApi.copyPreviousWeekStudents).not.toHaveBeenCalled();

      component.copyingTeachers.set(true);
      component.copyPreviousWeekTeachers();
      expect(mockApi.copyPreviousWeekTeachers).not.toHaveBeenCalled();
    });

    it('should handle alternative response formats and fallback messages for copy actions', () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      mockApi.copyPreviousWeekStudents.mockReturnValue(of({ copied: 4 }));
      component.copyPreviousWeekStudents();
      expect(component.copySuccessMessage()).toContain('4 inserimenti');

      mockApi.copyPreviousWeekStudents.mockReturnValue(of({ inserted: 2 }));
      component.copyPreviousWeekStudents();
      expect(component.copySuccessMessage()).toContain('2 inserimenti');

      mockApi.copyPreviousWeekStudents.mockReturnValue(of({}));
      component.copyPreviousWeekStudents();
      expect(component.copySuccessMessage()).toBe('Alunni copiati dalla settimana precedente con successo.');

      mockApi.copyPreviousWeekTeachers.mockReturnValue(of({ copied: 2 }));
      component.copyPreviousWeekTeachers();
      expect(component.copySuccessMessage()).toContain('2 turni');

      mockApi.copyPreviousWeekTeachers.mockReturnValue(of({ inserted: 1 }));
      component.copyPreviousWeekTeachers();
      expect(component.copySuccessMessage()).toContain('1 turni');

      mockApi.copyPreviousWeekTeachers.mockReturnValue(of({}));
      component.copyPreviousWeekTeachers();
      expect(component.copySuccessMessage()).toBe('Turni docenti copiati dalla settimana precedente con successo.');

      confirmSpy.mockRestore();
    });

    it('should handle errors in copy actions', () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      mockApi.copyPreviousWeekStudents.mockReturnValue(throwError(() => ({ error: { error: 'Copy students error' } })));
      component.copyPreviousWeekStudents();
      expect(component.errorMessage()).toBe('Copy students error');

      mockApi.copyPreviousWeekStudents.mockReturnValue(throwError(() => ({})));
      component.copyPreviousWeekStudents();
      expect(component.errorMessage()).toBe('Errore durante la copia degli alunni dalla settimana precedente.');

      mockApi.copyPreviousWeekTeachers.mockReturnValue(throwError(() => ({ error: { error: 'Copy teachers error' } })));
      component.copyPreviousWeekTeachers();
      expect(component.errorMessage()).toBe('Copy teachers error');

      mockApi.copyPreviousWeekTeachers.mockReturnValue(throwError(() => ({})));
      component.copyPreviousWeekTeachers();
      expect(component.errorMessage()).toBe('Errore durante la copia dei turni docenti dalla settimana precedente.');

      confirmSpy.mockRestore();
    });
  });

  describe('Mobile daily carousel and touch events', () => {
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

    it('should ignore touch events with empty or missing changedTouches', () => {
      component.onTouchStart({} as any);
      component.onTouchStart({ changedTouches: [] } as any);
      component.onTouchEnd({} as any);
      component.onTouchEnd({ changedTouches: [] } as any);
      // No errors thrown
    });

    it('should ignore touch end if swipe movement is too small or predominantly vertical', () => {
      const prevSpy = vi.spyOn(component, 'previousMobileDay');
      const nextSpy = vi.spyOn(component, 'nextMobileDay');

      component.onTouchStart({ changedTouches: [{ clientX: 100, clientY: 100 }] } as any);
      // deltaX = 30 (< 50)
      component.onTouchEnd({ changedTouches: [{ clientX: 130, clientY: 100 }] } as any);
      expect(prevSpy).not.toHaveBeenCalled();
      expect(nextSpy).not.toHaveBeenCalled();

      // deltaX = 60, deltaY = 80 (deltaX <= deltaY)
      component.onTouchEnd({ changedTouches: [{ clientX: 160, clientY: 180 }] } as any);
      expect(prevSpy).not.toHaveBeenCalled();
      expect(nextSpy).not.toHaveBeenCalled();
    });

    it('should navigate through days inside current week with previousMobileDay and nextMobileDay', () => {
      const fiveDaysSchedule: AfterschoolWeekSchedule = {
        week_start: '2026-10-19',
        week_end: '2026-10-23',
        days: [
          { ...mockSchedule.days[0], date: '2026-10-19' },
          { ...mockSchedule.days[0], date: '2026-10-20' },
          { ...mockSchedule.days[0], date: '2026-10-21' },
          { ...mockSchedule.days[0], date: '2026-10-22' },
          { ...mockSchedule.days[0], date: '2026-10-23' }
        ]
      };
      component.schedule.set(fiveDaysSchedule);

      component.selectMobileDay(2);
      expect(component.selectedDayIndex()).toBe(2);

      component.previousMobileDay();
      expect(component.selectedDayIndex()).toBe(1);

      component.nextMobileDay();
      expect(component.selectedDayIndex()).toBe(2);
    });

    it('should handle nextMobileDay when schedule is null', () => {
      component.schedule.set(null);
      component.selectedDayIndex.set(1);
      component.nextMobileDay();
      expect(component.selectedDayIndex()).toBe(2);
    });

    it('should do nothing in selectMobileDay if schedule days is empty or schedule is null', () => {
      component.schedule.set({ week_start: '', week_end: '', days: [] });
      component.selectedDayIndex.set(1);
      component.selectMobileDay(3);
      expect(component.selectedDayIndex()).toBe(1);

      component.schedule.set(null);
      component.selectMobileDay(3);
      expect(component.selectedDayIndex()).toBe(1);
    });

    it('should return null for activeMobileDay when days is empty, and clamp out-of-bound indices', () => {
      component.schedule.set({ week_start: '', week_end: '', days: [] });
      expect(component.activeMobileDay()).toBeNull();

      component.schedule.set(null);
      expect(component.activeMobileDay()).toBeNull();

      component.schedule.set(mockSchedule);
      component.selectedDayIndex.set(-5);
      expect(component.activeMobileDay()?.date).toBe('2026-10-19');

      component.selectedDayIndex.set(99);
      expect(component.activeMobileDay()?.date).toBe('2026-10-19');
    });

    it('should initialize mobile day based on getDay()', () => {
      (component as any).hasInitializedMobileDay = false;
      const getDaySpy = vi.spyOn(Date.prototype, 'getDay').mockReturnValue(0); // Sunday
      (component as any).initMobileDayToToday();
      expect(component.selectedDayIndex()).toBe(0);

      (component as any).hasInitializedMobileDay = false;
      getDaySpy.mockReturnValue(6); // Saturday
      (component as any).initMobileDayToToday();
      expect(component.selectedDayIndex()).toBe(0);

      (component as any).hasInitializedMobileDay = false;
      getDaySpy.mockReturnValue(3); // Wednesday
      (component as any).initMobileDayToToday();
      expect(component.selectedDayIndex()).toBe(2);

      // Calling again when already initialized does nothing
      getDaySpy.mockReturnValue(4);
      (component as any).initMobileDayToToday();
      expect(component.selectedDayIndex()).toBe(2);

      getDaySpy.mockRestore();
    });
  });

  describe('Date utilities and formatters', () => {
    it('should format getMondayIso correctly for Monday, Wednesday, and Sunday', () => {
      expect(component.getMondayIso(new Date('2026-10-19T10:00:00'))).toBe('2026-10-19');
      expect(component.getMondayIso(new Date('2026-10-21T10:00:00'))).toBe('2026-10-19');
      expect(component.getMondayIso(new Date('2026-10-25T10:00:00'))).toBe('2026-10-19');
    });

    it('should format getDayShortLabel with and without dayName', () => {
      expect(component.getDayShortLabel('Lunedì', 0)).toBe('Lun');
      expect(component.getDayShortLabel('', 0)).toBe('Lun');
      expect(component.getDayShortLabel('', 4)).toBe('Ven');
      expect(component.getDayShortLabel('', 10)).toBe('');
    });

    it('should format getDayNumber correctly', () => {
      expect(component.getDayNumber('')).toBe('');
      expect(component.getDayNumber('2026-10-05')).toBe('5');
      expect(component.getDayNumber('2026-10-19')).toBe('19');
      expect(component.getDayNumber('invalid-date')).toBe('');
    });

    it('should format formatWeekInterval correctly', () => {
      expect(component.formatWeekInterval()).toContain('19');
      expect(component.formatWeekInterval()).toContain('23');

      component.schedule.set(null);
      expect(component.formatWeekInterval()).toBe('');

      component.schedule.set({ week_start: '', week_end: '2026-10-23', days: [] });
      expect(component.formatWeekInterval()).toBe('');

      component.schedule.set({ week_start: '2026-10-19', week_end: '', days: [] });
      expect(component.formatWeekInterval()).toBe('');
    });

    it('should format formatDayDate correctly', () => {
      expect(component.formatDayDate('')).toBe('');
      expect(component.formatDayDate('2026-10-19')).toContain('19');
    });

    it('should check isDayToday correctly', () => {
      const todayIso = new Date().toISOString().split('T')[0];
      expect(component.isDayToday(todayIso)).toBe(true);
      expect(component.isDayToday('1999-01-01')).toBe(false);
    });

    it('should navigate weeks with previousWeek, nextWeek, and currentWeek', () => {
      const loadSpy = vi.spyOn(component, 'loadWeekSchedule');
      component.previousWeek();
      expect(loadSpy).toHaveBeenCalled();

      component.nextWeek();
      expect(loadSpy).toHaveBeenCalled();

      const getDaySpy = vi.spyOn(Date.prototype, 'getDay').mockReturnValue(2); // Tuesday
      component.currentWeek();
      expect(component.selectedDayIndex()).toBe(1);

      getDaySpy.mockReturnValue(0); // Sunday
      component.currentWeek();
      expect(component.selectedDayIndex()).toBe(0);

      getDaySpy.mockRestore();
    });

    it('should handle holiday info check', () => {
      expect(component.getHolidayInfo('2026-12-25')).toBeTruthy();
      expect(component.getHolidayInfo('2026-10-19')).toBeNull();
    });
  });

  describe('Schedule loading errors', () => {
    it('should set error message when loadWeekSchedule fails with err.error.error and fallback', () => {
      mockApi.getAfterschoolWeekSchedule.mockReturnValue(throwError(() => ({ error: { error: 'Schedule failed' } })));
      component.loadWeekSchedule();
      expect(component.loading()).toBe(false);
      expect(component.errorMessage()).toBe('Schedule failed');

      mockApi.getAfterschoolWeekSchedule.mockReturnValue(throwError(() => ({})));
      component.loadWeekSchedule();
      expect(component.errorMessage()).toBe('Errore nel caricamento del calendario doposcuola.');
    });
  });

  describe('Shift CRUD and Shift modal', () => {
    it('should open shift modal with default or custom date', () => {
      component.openShiftModal('2026-10-20');
      expect(component.showShiftModal()).toBe(true);
      expect(component.shiftForm.shift_date).toBe('2026-10-20');
      expect(component.shiftForm.user_id).toBe('u-teacher');

      // When teachers list is empty
      component.teachersList.set([]);
      component.openShiftModal();
      expect(component.shiftForm.user_id).toBe('');
      expect(component.shiftForm.shift_date).toBe(component.getMondayIso(component.currentDate()));
    });

    it('should open shift modal for edit with various shift date formats', () => {
      const shiftWithT: TeacherShift = {
        id: 'shift-1',
        user_id: 'u-staff',
        shift_date: '2026-10-21T00:00:00.000Z',
        start_time: '14:30',
        end_time: '18:00',
        notes: 'Help'
      };
      component.editShift(shiftWithT);
      expect(component.editingShiftId()).toBe('shift-1');
      expect(component.shiftForm.shift_date).toBe('2026-10-21');
      expect(component.shiftForm.start_time).toBe('14:30');
      expect(component.shiftForm.end_time).toBe('18:00');
      expect(component.shiftForm.notes).toBe('Help');

      // Shift without date, using fallbackDate
      const shiftNoDate: TeacherShift = {
        id: 'shift-2',
        user_id: 'u-teacher',
        shift_date: '',
        start_time: '',
        end_time: '',
        notes: ''
      };
      component.editShift(shiftNoDate, '2026-10-22');
      expect(component.shiftForm.shift_date).toBe('2026-10-22');
      expect(component.shiftForm.start_time).toBe('14:00');
      expect(component.shiftForm.end_time).toBe('17:30');
      expect(component.shiftForm.notes).toBe('');

      // Shift without date and without fallbackDate
      component.editShift(shiftNoDate);
      expect(component.shiftForm.shift_date).toBe('');
    });

    it('should close shift modal', () => {
      component.openShiftModal();
      component.closeShiftModal();
      expect(component.showShiftModal()).toBe(false);
      expect(component.editingShiftId()).toBeNull();
    });

    it('should validate required fields in saveShift', () => {
      component.openShiftModal();
      component.shiftForm.user_id = '';
      component.saveShift();
      expect(component.modalError()).toBe('Compila tutti i campi obbligatori.');

      component.shiftForm.user_id = 'u-teacher';
      component.shiftForm.shift_date = '';
      component.saveShift();
      expect(component.modalError()).toBe('Compila tutti i campi obbligatori.');

      component.shiftForm.shift_date = '2026-10-19';
      component.shiftForm.start_time = '';
      component.saveShift();
      expect(component.modalError()).toBe('Compila tutti i campi obbligatori.');

      component.shiftForm.start_time = '14:00';
      component.shiftForm.end_time = '';
      component.saveShift();
      expect(component.modalError()).toBe('Compila tutti i campi obbligatori.');
    });

    it('should validate start_time < end_time in saveShift', () => {
      component.openShiftModal();
      component.shiftForm.user_id = 'u-teacher';
      component.shiftForm.shift_date = '2026-10-19';
      component.shiftForm.start_time = '17:00';
      component.shiftForm.end_time = '14:00';
      component.saveShift();
      expect(component.modalError()).toBe("L'orario di inizio deve essere precedente all'orario di fine.");

      component.shiftForm.start_time = '14:00';
      component.shiftForm.end_time = '14:00';
      component.saveShift();
      expect(component.modalError()).toBe("L'orario di inizio deve essere precedente all'orario di fine.");
    });

    it('should create new shift and handle success and error states', () => {
      component.openShiftModal();
      component.shiftForm = {
        user_id: 'u-teacher',
        shift_date: '2026-10-19',
        start_time: '14:00',
        end_time: '16:00',
        notes: ''
      };

      const loadSpy = vi.spyOn(component, 'loadWeekSchedule');
      component.saveShift();
      expect(mockApi.createTeacherShift).toHaveBeenCalledWith(component.shiftForm);
      expect(component.showShiftModal()).toBe(false);
      expect(loadSpy).toHaveBeenCalled();

      // Error with message
      component.openShiftModal();
      mockApi.createTeacherShift.mockReturnValue(throwError(() => ({ error: { error: 'Creation failed' } })));
      component.saveShift();
      expect(component.modalError()).toBe('Creation failed');
      expect(component.modalSaving()).toBe(false);

      // Error fallback
      mockApi.createTeacherShift.mockReturnValue(throwError(() => ({})));
      component.saveShift();
      expect(component.modalError()).toBe('Errore durante la creazione del turno.');
    });

    it('should update existing shift and handle success and error states', () => {
      component.editingShiftId.set('shift-1');
      component.shiftForm = {
        user_id: 'u-teacher',
        shift_date: '2026-10-19',
        start_time: '14:00',
        end_time: '16:00',
        notes: 'Updated'
      };

      const loadSpy = vi.spyOn(component, 'loadWeekSchedule');
      component.saveShift();
      expect(mockApi.updateTeacherShift).toHaveBeenCalledWith('shift-1', component.shiftForm);
      expect(component.showShiftModal()).toBe(false);
      expect(loadSpy).toHaveBeenCalled();

      // Error with message
      component.editingShiftId.set('shift-1');
      mockApi.updateTeacherShift.mockReturnValue(throwError(() => ({ error: { error: 'Update failed' } })));
      component.saveShift();
      expect(component.modalError()).toBe('Update failed');

      // Error fallback
      component.editingShiftId.set('shift-1');
      mockApi.updateTeacherShift.mockReturnValue(throwError(() => ({})));
      component.saveShift();
      expect(component.modalError()).toBe("Errore durante l'aggiornamento del turno.");
    });

    it('should confirm and delete shift', () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      const shift: TeacherShift = {
        id: 'shift-1',
        user_id: 'u-teacher',
        first_name: 'Giulia',
        last_name: 'Docente',
        shift_date: '2026-10-19',
        start_time: '14:00',
        end_time: '17:30'
      };

      const loadSpy = vi.spyOn(component, 'loadWeekSchedule');
      component.confirmDeleteShift(shift);
      expect(mockApi.deleteTeacherShift).toHaveBeenCalledWith('shift-1');
      expect(loadSpy).toHaveBeenCalled();

      // Error with message
      mockApi.deleteTeacherShift.mockReturnValue(throwError(() => ({ error: { error: 'Delete failed' } })));
      component.confirmDeleteShift(shift);
      expect(component.errorMessage()).toBe('Delete failed');

      // Error fallback
      mockApi.deleteTeacherShift.mockReturnValue(throwError(() => ({})));
      component.confirmDeleteShift(shift);
      expect(component.errorMessage()).toBe("Errore durante l'eliminazione del turno.");

      // Cancel confirmation
      confirmSpy.mockReturnValue(false);
      mockApi.deleteTeacherShift.mockClear();
      component.confirmDeleteShift(shift);
      expect(mockApi.deleteTeacherShift).not.toHaveBeenCalled();

      confirmSpy.mockRestore();
    });

    it('should handle shift deletion confirmation with missing names', () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      const shift: TeacherShift = {
        id: 'shift-anon',
        user_id: 'u-teacher',
        shift_date: '2026-10-19',
        start_time: '14:00',
        end_time: '17:30'
      };
      component.confirmDeleteShift(shift);
      expect(confirmSpy).toHaveBeenCalledWith('Sei sicuro di voler eliminare il turno di  ?');
      confirmSpy.mockRestore();
    });
  });

  describe('Closures modal and CRUD', () => {
    it('should open and close closures modal', () => {
      component.openClosuresModal();
      expect(component.showClosuresModal()).toBe(true);
      expect(component.closureForm.date).toBeTruthy();
      expect(mockApi.getAfterschoolClosures).toHaveBeenCalled();

      component.closeClosuresModal();
      expect(component.showClosuresModal()).toBe(false);
    });

    it('should handle loadClosuresList success and error', () => {
      mockApi.getAfterschoolClosures.mockReturnValue(of([{ id: 'c-1', date: '2026-10-19', title: 'Test' }]));
      component.loadClosuresList();
      expect(component.closuresList().length).toBe(1);
      expect(component.closuresLoading()).toBe(false);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockApi.getAfterschoolClosures.mockReturnValue(throwError(() => new Error('Closure fetch err')));
      component.loadClosuresList();
      expect(component.closuresLoading()).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Errore fetch chiusure:', expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('should validate fields in saveClosure', () => {
      component.closureForm = { date: '', title: 'Test', notes: '' };
      component.saveClosure();
      expect(component.closureFormError()).toBe('Inserisci la data e una motivazione/titolo per la chiusura.');

      component.closureForm = { date: '2026-10-20', title: '   ', notes: '' };
      component.saveClosure();
      expect(component.closureFormError()).toBe('Inserisci la data e una motivazione/titolo per la chiusura.');
    });

    it('should save closure and handle success and error states', () => {
      component.closureForm = { date: '2026-10-20', title: 'Gita scolastica', notes: 'Tutti assenti' };
      const closuresSpy = vi.spyOn(component, 'loadClosuresList');
      const scheduleSpy = vi.spyOn(component, 'loadWeekSchedule');

      component.saveClosure();
      expect(mockApi.createAfterschoolClosure).toHaveBeenCalledWith(component.closureForm);
      expect(component.closureForm.title).toBe('');
      expect(component.closureForm.notes).toBe('');
      expect(closuresSpy).toHaveBeenCalled();
      expect(scheduleSpy).toHaveBeenCalled();

      // Error with message
      component.closureForm = { date: '2026-10-20', title: 'Fail', notes: '' };
      mockApi.createAfterschoolClosure.mockReturnValue(throwError(() => ({ error: { error: 'Closure save fail' } })));
      component.saveClosure();
      expect(component.closureFormError()).toBe('Closure save fail');

      // Error fallback
      mockApi.createAfterschoolClosure.mockReturnValue(throwError(() => ({})));
      component.saveClosure();
      expect(component.closureFormError()).toBe('Errore durante il salvataggio della chiusura.');
    });

    it('should confirm and delete closure', () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      const closuresSpy = vi.spyOn(component, 'loadClosuresList');
      const scheduleSpy = vi.spyOn(component, 'loadWeekSchedule');

      component.confirmDeleteClosure('c-1', 'Assemblea');
      expect(mockApi.deleteAfterschoolClosure).toHaveBeenCalledWith('c-1');
      expect(closuresSpy).toHaveBeenCalled();
      expect(scheduleSpy).toHaveBeenCalled();

      // Error with message
      mockApi.deleteAfterschoolClosure.mockReturnValue(throwError(() => ({ error: { error: 'Delete closure fail' } })));
      component.confirmDeleteClosure('c-1', 'Assemblea');
      expect(component.errorMessage()).toBe('Delete closure fail');

      // Error fallback
      mockApi.deleteAfterschoolClosure.mockReturnValue(throwError(() => ({})));
      component.confirmDeleteClosure('c-1', 'Assemblea');
      expect(component.errorMessage()).toBe('Errore nella cancellazione della chiusura.');

      // Cancel confirmation
      confirmSpy.mockReturnValue(false);
      mockApi.deleteAfterschoolClosure.mockClear();
      component.confirmDeleteClosure('c-1', 'Assemblea');
      expect(mockApi.deleteAfterschoolClosure).not.toHaveBeenCalled();

      confirmSpy.mockRestore();
    });
  });

  describe('Template interactions and notifications', () => {
    it('should dismiss error message and copy success message on button click', () => {
      component.errorMessage.set('Test error');
      component.copySuccessMessage.set('Test success');
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('Test error');
      expect(fixture.nativeElement.textContent).toContain('Test success');

      component.errorMessage.set(null);
      component.copySuccessMessage.set(null);
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).not.toContain('Test error');
      expect(fixture.nativeElement.textContent).not.toContain('Test success');
    });
  });
});
