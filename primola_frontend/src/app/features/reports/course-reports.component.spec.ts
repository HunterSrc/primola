import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { CourseReportsComponent } from './course-reports.component';
import { ApiService } from '../../core/services/api.service';
import { OperationalMonthlyReport, ProjectReportData } from '../../core/models';

describe('CourseReportsComponent', () => {
  let fixture: ComponentFixture<CourseReportsComponent>;
  let component: CourseReportsComponent;

  const mockOperationalReport: OperationalMonthlyReport = {
    period: { year: 2026, month: 11, from_date: '2026-11-01', to_date: '2026-11-30' },
    students_meals: [],
    afterschool_teachers: {
      summary: { total_teachers: 1, total_hours: 10, total_cost: 200 },
      teachers: [
        {
          user_id: 'u-1',
          first_name: 'Mario',
          last_name: 'Rossi',
          teacher_name: 'Mario Rossi',
          email: 'mario.rossi@primola.it',
          phone: '3331234567',
          hourly_rate: 20,
          shifts_count: 2,
          total_hours: 10,
          total_cost: 200,
          shifts: []
        }
      ]
    },
    finished_courses_teachers: {
      summary: { total_courses: 1, total_cost: 500 },
      courses: [
        {
          project_id: 'p-1',
          title: 'Corso Robotica',
          type: 'CORSO',
          status: 'COMPLETED',
          location: 'Aula 1',
          start_date: '2026-10-01',
          end_date: '2026-11-15',
          total_cost: 500,
          teachers: [
            {
              user_id: 'u-3',
              teacher_name: 'Giulia Verdi',
              email: 'giulia.verdi@primola.it',
              assigned_hours: 20,
              hourly_rate: 25,
              total_cost: 500
            }
          ]
        }
      ]
    },
    afterschool_expenses: {
      total_amount: 0,
      canteen_amount: 0,
      other_amount: 0,
      items: []
    }
  };

  const mockProjectsReport: ProjectReportData = {
    summary: { total_projects: 1, total_hours: 30, total_cost: 750 },
    projects: [
      {
        id: 'p-2',
        title: 'Laboratorio Teatro',
        location: 'Aula Magna',
        total_hours: 30,
        total_cost: 750,
        teachers: [
          {
            user_id: 'u-4',
            first_name: 'Luca',
            last_name: 'Neri',
            email: 'luca.neri@primola.it',
            hourly_rate: 25,
            assigned_hours: 30,
            total_cost: 750
          }
        ]
      }
    ]
  };

  beforeEach(async () => {
    const mockApi = {
      getOperationalMonthlyReport: vi.fn().mockReturnValue(of(mockOperationalReport)),
      getProjectsReport: vi.fn().mockReturnValue(of(mockProjectsReport))
    };

    await TestBed.configureTestingModule({
      imports: [CourseReportsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ApiService, useValue: mockApi }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CourseReportsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should render finished courses in MONTHLY tab and exclude afterschool teachers', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Rendicontazione Corsi');
    expect(text).toContain('Corso Robotica');
    expect(text).toContain('Giulia Verdi');
    expect(text).toContain('500.00');
    expect(text).not.toContain('Mario Rossi');
    expect(text).not.toContain('200.00');
  });

  it('should render projects summary in PROJECTS tab', () => {
    component.activeTab.set('PROJECTS');
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Laboratorio Teatro');
    expect(text).toContain('Luca Neri');
    expect(text).toContain('750.00');
  });

  it('should handle errors when loading monthly courses and projects report', () => {
    const api = TestBed.inject(ApiService);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(api, 'getOperationalMonthlyReport').mockReturnValue(throwError(() => new Error('Monthly fail')));
    vi.spyOn(api, 'getProjectsReport').mockReturnValue(throwError(() => new Error('Projects fail')));

    component.loadMonthlyCourses();
    expect(component.loadingMonthly()).toBe(false);

    component.loadProjectsReport();
    expect(component.loadingProjects()).toBe(false);

    expect(consoleSpy).toHaveBeenCalledTimes(2);
    consoleSpy.mockRestore();
  });
});
