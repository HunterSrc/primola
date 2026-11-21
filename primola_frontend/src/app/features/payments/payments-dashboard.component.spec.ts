import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { PaymentsDashboardComponent } from './payments-dashboard.component';
import { ApiService } from '../../core/services/api.service';

describe('PaymentsDashboardComponent', () => {
  let component: PaymentsDashboardComponent;
  let mockApi: any;

  const sampleSummary: any = {
    year: 2026,
    month: 11,
    students: [
      {
        student_id: 's1',
        first_name: 'Giulia',
        last_name: 'Neri',
        school: 'Manzoni',
        extra_days_count: 2,
        extra_days_total: 20,
        extra_paid: false,
        meals_count: 3,
        meals_total: 15,
        meals_paid: false,
        payment_method: 'Contanti',
        notes: 'Nota',
        previous_month_pending: {
          year: 2026,
          month: 10,
          extra_days_count: 1,
          extra_days_total: 10,
          extra_paid: false,
          meals_count: 0,
          meals_total: 0,
          meals_paid: true
        }
      },
      {
        student_id: 's2',
        first_name: 'Marco',
        last_name: 'Bianchi',
        school: 'Pascoli',
        extra_days_count: 0,
        extra_days_total: 0,
        extra_paid: true,
        meals_count: 0,
        meals_total: 0,
        meals_paid: true
      }
    ]
  };

  beforeEach(() => {
    mockApi = {
      getAfterschoolPackages: vi.fn().mockReturnValue(
        of([
          { id: 'pkg1', name: 'Base', is_active: true },
          { id: 'pkg2', name: 'Old', is_active: false }
        ])
      ),
      getMonthlyBilling: vi.fn().mockReturnValue(of(sampleSummary)),
      assignTariffToStudent: vi.fn(),
      removeStudentTariff: vi.fn(),
      settleMonthlyPayments: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        PaymentsDashboardComponent,
        { provide: ApiService, useValue: mockApi }
      ]
    });

    component = TestBed.inject(PaymentsDashboardComponent);
  });

  it('should load active packages and billing on init', () => {
    component.ngOnInit();

    expect(component.availablePackages()).toEqual([{ id: 'pkg1', name: 'Base', is_active: true }]);
    expect(component.billingData()).toEqual(sampleSummary);
    expect(component.isLoading()).toBe(false);
  });

  it('should handle errors when loading packages and billing', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockApi.getAfterschoolPackages.mockReturnValue(throwError(() => new Error('fail')));
    mockApi.getMonthlyBilling.mockReturnValue(throwError(() => ({ error: { error: 'DB error' } })));

    component.ngOnInit();

    expect(consoleSpy).toHaveBeenCalled();
    expect(component.alertType()).toBe('error');
    expect(component.alertMessage()).toBe('DB error');
    expect(component.isLoading()).toBe(false);
    consoleSpy.mockRestore();
  });

  it('should navigate months and years correctly', () => {
    component.selectedYear = 2026;
    component.selectedMonth = 1;
    component.previousMonth();
    expect(component.selectedYear).toBe(2025);
    expect(component.selectedMonth).toBe(12);

    component.nextMonth();
    expect(component.selectedYear).toBe(2026);
    expect(component.selectedMonth).toBe(1);

    component.nextMonth();
    expect(component.selectedMonth).toBe(2);

    component.previousMonth();
    expect(component.selectedMonth).toBe(1);

    expect(component.getMonthName(1)).toBe('Gennaio');
    expect(component.getMonthName(99)).toBe('');
  });

  it('should filter students by name or school', () => {
    component.billingData.set(sampleSummary);
    expect(component.filteredStudents()).toHaveLength(2);

    component.searchQuery = 'pascoli';
    expect(component.filteredStudents().map(s => s.student_id)).toEqual(['s2']);

    component.searchQuery = 'giulia';
    expect(component.filteredStudents().map(s => s.student_id)).toEqual(['s1']);
  });

  it('should assign and remove packages', () => {
    const stu = sampleSummary.students[0];
    component.openAssignModal(stu);
    expect(component.showAssignModal()).toBe(true);

    // No package selected -> no API call
    component.submitAssignPackage();
    expect(mockApi.assignTariffToStudent).not.toHaveBeenCalled();

    component.selectedPackageId = 'pkg1';
    component.assignNotes = '  test  ';
    mockApi.assignTariffToStudent.mockReturnValue(of({}));
    component.submitAssignPackage();

    expect(mockApi.assignTariffToStudent).toHaveBeenCalledWith(
      expect.objectContaining({ student_id: 's1', package_id: 'pkg1', notes: 'test' })
    );
    expect(component.showAssignModal()).toBe(false);
    expect(component.alertType()).toBe('success');

    mockApi.assignTariffToStudent.mockReturnValue(throwError(() => ({})));
    component.openAssignModal(stu);
    component.selectedPackageId = 'pkg1';
    component.submitAssignPackage();
    expect(component.alertType()).toBe('error');

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    component.removePackage('a1');
    expect(mockApi.removeStudentTariff).not.toHaveBeenCalled();

    confirmSpy.mockReturnValue(true);
    mockApi.removeStudentTariff.mockReturnValue(of({}));
    component.removePackage('a1');
    expect(mockApi.removeStudentTariff).toHaveBeenCalledWith('a1');

    mockApi.removeStudentTariff.mockReturnValue(throwError(() => ({})));
    component.removePackage('a1');
    expect(component.alertType()).toBe('error');
    confirmSpy.mockRestore();
  });

  it('should open settle modal for current or previous month and submit settlement', () => {
    const stu = sampleSummary.students[0];

    // Previous month pending
    component.openSettleModal(stu, 2026, 10);
    expect(component.showSettleModal()).toBe(true);
    expect(component.settleExtraDaysCount).toBe(1);
    expect(component.settleExtraCheck).toBe(true);
    expect(component.settleMealsCheck).toBe(false);

    // Current month
    component.openSettleModal(stu, 2026, 11);
    expect(component.settleExtraDaysCount).toBe(2);
    expect(component.settleMealsCount).toBe(3);
    expect(component.settlePaymentMethod).toBe('Contanti');

    // Settle with null student
    component.selectedStudent.set(null);
    component.submitSettlePayments();
    expect(mockApi.settleMonthlyPayments).not.toHaveBeenCalled();

    // Settle with student having no notes and no payment method
    component.selectedStudent.set({ student_id: 's3', extra_paid: false, extra_days_count: 1, meals_paid: false, meals_count: 1 } as any);
    component.openSettleModal({ student_id: 's3', extra_paid: false, extra_days_count: 1, meals_paid: false, meals_count: 1 } as any);
    expect(component.settlePaymentMethod).toBe('Bonifico');
    expect(component.settleNotes).toBe('');

    // Previous month with meals unpaid and meals_count > 0
    component.openSettleModal({
      student_id: 's4',
      previous_month_pending: { year: 2026, month: 10, meals_paid: false, meals_count: 5, extra_paid: true, extra_days_count: 0 }
    } as any, 2026, 10);
    expect(component.settleMealsCheck).toBe(true);
    expect(component.settleExtraCheck).toBe(false);

    // Close settle modal when showAssignModal is true vs false
    component.showAssignModal.set(true);
    component.closeSettleModal();
    expect(component.selectedStudent()).not.toBeNull();

    component.showAssignModal.set(false);
    component.closeSettleModal();
    expect(component.selectedStudent()).toBeNull();

    component.selectedStudent.set(stu);
    mockApi.settleMonthlyPayments.mockReturnValue(of({}));
    component.submitSettlePayments();
    expect(mockApi.settleMonthlyPayments).toHaveBeenCalled();
    expect(component.showSettleModal()).toBe(false);
    expect(component.alertType()).toBe('success');

    mockApi.settleMonthlyPayments.mockReturnValue(throwError(() => ({})));
    component.openSettleModal(stu);
    component.submitSettlePayments();
    expect(component.alertType()).toBe('error');
  });

  it('should clear alert after timeout', () => {
    vi.useFakeTimers();
    component.showAlert('Test', 'success');
    expect(component.alertMessage()).toBe('Test');
    vi.advanceTimersByTime(4000);
    expect(component.alertMessage()).toBeNull();
    vi.useRealTimers();
  });
});
