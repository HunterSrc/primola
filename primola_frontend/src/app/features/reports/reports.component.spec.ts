import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ReportsComponent } from './reports.component';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { of } from 'rxjs';
import { OperationalMonthlyReport, ProjectReportData } from '../../core/models';

describe('ReportsComponent', () => {
  let component: ReportsComponent;
  let mockApi: any;
  let mockAuth: any;

  const mockOperationalReport: OperationalMonthlyReport = {
    year: 2026,
    month: 10,
    from: '2026-10-01',
    to: '2026-10-31',
    students_meals: [
      {
        student_id: 1,
        first_name: 'Giulia',
        last_name: 'Verdi',
        student_name: 'Giulia Verdi',
        school: 'Scuola Rodari',
        days_present: 12,
        meals_consumed: 10,
        expected_meals: 10,
        weekly_meals: 3
      }
    ],
    afterschool_teachers: {
      summary: {
        total_teachers: 1,
        total_hours: 20,
        total_cost: 400
      },
      teachers: [
        {
          user_id: 't-1',
          first_name: 'Marco',
          last_name: 'Docente',
          teacher_name: 'Marco Docente',
          email: 'marco@primola.it',
          phone: '+39 340',
          hourly_rate: 20,
          shifts_count: 5,
          total_hours: 20,
          total_cost: 400,
          shifts: [
            {
              id: 's-1',
              shift_date: '2026-10-05',
              start_time: '14:30',
              end_time: '18:30',
              hours: 4,
              rate: 20,
              cost: 80
            }
          ]
        }
      ]
    },
    finished_courses_teachers: {
      summary: {
        total_courses: 1,
        total_hours: 10,
        total_cost: 250
      },
      courses: [
        {
          project_id: 'p-1',
          title: 'Corso Ceramica Base',
          type: 'CORSO',
          location: 'Aula 2',
          start_date: '2026-09-01',
          end_date: '2026-10-15',
          total_hours: 10,
          total_cost: 250,
          teachers: [
            {
              user_id: 't-2',
              first_name: 'Elena',
              last_name: 'Maestra',
              teacher_name: 'Elena Maestra',
              email: 'elena@primola.it',
              phone: '',
              hourly_rate: 25,
              assigned_hours: 10,
              total_cost: 250
            }
          ]
        }
      ]
    }
  };

  const mockProjectReport: ProjectReportData = {
    summary: {
      total_projects: 1,
      total_hours: 10,
      total_cost: 250
    },
    projects: []
  };

  beforeEach(() => {
    mockApi = {
      getOperationalMonthlyReport: vi.fn().mockReturnValue(of(mockOperationalReport)),
      getProjectsReport: vi.fn().mockReturnValue(of(mockProjectReport))
    };

    mockAuth = {
      isAdmin: vi.fn().mockReturnValue(true),
      isOffice: vi.fn().mockReturnValue(false),
      canManageUsers: vi.fn().mockReturnValue(true)
    };

    TestBed.configureTestingModule({
      providers: [
        ReportsComponent,
        { provide: ApiService, useValue: mockApi },
        { provide: AuthService, useValue: mockAuth }
      ]
    });

    component = TestBed.inject(ReportsComponent);
  });

  it('should initialize and load operational report and projects report', () => {
    component.ngOnInit();
    expect(mockApi.getOperationalMonthlyReport).toHaveBeenCalled();
    expect(mockApi.getProjectsReport).toHaveBeenCalled();
    expect(component.operationalData()).toEqual(mockOperationalReport);
    expect(component.reportData()).toEqual(mockProjectReport);
  });

  it('should filter student meals by search query', () => {
    component.ngOnInit();
    component.searchStudentQuery = 'giulia';
    expect(component.filteredStudentMeals().length).toBe(1);

    component.searchStudentQuery = 'sconosciuto';
    expect(component.filteredStudentMeals().length).toBe(0);
  });

  it('should toggle teacher shifts expansion', () => {
    component.ngOnInit();
    expect(component.isShiftsExpanded('t-1')).toBe(false);

    component.toggleTeacherShifts('t-1');
    expect(component.isShiftsExpanded('t-1')).toBe(true);

    component.toggleTeacherShifts('t-1');
    expect(component.isShiftsExpanded('t-1')).toBe(false);
  });

  it('should calculate total meals count', () => {
    component.ngOnInit();
    expect(component.totalMealsCount()).toBe(10);
  });
});
