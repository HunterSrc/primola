import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ProjectsListComponent } from './projects-list.component';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Project } from '../../core/models/project.model';

describe('ProjectsListComponent', () => {
  let component: ProjectsListComponent;
  let mockApiService: any;
  let mockAuthService: any;

  const sampleProjects: Project[] = [
    {
      id: 'p1',
      title: 'Corso Pittura',
      start_date: '2026-10-01',
      end_date: '2026-12-20',
      description: 'Laboratorio artistico',
      teachers: [{ user_id: 'u1', first_name: 'Elena', last_name: 'Riva' }]
    } as Project,
    {
      id: 'p2',
      title: 'Teatro Ragazzi',
      start_date: '2026-11-01',
      end_date: '2027-02-01',
      description: 'Recitazione base',
      teachers: []
    } as Project
  ];

  beforeEach(() => {
    mockApiService = {
      getProjects: vi.fn().mockReturnValue(of(sampleProjects)),
      deleteProject: vi.fn()
    };

    mockAuthService = {
      isAdmin: vi.fn().mockReturnValue(true),
      isOffice: vi.fn().mockReturnValue(false)
    };

    TestBed.configureTestingModule({
      providers: [
        ProjectsListComponent,
        { provide: ApiService, useValue: mockApiService },
        { provide: AuthService, useValue: mockAuthService }
      ]
    });

    component = TestBed.inject(ProjectsListComponent);
  });

  it('should load projects on init', () => {
    component.ngOnInit();
    expect(component.projects()).toHaveLength(2);
    expect(component.loading()).toBe(false);
  });

  it('should handle error when loading projects', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockApiService.getProjects.mockReturnValue(throwError(() => new Error('fail')));

    component.loadProjects();
    expect(component.loading()).toBe(false);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should filter projects by course, teacher, date, description, and fallback when all criteria off', () => {
    component.projects.set(sampleProjects);

    expect(component.filteredProjects()).toHaveLength(2);

    component.searchQuery.set('pittura');
    expect(component.filteredProjects().map(p => p.id)).toEqual(['p1']);

    component.searchQuery.set('elena riva');
    expect(component.filteredProjects().map(p => p.id)).toEqual(['p1']);

    component.searchQuery.set('2027-02');
    expect(component.filteredProjects().map(p => p.id)).toEqual(['p2']);

    component.searchQuery.set('recitazione');
    expect(component.filteredProjects().map(p => p.id)).toEqual(['p2']);

    // Turn off all criteria -> matchAllCriteria fallback
    component.toggleCriteria('course');
    component.toggleCriteria('teacher');
    component.toggleCriteria('date');
    component.toggleCriteria('desc');
    component.searchQuery.set('artistico');
    expect(component.filteredProjects().map(p => p.id)).toEqual(['p1']);

    component.resetFilters();
    expect(component.searchQuery()).toBe('');
    expect(component.filterCourse()).toBe(true);
  });

  it('should delete project when confirmed and handle errors', () => {
    component.projects.set(sampleProjects);
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    component.deleteProject(sampleProjects[0]);
    expect(mockApiService.deleteProject).not.toHaveBeenCalled();

    confirmSpy.mockReturnValue(true);
    mockApiService.deleteProject.mockReturnValue(of({}));
    component.deleteProject(sampleProjects[0]);
    expect(component.projects().map(p => p.id)).toEqual(['p2']);

    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    mockApiService.deleteProject.mockReturnValue(throwError(() => ({})));
    component.deleteProject(sampleProjects[1]);
    expect(alertSpy).toHaveBeenCalledWith("Errore durante l'eliminazione della commessa.");

    confirmSpy.mockRestore();
    alertSpy.mockRestore();
  });
});
