import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { AdminDashboardComponent } from './admin-dashboard.component';
import { ApiService } from '../../core/services/api.service';
import { of } from 'rxjs';

describe('AdminDashboardComponent', () => {
  let component: AdminDashboardComponent;
  let mockApi: any;

  const mockFinancialReport = {
    year: 2026,
    month: 10,
    rates: { one_off_fee: 15, meal_fee_student: 5.5 },
    doposcuola: {
      revenues: { actual: 100, expected: 120, pending: 20, expected_days: 10, actual_days: 8, expected_meals: 15, actual_meals: 15 },
      expenses: { actual: 80, expected: 90 },
      margin: { actual: 20, expected: 30 },
      total_meals: 15,
      teachers: []
    },
    courses: {
      revenues: { actual: 200, expected: 250 },
      expenses: { actual: 150, expected: 180 },
      margin: { actual: 50, expected: 70 },
      teachers: []
    },
    summary: {
      total_actual_revenues: 300,
      total_expected_revenues: 370,
      total_pending_revenues: 20,
      total_actual_expenses: 230,
      total_expected_expenses: 270,
      total_actual_margin: 70,
      total_expected_margin: 100,
      total_meals_issued: 15
    }
  };

  beforeEach(() => {
    mockApi = {
      getSystemSettings: vi.fn().mockReturnValue(of({ list: [], settings: { meal_fee_student: 5.5 } })),
      updateSystemSettings: vi.fn().mockReturnValue(of({ success: true })),
      getFinancialMonthlyReport: vi.fn().mockReturnValue(of(mockFinancialReport))
    };

    TestBed.configureTestingModule({
      providers: [
        AdminDashboardComponent,
        { provide: ApiService, useValue: mockApi }
      ]
    });

    component = TestBed.inject(AdminDashboardComponent);
  });

  it('should initialize and load financial report and settings', () => {
    component.ngOnInit();
    expect(mockApi.getFinancialMonthlyReport).toHaveBeenCalledWith(component.financialYear, component.financialMonth);
    expect(mockApi.getSystemSettings).toHaveBeenCalled();
    expect(component.financialReport()?.doposcuola.revenues.pending).toBe(20);
    expect(component.loadingFinancial()).toBe(false);
  });

  it('should reload financial report when month or year changes', () => {
    component.financialYear = 2025;
    component.financialMonth = 5;
    component.loadFinancialReport();
    expect(mockApi.getFinancialMonthlyReport).toHaveBeenCalledWith(2025, 5);
  });

  it('should save meal_fee_student without doposcuola_daily_fee', () => {
    component.openSettingsModal();
    expect(component.showSettingsModal()).toBe(true);
    component.editSettings.meal_fee_student = 6.0;
    component.saveSettings();

    expect(mockApi.updateSystemSettings).toHaveBeenCalledWith({ meal_fee_student: 6.0 });
    expect(component.showSettingsModal()).toBe(false);
    expect(mockApi.getFinancialMonthlyReport).toHaveBeenCalled();
  });
});
