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
        is_absent_justified: false,
        canteen_used: true,
        is_extra: false
      },
      {
        attendance_id: 'a-2',
        date: '2026-10-22',
        student_id: 2,
        first_name: 'Extra',
        last_name: 'Stud',
        school: 'Manzoni',
        is_present: false,
        is_absent_justified: false,
        canteen_used: false,
        is_extra: true
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
    from: '2026-10-01',
    to: '2026-10-22',
    total_meals: 35,
    breakdown: [
      { date: '2026-10-22', total_meals: 12, students: [{ id: 1, name: 'Leo' }] }
    ]
  };

  const mockMonthlyReport: any = {
    year: 2026,
    month: 10,
    from: '2026-10-01',
    to: '2026-10-31',
    summary: {
      totalPresent: 50,
      totalExtraPresent: 5,
      totalUnjustifiedAbsent: 2,
      totalExcused: 1,
      totalMeals: 48,
      activeDays: 14
    },
    dailyTrend: [{ date: '2026-10-01', present: 5, extra: 1, absent: 0, excused: 0, meals: 5 }],
    studentsSummary: [{ student_id: 1, first_name: 'Mario', last_name: 'Rossi', days_present: 10 }]
  };

  beforeEach(() => {
    mockApi = {
      getDailyReport: vi.fn().mockReturnValue(of(mockDailyReport)),
      getMonthlyReport: vi.fn().mockReturnValue(of(mockMonthlyReport)),
      getMensaReport: vi.fn().mockReturnValue(of(mockMensaReport))
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

  it('should reload mensa report when date range changes', () => {
    component.mensaFrom = '2026-09-01';
    component.mensaTo = '2026-09-30';
    component.loadMensaReport();
    expect(mockApi.getMensaReport).toHaveBeenCalledWith('2026-09-01', '2026-09-30');
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

    component.statusFilter = 'EXTRA';
    expect(component.filteredAttendances().length).toBe(1);
    expect(component.filteredAttendances()[0].is_extra).toBe(true);
  });
});
