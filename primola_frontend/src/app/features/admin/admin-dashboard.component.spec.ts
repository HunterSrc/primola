import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { AdminDashboardComponent } from './admin-dashboard.component';
import { ApiService } from '../../core/services/api.service';
import { of } from 'rxjs';
import { DailyReport, MensaReport } from '../../core/models';

describe('AdminDashboardComponent', () => {
  let component: AdminDashboardComponent;
  let mockApi: any;

  const mockDailyReport: DailyReport = {
    date: '2026-10-22',
    statistics: { totalExpected: 20, present: 16, absent: 4, excused: 2, totalInserted: 2 },
    allAttendances: [
      {
        attendance_id: 'a-1',
        date: '2026-10-22',
        student_id: 1,
        first_name: 'Mario',
        last_name: 'Rossi',
        school: 'Rodari',
        is_present: true,
        canteen_used: true
      },
      {
        attendance_id: 'a-2',
        date: '2026-10-22',
        student_id: 2,
        first_name: 'Luigi',
        last_name: 'Verdi',
        school: 'Manzoni',
        is_present: false,
        canteen_used: false
      }
    ],
    unjustifiedAbsences: [
      {
        student_id: 3,
        first_name: 'Luca',
        last_name: 'Verdi',
        school: 'Scuola Rodari',
        tutor_name: 'Mamma',
        tutor_phone: '+39 333'
      }
    ]
  };

  const mockMensaReport: MensaReport = {
    year: 2026,
    month: 10,
    from: '2026-10-01',
    to: '2026-10-31',
    total_meals: 35,
    delivered_regular: 30,
    delivered_extra: 5,
    expected_meals: 36,
    breakdown: [
      { date: '2026-10-22', total_meals: 12, students: [{ id: 1, name: 'Leo' }] }
    ],
    students_breakdown: []
  };

  const mockMonthlyReport: any = {
    year: 2026,
    month: 10,
    from: '2026-10-01',
    to: '2026-10-31',
    summary: {
      totalPresent: 50,
      totalUnjustifiedAbsent: 2,
      totalMeals: 48,
      activeDays: 14
    },
    dailyTrend: [{ date: '2026-10-01', present: 5, absent: 0, meals: 5 }],
    studentsSummary: [
      {
        student_id: 1,
        first_name: 'Mario',
        last_name: 'Rossi',
        days_present: 10,
        days_absent: 2,
        presenze_pagate: 10,
        eccedenza: 2
      }
    ]
  };

  beforeEach(() => {
    mockApi = {
      getDailyReport: vi.fn().mockReturnValue(of(mockDailyReport)),
      getMonthlyReport: vi.fn().mockReturnValue(of(mockMonthlyReport)),
      getMensaReport: vi.fn().mockReturnValue(of(mockMensaReport)),
      saveMonthlyPlans: vi.fn().mockReturnValue(of({ success: true })),
      getSystemSettings: vi.fn().mockReturnValue(of({ list: [], settings: { doposcuola_daily_fee: 12, meal_fee_student: 5.5, meal_cost_provider: 4.8 } })),
      getFinancialMonthlyReport: vi.fn().mockReturnValue(of({
        year: 2026,
        month: 10,
        doposcuola: { revenues: { actual: 100, expected: 120 }, expenses: { actual: 80, expected: 90 }, margin: { actual: 20, expected: 30 }, total_meals: 15, teachers: [] },
        courses: { revenues: { actual: 200, expected: 250 }, expenses: { actual: 150, expected: 180 }, margin: { actual: 50, expected: 70 }, teachers: [] },
        summary: { total_actual_revenues: 300, total_expected_revenues: 370, total_actual_expenses: 230, total_expected_expenses: 270, total_actual_margin: 70, total_expected_margin: 100, total_meals_issued: 15 }
      }))
    };

    TestBed.configureTestingModule({
      providers: [
        AdminDashboardComponent,
        { provide: ApiService, useValue: mockApi }
      ]
    });

    component = TestBed.inject(AdminDashboardComponent);
  });

  it('should initialize and load daily report and mensa report', () => {
    component.ngOnInit();
    expect(mockApi.getDailyReport).toHaveBeenCalled();
    expect(mockApi.getMonthlyReport).toHaveBeenCalled();
    expect(mockApi.getMensaReport).toHaveBeenCalled();
    expect(component.dailyReport()).toEqual(mockDailyReport);
    expect(component.monthlyReport()).toEqual(mockMonthlyReport);
    expect(component.mensaReport()).toEqual(mockMensaReport);
    expect(component.activeSection()).toBe('ATTENDANCES');
  });

  it('should load monthly report when month or year changes', () => {
    component.selectedYear = 2025;
    component.selectedMonth = 5;
    component.loadMonthlyReport();
    expect(mockApi.getMonthlyReport).toHaveBeenCalledWith(2025, 5);
  });

  it('should handle date change for daily report', () => {
    component.onReportDateChange('2026-11-01');
    expect(component.reportDate()).toBe('2026-11-01');
    expect(mockApi.getDailyReport).toHaveBeenCalledWith('2026-11-01');
  });

  it('should reload mensa report when month or year changes', () => {
    component.mensaYear = 2026;
    component.mensaMonth = 9;
    component.loadMensaReport();
    expect(mockApi.getMensaReport).toHaveBeenCalledWith(2026, 9);
  });

  it('should filter attendances by search query and status', () => {
    component.ngOnInit();
    expect(component.filteredAttendances().length).toBe(2);

    component.searchAttendanceQuery = 'Mario';
    expect(component.filteredAttendances().length).toBe(1);
    expect(component.filteredAttendances()[0].first_name).toBe('Mario');

    component.searchAttendanceQuery = '';
    component.statusFilter = 'PRESENT';
    expect(component.filteredAttendances().length).toBe(1);

    component.statusFilter = 'ABSENT';
    expect(component.filteredAttendances().length).toBe(1);
  });

  it('should calculate eccedenza correctly and save student plan', () => {
    const stu: any = {
      student_id: 1,
      days_present: 18,
      days_absent: 2,
      presenze_pagate: 20
    };
    expect(component.getEccedenza(stu)).toBe(0);

    stu.presenze_pagate = 15;
    expect(component.getEccedenza(stu)).toBe(5);

    component.selectedYear = 2026;
    component.selectedMonth = 10;
    component.saveStudentPlan(stu);
    expect(mockApi.saveMonthlyPlans).toHaveBeenCalledWith({
      year: 2026,
      month: 10,
      plans: [{ student_id: 1, presenze_pagate: 15 }]
    });
    expect(stu.eccedenza).toBe(5);
  });
});
