import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { CoursePaymentsComponent } from './course-payments.component';
import { ApiService } from '../../core/services/api.service';

describe('CoursePaymentsComponent', () => {
  let component: CoursePaymentsComponent;
  let mockApi: any;

  const sampleInstallment: any = {
    id: 'inst1',
    installment_number: 1,
    amount: 50,
    status: 'PENDING',
    notes: ''
  };

  const sampleEnrollment: any = {
    id: 'enr1',
    course_student_id: 'cs1',
    student_nome: 'Mario',
    student_cognome: 'Rossi',
    project_id: 'p1',
    project_title: 'Corso Pittura',
    installments_count: 2,
    paid_installments_count: 1,
    installments: [sampleInstallment]
  };

  beforeEach(() => {
    mockApi = {
      getCourseEnrollments: vi.fn().mockReturnValue(
        of({
          enrollments: [sampleEnrollment],
          summary: { total_enrollments: 1, total_amount: 100, total_paid: 50, total_remaining: 50 }
        })
      ),
      getProjects: vi.fn().mockReturnValue(
        of([
          { id: 'p1', title: 'Corso Pittura', type: 'CORSO', enrollment_fee: 100, max_enrolled: 10, actual_enrolled: 10 },
          { id: 'p2', title: 'Doposcuola', type: 'DOPOSCUOLA' }
        ])
      ),
      getCourseStudents: vi.fn().mockReturnValue(of({ students: [{ id: 'cs1', nome: 'Mario', cognome: 'Rossi' }] })),
      createCourseEnrollment: vi.fn(),
      deleteCourseEnrollment: vi.fn(),
      payCourseInstallment: vi.fn(),
      updateCourseInstallment: vi.fn(),
      unpayCourseInstallment: vi.fn(),
      settleCourseEnrollment: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        CoursePaymentsComponent,
        { provide: ApiService, useValue: mockApi }
      ]
    });

    component = TestBed.inject(CoursePaymentsComponent);
  });

  it('should load enrollments, courses (excluding DOPOSCUOLA), and students on init', () => {
    component.ngOnInit();

    expect(component.enrollments()).toHaveLength(1);
    expect(component.summary().total_enrollments).toBe(1);
    expect(component.courses()).toHaveLength(1);
    expect(component.students()).toHaveLength(1);
    expect(component.isLoading()).toBe(false);
  });

  it('should handle load errors gracefully', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockApi.getCourseEnrollments.mockReturnValue(throwError(() => new Error('fail')));
    mockApi.getProjects.mockReturnValue(throwError(() => new Error('fail')));
    mockApi.getCourseStudents.mockReturnValue(throwError(() => new Error('fail')));

    component.ngOnInit();

    expect(component.alertType()).toBe('error');
    expect(component.isLoading()).toBe(false);
    consoleSpy.mockRestore();
  });

  it('should filter by project, status, search (debounced), and reset filters', () => {
    vi.useFakeTimers();
    component.onProjectFilterChange('p1');
    expect(component.selectedProjectId()).toBe('p1');

    component.onStatusFilterChange('PAID');
    expect(component.selectedStatus()).toBe('PAID');

    component.onSearchChange('ross');
    component.onSearchChange('rossi');
    vi.advanceTimersByTime(250);
    expect(component.searchQuery()).toBe('rossi');
    expect(mockApi.getCourseEnrollments).toHaveBeenCalled();

    component.resetFilters();
    expect(component.selectedProjectId()).toBe('');
    expect(component.selectedStatus()).toBe('');
    expect(component.searchQuery()).toBe('');
    vi.useRealTimers();
  });

  it('should toggle expand/collapse state', () => {
    expect(component.isExpanded('enr1')).toBe(false);
    component.toggleExpand('enr1');
    expect(component.isExpanded('enr1')).toBe(true);
    component.toggleExpand('enr1');
    expect(component.isExpanded('enr1')).toBe(false);
  });

  it('should open new enrollment modal, check capacity, and submit', () => {
    component.ngOnInit();
    component.selectedProjectId.set('p1');
    component.openNewEnrollmentModal();

    expect(component.showNewEnrollmentModal()).toBe(true);
    expect(component.newEnrollForm.total_amount).toBe(100);
    const selectedCourse = component.getSelectedCourseForNewEnroll();
    expect(selectedCourse?.id).toBe('p1');
    expect(component.isCourseAtOrOverCapacity(selectedCourse!)).toBe(true);

    component.newEnrollForm.project_id = '';
    expect(component.getSelectedCourseForNewEnroll()).toBeNull();

    // Missing student -> no API call
    component.submitNewEnrollment();
    expect(mockApi.createCourseEnrollment).not.toHaveBeenCalled();

    component.newEnrollForm.course_student_id = 'cs1';
    component.newEnrollForm.project_id = 'p1';
    mockApi.createCourseEnrollment.mockReturnValue(
      of({ over_capacity: true, actual_enrolled: 11, max_enrolled: 10, enrollment: { id: 'enr2' } })
    );
    component.submitNewEnrollment();
    expect(component.alertType()).toBe('warning');
    expect(component.isExpanded('enr2')).toBe(true);

    // Normal creation
    component.openNewEnrollmentModal();
    component.newEnrollForm.course_student_id = 'cs1';
    mockApi.createCourseEnrollment.mockReturnValue(of({ over_capacity: false, enrollment: { id: 'enr3' } }));
    component.submitNewEnrollment();
    expect(component.alertType()).toBe('success');

    // Error
    component.openNewEnrollmentModal();
    component.newEnrollForm.course_student_id = 'cs1';
    mockApi.createCourseEnrollment.mockReturnValue(throwError(() => ({ error: { error: 'Duplicato' } })));
    component.submitNewEnrollment();
    expect(component.modalError()).toBe('Duplicato');

    component.closeNewEnrollmentModal();
    expect(component.showNewEnrollmentModal()).toBe(false);
  });

  it('should delete enrollment when confirmed', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    component.deleteEnrollment(sampleEnrollment);
    expect(mockApi.deleteCourseEnrollment).not.toHaveBeenCalled();

    confirmSpy.mockReturnValue(true);
    mockApi.deleteCourseEnrollment.mockReturnValue(of({}));
    component.deleteEnrollment(sampleEnrollment);
    expect(mockApi.deleteCourseEnrollment).toHaveBeenCalledWith('enr1');
    expect(component.alertType()).toBe('success');

    mockApi.deleteCourseEnrollment.mockReturnValue(throwError(() => ({})));
    component.deleteEnrollment(sampleEnrollment);
    expect(component.alertType()).toBe('error');
    confirmSpy.mockRestore();
  });

  it('should pay single installment, edit inline amount, unpay, and settle all', () => {
    // Pay modal
    component.activeInstallment.set(null);
    component.submitPayInstallment(); // should do nothing if no active installment

    component.openPayInstallmentModal(sampleEnrollment, sampleInstallment);
    expect(component.showPayModal()).toBe(true);
    mockApi.payCourseInstallment.mockReturnValue(of({}));
    component.submitPayInstallment();
    expect(component.showPayModal()).toBe(false);
    expect(component.alertType()).toBe('success');

    mockApi.payCourseInstallment.mockReturnValue(throwError(() => ({ error: { error: 'Pay error' } })));
    component.openPayInstallmentModal(sampleEnrollment, sampleInstallment);
    component.submitPayInstallment();
    expect(component.modalError()).toBe('Pay error');
    component.closePayModal();

    // Inline edit
    component.startInlineEdit(sampleInstallment);
    expect(component.editingInstallmentId()).toBe('inst1');
    component.inlineAmount = -10;
    component.saveInlineInstallment('inst1');
    expect(component.alertType()).toBe('error');

    component.inlineAmount = 75;
    mockApi.updateCourseInstallment.mockReturnValue(of({}));
    component.saveInlineInstallment('inst1');
    expect(component.editingInstallmentId()).toBeNull();
    expect(component.alertType()).toBe('success');

    // Inline edit error callback
    mockApi.updateCourseInstallment.mockReturnValue(throwError(() => ({ error: { error: 'Update failed' } })));
    component.saveInlineInstallment('inst1');
    expect(component.alertType()).toBe('error');

    component.cancelInlineEdit();
    expect(component.editingInstallmentId()).toBeNull();

    // Unpay cancel
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    component.unpayInstallment(sampleInstallment);
    expect(mockApi.unpayCourseInstallment).not.toHaveBeenCalled();

    // Unpay confirmed & success
    confirmSpy.mockReturnValue(true);
    mockApi.unpayCourseInstallment.mockReturnValue(of({}));
    component.unpayInstallment(sampleInstallment);
    expect(mockApi.unpayCourseInstallment).toHaveBeenCalledWith('inst1');

    // Unpay confirmed & error
    mockApi.unpayCourseInstallment.mockReturnValue(throwError(() => ({ error: { error: 'Unpay failed' } })));
    component.unpayInstallment(sampleInstallment);
    expect(component.alertType()).toBe('error');
    confirmSpy.mockRestore();

    // Settle all without active enrollment
    component.activeEnrollment.set(null);
    component.submitSettleEnrollment();
    expect(mockApi.settleCourseEnrollment).not.toHaveBeenCalled();

    // Settle all with active enrollment
    component.openSettleModal(sampleEnrollment);
    expect(component.showSettleModal()).toBe(true);
    mockApi.settleCourseEnrollment.mockReturnValue(of({}));
    component.submitSettleEnrollment();
    expect(component.showSettleModal()).toBe(false);
    expect(component.alertType()).toBe('success');

    // Settle all error
    component.openSettleModal(sampleEnrollment);
    mockApi.settleCourseEnrollment.mockReturnValue(throwError(() => ({ error: { error: 'Settle failed' } })));
    component.submitSettleEnrollment();
    expect(component.modalError()).toBe('Settle failed');
    component.closeSettleModal();
  });

  it('should compute progress, card badges, labels, and format dates', () => {
    expect(component.getPaidCount(sampleEnrollment)).toBe(1);
    expect(component.getPaidCount({ paid_installments_count: undefined, installments: [{ status: 'PAID' }, { status: 'PENDING' }] } as any)).toBe(1);
    expect(component.getPaidCount({ paid_installments_count: null, installments: [] } as any)).toBe(0);

    expect(component.getProgressPercent(sampleEnrollment)).toBe(50);
    expect(component.getProgressPercent({ installments_count: 0 } as any)).toBe(0);

    expect(component.getCardBadgeClass('VALIDA')).toContain('emerald');
    expect(component.getCardBadgeClass('IN_SCADENZA')).toContain('amber');
    expect(component.getCardBadgeClass('SCADUTA')).toContain('rose');
    expect(component.getCardBadgeClass(undefined)).toContain('slate');

    expect(component.getCardShortLabel('VALIDA')).toBe('Tessera OK');
    expect(component.getCardShortLabel('IN_SCADENZA')).toBe('Tessera in scad.');
    expect(component.getCardShortLabel('SCADUTA')).toBe('Tessera scaduta');
    expect(component.getCardShortLabel(undefined)).toBe('No tessera');

    expect(component.formatDate(null)).toBe('—');
    expect(component.formatDate('2026-11-21')).toBe('21/11/2026');
    expect(component.formatDate('invalid')).toBe('invalid');
  });
});
