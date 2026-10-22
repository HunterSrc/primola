import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AnagraficaComponent } from './anagrafica.component';
import { ApiService } from '../../core/services/api.service';
import { FormBuilder } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { Student } from '../../core/models';

describe('AnagraficaComponent', () => {
  let component: AnagraficaComponent;
  let mockApi: any;
  let mockRouter: any;

  const mockStudents: Student[] = [
    { id: 1, first_name: 'Leonardo', last_name: 'Bianchi', school: 'Scuola Rodari' },
    { id: 2, first_name: 'Sofia', last_name: 'Rossi', school: 'IC Manzoni' }
  ];

  beforeEach(() => {
    mockApi = {
      getStudents: vi.fn().mockReturnValue(of(mockStudents)),
      createStudent: vi.fn().mockReturnValue(of({ id: 99, first_name: 'Nuovo', last_name: 'Studente' }))
    };

    mockRouter = {
      navigate: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        AnagraficaComponent,
        FormBuilder,
        { provide: ApiService, useValue: mockApi },
        { provide: Router, useValue: mockRouter }
      ]
    });

    component = TestBed.inject(AnagraficaComponent);
  });

  it('should initialize with default values and load students', () => {
    component.ngOnInit();
    expect(component.students().length).toBe(2);
    expect(component.tutors.length).toBe(1);
    expect(component.activeTab()).toBe('NEW');
  });

  it('should manage tutors FormArray: add and remove', () => {
    component.ngOnInit();
    expect(component.tutors.length).toBe(1);

    component.addTutor(false);
    expect(component.tutors.length).toBe(2);

    component.removeTutor(1);
    expect(component.tutors.length).toBe(1);
  });

  it('should filter students by search query across first_name, last_name, and school', () => {
    component.students.set(mockStudents);

    component.searchQuery = '';
    expect(component.filteredStudents().length).toBe(2);

    component.searchQuery = 'leo';
    expect(component.filteredStudents().length).toBe(1);
    expect(component.filteredStudents()[0].first_name).toBe('Leonardo');

    component.searchQuery = 'rossi';
    expect(component.filteredStudents().length).toBe(1);
    expect(component.filteredStudents()[0].first_name).toBe('Sofia');

    component.searchQuery = 'manzoni';
    expect(component.filteredStudents().length).toBe(1);

    component.searchQuery = 'nonexistent';
    expect(component.filteredStudents().length).toBe(0);
  });

  it('should submit form when valid and reset form with success feedback', () => {
    component.ngOnInit();
    component.studentForm.patchValue({
      first_name: 'Nuovo',
      last_name: 'Studente',
      school: 'Scuola Test'
    });

    component.tutors.at(0).patchValue({
      first_name: 'Marco',
      last_name: 'Padre',
      phone: '+39 333',
      relationship: 'Padre',
      is_main: true
    });

    expect(component.studentForm.valid).toBe(true);

    component.onSubmit();
    expect(mockApi.createStudent).toHaveBeenCalled();
    expect(component.isSubmitting()).toBe(false);
    expect(component.successMessage()).toContain('Nuovo Studente');
    expect(component.tutors.length).toBe(1);
  });

  it('should not submit if form is invalid', () => {
    component.ngOnInit();
    component.studentForm.patchValue({
      first_name: '', // Invalid required
      last_name: ''
    });

    component.onSubmit();
    expect(mockApi.createStudent).not.toHaveBeenCalled();
  });

  it('should handle submit error gracefully', () => {
    component.ngOnInit();
    component.studentForm.patchValue({
      first_name: 'Nuovo',
      last_name: 'Studente'
    });
    component.tutors.at(0).patchValue({
      first_name: 'T',
      last_name: 'T',
      phone: '123'
    });

    mockApi.createStudent.mockReturnValue(throwError(() => new Error('Creation failed')));
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    component.onSubmit();
    expect(component.isSubmitting()).toBe(false);
    expect(alertSpy).toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('should navigate to student edit page on editStudent', () => {
    component.editStudent('123');
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/anagrafica', '123', 'edit']);
  });
});
