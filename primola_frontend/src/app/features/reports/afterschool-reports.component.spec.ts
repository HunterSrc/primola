import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { AfterschoolReportsComponent } from './afterschool-reports.component';
import { ApiService } from '../../core/services/api.service';
import { OperationalMonthlyReport } from '../../core/models';

describe('AfterschoolReportsComponent', () => {
  let fixture: ComponentFixture<AfterschoolReportsComponent>;
  let component: AfterschoolReportsComponent;

  const mockOperationalReport: OperationalMonthlyReport = {
    period: { year: 2026, month: 11, from_date: '2026-11-01', to_date: '2026-11-30' },
    students_meals: [],
    afterschool_teachers: {
      summary: { total_teachers: 2, total_hours: 18, total_cost: 360 },
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
          shifts: [
            { id: 's-1', shift_date: '2026-11-03', start_time: '14:00', end_time: '19:00', hours: 5, cost: 100, notes: '' },
            { id: 's-2', shift_date: '2026-11-10', start_time: '14:00', end_time: '19:00', hours: 5, cost: 100, notes: '' }
          ]
        },
        {
          user_id: 'u-2',
          first_name: 'Laura',
          last_name: 'Bianchi',
          teacher_name: 'Laura Bianchi',
          email: 'laura.bianchi@primola.it',
          phone: '3337654321',
          hourly_rate: 20,
          shifts_count: 2,
          total_hours: 8,
          total_cost: 160,
          shifts: [
            { id: 's-3', shift_date: '2026-11-04', start_time: '14:00', end_time: '18:00', hours: 4, cost: 80, notes: '' },
            { id: 's-4', shift_date: '2026-11-11', start_time: '14:00', end_time: '18:00', hours: 4, cost: 80, notes: '' }
          ]
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
          teachers: []
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

  beforeEach(async () => {
    const mockApi = {
      getOperationalMonthlyReport: vi.fn().mockReturnValue(of(mockOperationalReport))
    };

    await TestBed.configureTestingModule({
      imports: [AfterschoolReportsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ApiService, useValue: mockApi }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AfterschoolReportsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should render only afterschool teachers and shifts, excluding course costs', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Rendicontazione Doposcuola');
    expect(text).toContain('Mario Rossi');
    expect(text).toContain('Laura Bianchi');
    expect(text).toContain('360.00');
    expect(text).toContain('18 h');
    expect(text).not.toContain('Corso Robotica');
    expect(text).not.toContain('500.00');
  });

  it('should expand teacher shifts when toggled', () => {
    expect(component.isShiftsExpanded('u-1')).toBe(false);
    component.toggleTeacherShifts('u-1');
    fixture.detectChanges();
    expect(component.isShiftsExpanded('u-1')).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Dettaglio Turni Calendario - Mario Rossi');
  });

  it('should handle error when loading report fails', () => {
    const api = TestBed.inject(ApiService);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(api, 'getOperationalMonthlyReport').mockReturnValue(throwError(() => new Error('Load failed')));

    component.loadReport();
    expect(component.loading()).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith('Errore caricamento rendicontazione doposcuola:', expect.any(Error));
    consoleSpy.mockRestore();
  });
});
