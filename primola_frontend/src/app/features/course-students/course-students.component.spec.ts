import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { CourseStudentsComponent } from './course-students.component';
import { ApiService } from '../../core/services/api.service';

describe('CourseStudentsComponent', () => {
  let component: CourseStudentsComponent;
  let mockApi: any;

  const sampleStudent: any = {
    id: 'cs1',
    nome: 'Mario',
    cognome: 'Rossi',
    email: 'mario@test.it',
    telefono: '123',
    data_nascita: '2010-05-10T00:00:00Z',
    possiede_tessera: true,
    data_scadenza_tessera: '2027-01-01T00:00:00Z',
    card_status: 'VALIDA'
  };

  beforeEach(() => {
    mockApi = {
      getCourseStudents: vi.fn().mockReturnValue(
        of({
          students: [sampleStudent],
          summary: { total: 1, valid: 1, expiring_soon: 0, expired: 0, no_card: 0 }
        })
      ),
      getProjects: vi.fn().mockReturnValue(
        of([
          { id: 'p1', title: 'Corso Danza', type: 'CORSO', enrollment_fee: 120, max_enrolled: 5, actual_enrolled: 5 },
          { id: 'p2', title: 'Doposcuola', type: 'DOPOSCUOLA' }
        ])
      ),
      createCourseStudent: vi.fn(),
      updateCourseStudent: vi.fn(),
      deleteCourseStudent: vi.fn(),
      getCourseStudent: vi.fn().mockReturnValue(of({ ...sampleStudent, enrollments: [] })),
      createCourseEnrollment: vi.fn(),
      deleteCourseEnrollment: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        CourseStudentsComponent,
        { provide: ApiService, useValue: mockApi }
      ]
    });

    component = TestBed.inject(CourseStudentsComponent);
  });

  it('should load students and courses on init', () => {
    component.ngOnInit();

    expect(component.students()).toHaveLength(1);
    expect(component.summary().total).toBe(1);
    expect(component.courses()).toHaveLength(1);
    expect(component.isLoading()).toBe(false);
  });

  it('should handle load errors', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockApi.getCourseStudents.mockReturnValue(throwError(() => new Error('fail')));
    mockApi.getProjects.mockReturnValue(throwError(() => new Error('fail')));

    component.ngOnInit();

    expect(component.alertType()).toBe('error');
    expect(component.isLoading()).toBe(false);
    consoleSpy.mockRestore();
  });

  it('should filter by search (debounced) and card status, and reset filters', () => {
    vi.useFakeTimers();
    component.onSearchChange('first');
    component.onSearchChange('rossi');
    vi.advanceTimersByTime(250);
    expect(component.searchQuery()).toBe('rossi');

    component.setCardStatusFilter('VALIDA');
    expect(component.selectedCardStatus()).toBe('VALIDA');

    component.resetFilters();
    expect(component.searchQuery()).toBe('');
    expect(component.selectedCardStatus()).toBe('');
    vi.useRealTimers();
  });

  it('should open create/edit modal, validate, and save student', () => {
    component.openCreateModal();
    expect(component.showStudentModal()).toBe(true);
    expect(component.editingStudentId()).toBeNull();

    // Missing nome/cognome
    component.saveStudent();
    expect(component.modalError()).toBe('Nome e Cognome sono obbligatori.');

    component.form.nome = 'Luca';
    component.form.cognome = 'Bianchi';
    component.form.possiede_tessera = true;
    component.form.data_scadenza_tessera = '2027-05-01';
    component.onTesseraToggle(false);
    expect(component.form.data_scadenza_tessera).toBe('');

    mockApi.createCourseStudent.mockReturnValue(of({ id: 'cs2' }));
    component.saveStudent();
    expect(mockApi.createCourseStudent).toHaveBeenCalled();
    expect(component.showStudentModal()).toBe(false);
    expect(component.alertType()).toBe('success');

    // Edit mode
    component.openEditModal(sampleStudent);
    expect(component.editingStudentId()).toBe('cs1');
    expect(component.form.data_nascita).toBe('2010-05-10');
    mockApi.updateCourseStudent.mockReturnValue(of({}));
    component.saveStudent();
    expect(mockApi.updateCourseStudent).toHaveBeenCalledWith('cs1', expect.any(Object));

    // Save error
    component.openCreateModal();
    component.form.nome = 'A';
    component.form.cognome = 'B';
    mockApi.createCourseStudent.mockReturnValue(throwError(() => ({ error: { error: 'Errore' } })));
    component.saveStudent();
    expect(component.modalError()).toBe('Errore');
  });

  it('should delete student when confirmed', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    component.deleteStudent(sampleStudent);
    expect(mockApi.deleteCourseStudent).not.toHaveBeenCalled();

    confirmSpy.mockReturnValue(true);
    mockApi.deleteCourseStudent.mockReturnValue(of({}));
    component.deleteStudent(sampleStudent);
    expect(mockApi.deleteCourseStudent).toHaveBeenCalledWith('cs1');

    mockApi.deleteCourseStudent.mockReturnValue(throwError(() => ({})));
    component.deleteStudent(sampleStudent);
    expect(component.alertType()).toBe('error');
    confirmSpy.mockRestore();
  });

  it('should manage enrollments modal, capacity check, and submit enrollment', () => {
    // Submit with null student or empty project_id
    component.selectedStudent.set(null);
    component.submitEnrollment();
    expect(mockApi.createCourseEnrollment).not.toHaveBeenCalled();

    component.ngOnInit();
    component.openEnrollmentsModal(sampleStudent);
    expect(component.showEnrollmentsModal()).toBe(true);

    component.enrollForm.project_id = '';
    component.submitEnrollment();
    expect(mockApi.createCourseEnrollment).not.toHaveBeenCalled();

    component.enrollForm.project_id = 'p1';
    component.onCourseSelectChange('p1');
    expect(component.enrollForm.total_amount).toBe(120);

    component.onCourseSelectChange('nonexistent');
    expect(component.enrollForm.total_amount).toBe(0);

    component.enrollForm.project_id = 'p1';
    const course = component.getSelectedCourseForEnroll();
    expect(course?.id).toBe('p1');
    expect(component.isCourseAtOrOverCapacity(course!)).toBe(true);

    mockApi.createCourseEnrollment.mockReturnValue(
      of({ over_capacity: true, actual_enrolled: 6, max_enrolled: 5 })
    );
    component.submitEnrollment();
    expect(component.alertType()).toBe('warning');

    component.enrollForm.project_id = 'p1';
    mockApi.createCourseEnrollment.mockReturnValue(of({ over_capacity: false }));
    component.submitEnrollment();
    expect(component.alertType()).toBe('success');

    component.enrollForm.project_id = 'p1';
    mockApi.createCourseEnrollment.mockReturnValue(throwError(() => ({})));
    component.submitEnrollment();
    expect(component.enrollModalError()).toContain('Errore');

    // Refresh student error
    mockApi.getCourseStudent.mockReturnValue(throwError(() => ({ error: { error: 'Dettagli non trovati' } })));
    component.refreshSelectedStudent('cs1');
    expect(component.enrollModalError()).toBe('Dettagli non trovati');

    component.closeEnrollmentsModal();
    expect(component.showEnrollmentsModal()).toBe(false);
  });

  it('should remove enrollment from student with confirm and handle errors', () => {
    // With null student
    component.selectedStudent.set(null);
    component.removeEnrollment('enr1');
    expect(mockApi.deleteCourseEnrollment).not.toHaveBeenCalled();

    component.selectedStudent.set(sampleStudent);

    // Cancelled
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    component.removeEnrollment('enr1');
    expect(mockApi.deleteCourseEnrollment).not.toHaveBeenCalled();

    // Confirmed & success
    confirmSpy.mockReturnValue(true);
    mockApi.deleteCourseEnrollment.mockReturnValue(of({}));
    component.removeEnrollment('enr1');
    expect(mockApi.deleteCourseEnrollment).toHaveBeenCalledWith('enr1');
    expect(component.alertType()).toBe('success');

    // Confirmed & error
    mockApi.deleteCourseEnrollment.mockReturnValue(throwError(() => ({ error: { error: 'Rimozione fallita' } })));
    component.removeEnrollment('enr1');
    expect(component.enrollModalError()).toBe('Rimozione fallita');

    // Confirmed & fallback error message
    mockApi.deleteCourseEnrollment.mockReturnValue(throwError(() => ({})));
    component.removeEnrollment('enr1');
    expect(component.enrollModalError()).toBe("Errore durante la rimozione dell'iscrizione.");

    confirmSpy.mockRestore();
  });

  it('should test helper functions: countPaidInstallments, badges, and formatDate', () => {
    // countPaidInstallments
    expect(component.countPaidInstallments({ installments: [{ status: 'PAID' }, { status: 'PENDING' }] })).toBe(1);
    expect(component.countPaidInstallments({})).toBe(0);

    // getCardBadgeClass
    expect(component.getCardBadgeClass('VALIDA')).toContain('emerald');
    expect(component.getCardBadgeClass('IN_SCADENZA')).toContain('amber');
    expect(component.getCardBadgeClass('SCADUTA')).toContain('rose');
    expect(component.getCardBadgeClass(undefined)).toContain('slate');

    // getCardBadgeLabel
    expect(component.getCardBadgeLabel({ card_status: 'VALIDA' } as any)).toBe('Valida');
    expect(component.getCardBadgeLabel({ card_status: 'IN_SCADENZA', days_to_expiry: 15 } as any)).toBe('In scadenza (15 gg)');
    expect(component.getCardBadgeLabel({ card_status: 'IN_SCADENZA', days_to_expiry: null } as any)).toBe('In scadenza');
    expect(component.getCardBadgeLabel({ card_status: 'SCADUTA' } as any)).toBe('Scaduta');
    expect(component.getCardBadgeLabel({ card_status: undefined } as any)).toBe('Nessuna tessera');

    // formatDate
    expect(component.formatDate(null)).toBe('—');
    expect(component.formatDate('2026-11-21')).toBe('21/11/2026');
    expect(component.formatDate('invalid')).toBe('invalid');
  });
});
