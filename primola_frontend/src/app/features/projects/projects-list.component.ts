import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Project } from '../../core/models';

@Component({
  selector: 'app-projects-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-slate-800">Gestione Corsi & Attività</h1>
          <p class="text-sm text-slate-500">Corsi attivi, date di svolgimento, docenti assegnati e quote iscrizione</p>
        </div>
        @if (authService.canManageUsers()) {
          <a
            routerLink="/projects/new"
            class="inline-flex items-center justify-center px-4 py-2.5 bg-[#3857F1] hover:bg-blue-700 text-white font-medium rounded-xl shadow-sm shadow-blue-500/20 transition-all text-sm shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Nuovo Corso
          </a>
        }
      </div>

      <!-- Barra di Ricerca e Criteri Filtro (OR) -->
      <div class="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs space-y-3">
        <div class="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
          <div class="relative flex-1">
            <span class="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Cerca per corso, insegnante, data o descrizione..."
              [ngModel]="searchQuery()"
              (ngModelChange)="searchQuery.set($event)"
              class="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3857F1] focus:bg-white transition-all"
            />
            @if (searchQuery()) {
              <button
                type="button"
                (click)="searchQuery.set('')"
                class="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                title="Cancella ricerca"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            }
          </div>

          <div class="text-xs text-slate-500 flex items-center justify-between md:justify-end gap-2 shrink-0">
            <span>Corsi trovati: <strong class="text-slate-800">{{ filteredProjects().length }}</strong> su {{ projects().length }}</span>
          </div>
        </div>

        <!-- Selettori criteri di ricerca in OR -->
        <div class="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <span class="text-slate-400 font-medium">Filtra per (in OR):</span>

          <button
            type="button"
            (click)="toggleCriteria('course')"
            [class.bg-blue-100]="filterCourse()"
            [class.text-blue-700]="filterCourse()"
            [class.border-blue-200]="filterCourse()"
            [class.bg-slate-50]="!filterCourse()"
            [class.text-slate-400]="!filterCourse()"
            [class.border-slate-200]="!filterCourse()"
            class="px-2.5 py-1 rounded-lg border font-medium transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span class="w-1.5 h-1.5 rounded-full" [class.bg-blue-600]="filterCourse()" [class.bg-slate-300]="!filterCourse()"></span>
            Nome corso
          </button>

          <button
            type="button"
            (click)="toggleCriteria('teacher')"
            [class.bg-blue-100]="filterTeacher()"
            [class.text-blue-700]="filterTeacher()"
            [class.border-blue-200]="filterTeacher()"
            [class.bg-slate-50]="!filterTeacher()"
            [class.text-slate-400]="!filterTeacher()"
            [class.border-slate-200]="!filterTeacher()"
            class="px-2.5 py-1 rounded-lg border font-medium transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span class="w-1.5 h-1.5 rounded-full" [class.bg-blue-600]="filterTeacher()" [class.bg-slate-300]="!filterTeacher()"></span>
            Nome insegnante
          </button>

          <button
            type="button"
            (click)="toggleCriteria('date')"
            [class.bg-blue-100]="filterDate()"
            [class.text-blue-700]="filterDate()"
            [class.border-blue-200]="filterDate()"
            [class.bg-slate-50]="!filterDate()"
            [class.text-slate-400]="!filterDate()"
            [class.border-slate-200]="!filterDate()"
            class="px-2.5 py-1 rounded-lg border font-medium transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span class="w-1.5 h-1.5 rounded-full" [class.bg-blue-600]="filterDate()" [class.bg-slate-300]="!filterDate()"></span>
            Data
          </button>

          <button
            type="button"
            (click)="toggleCriteria('desc')"
            [class.bg-blue-100]="filterDesc()"
            [class.text-blue-700]="filterDesc()"
            [class.border-blue-200]="filterDesc()"
            [class.bg-slate-50]="!filterDesc()"
            [class.text-slate-400]="!filterDesc()"
            [class.border-slate-200]="!filterDesc()"
            class="px-2.5 py-1 rounded-lg border font-medium transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span class="w-1.5 h-1.5 rounded-full" [class.bg-blue-600]="filterDesc()" [class.bg-slate-300]="!filterDesc()"></span>
            Descrizione
          </button>
        </div>
      </div>

      <!-- Tabella Corsi -->
      @if (loading()) {
        <div class="bg-white rounded-2xl p-12 text-center text-slate-400 border border-slate-200/80 shadow-2xs">
          Caricamento corsi in corso...
        </div>
      } @else if (projects().length === 0) {
        <div class="bg-white rounded-2xl p-12 text-center text-slate-400 border border-slate-200/80 shadow-2xs">
          Nessun corso configurato. Clicca su "Nuovo Corso" per aggiungerne uno.
        </div>
      } @else if (filteredProjects().length === 0) {
        <div class="bg-white rounded-2xl p-12 text-center text-slate-400 border border-slate-200/80 shadow-2xs space-y-2">
          <p class="font-medium text-slate-600">Nessun corso o attività corrisponde ai criteri di ricerca impostati.</p>
          <button
            type="button"
            (click)="resetFilters()"
            class="text-xs text-[#3857F1] hover:underline cursor-pointer"
          >
            Azzera ricerca e filtri
          </button>
        </div>
      } @else {
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr class="bg-slate-50/80 text-slate-600 text-[11px] font-semibold uppercase tracking-wider border-b border-slate-200">
                  <th class="py-3.5 px-4 font-semibold">Corso / Attività</th>
                  <th class="py-3.5 px-4 font-semibold">Date Svolgimento</th>
                  <th class="py-3.5 px-4 font-semibold">Insegnanti</th>
                  <th class="py-3.5 px-4 font-semibold">Descrizione & Sede</th>
                  <th class="py-3.5 px-4 font-semibold">Quota / Iscritti</th>
                  @if (authService.canViewCompensation()) {
                    <th class="py-3.5 px-4 font-semibold">Ore / Costo</th>
                  }
                  <th class="py-3.5 px-4 text-right font-semibold">Azioni</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                @for (proj of filteredProjects(); track proj.id) {
                  <tr class="hover:bg-slate-50/70 transition-colors">
                    <!-- Corso / Titolo / Tipo -->
                    <td class="py-3.5 px-4 align-top">
                      <div class="flex items-center gap-1.5 mb-1">
                        <span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-purple-100 text-purple-700">
                          {{ proj.type || 'CORSO' }}
                        </span>
                      </div>
                      <a
                        [routerLink]="['/projects', proj.id]"
                        class="font-bold text-slate-800 hover:text-[#3857F1] text-sm block leading-snug hover:underline"
                      >
                        {{ proj.title }}
                      </a>
                    </td>

                    <!-- Date Svolgimento -->
                    <td class="py-3.5 px-4 align-top whitespace-nowrap">
                      @if (proj.start_date || proj.end_date) {
                        <div class="text-slate-700 font-medium">
                          <span>{{ proj.start_date || 'Inizio n.d.' }}</span>
                          <span class="text-slate-400 mx-1">&rarr;</span>
                          <span>{{ proj.end_date || 'Fine n.d.' }}</span>
                        </div>
                      } @else {
                        <span class="text-slate-400 italic">Date non specificate</span>
                      }
                    </td>

                    <!-- Insegnanti -->
                    <td class="py-3.5 px-4 align-top">
                      @if (proj.teachers && proj.teachers.length > 0) {
                        <div class="flex flex-wrap gap-1">
                          @for (t of proj.teachers; track t.user_id) {
                            <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 text-[#3857F1] border border-blue-100/80">
                              {{ t.first_name }} {{ t.last_name }}
                            </span>
                          }
                        </div>
                      } @else if (proj.teachers_count && proj.teachers_count > 0) {
                        <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 text-[#3857F1]">
                          {{ proj.teachers_count }} docenti assegnati
                        </span>
                      } @else {
                        <span class="text-slate-400 italic">Nessun docente</span>
                      }
                    </td>

                    <!-- Descrizione & Luogo -->
                    <td class="py-3.5 px-4 align-top max-w-xs">
                      @if (proj.location) {
                        <div class="flex items-center gap-1 text-[11px] text-slate-500 font-medium mb-1">
                          <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span class="truncate">{{ proj.location }}</span>
                        </div>
                      }
                      @if (proj.description) {
                        <p class="text-slate-600 line-clamp-2 text-xs" [title]="proj.description">
                          {{ proj.description }}
                        </p>
                      } @else {
                        <span class="text-slate-400 italic">Nessuna descrizione</span>
                      }
                    </td>

                    <!-- Quota & Iscritti -->
                    <td class="py-3.5 px-4 align-top whitespace-nowrap">
                      <div class="font-semibold text-slate-700">
                        € {{ (proj.enrollment_fee || 0) | number:'1.2-2' }}
                      </div>
                      <div class="text-[11px] text-slate-400">
                        Max: {{ proj.max_enrolled || 0 }} iscritti
                      </div>
                    </td>

                    <!-- Ore / Costo (Riservato) -->
                    @if (authService.canViewCompensation()) {
                      <td class="py-3.5 px-4 align-top whitespace-nowrap">
                        <div class="font-medium text-slate-700">
                          {{ proj.total_assigned_hours || 0 }} ore
                        </div>
                        <div class="text-[11px] font-semibold text-emerald-600">
                          € {{ (proj.total_cost || 0) | number:'1.2-2' }}
                        </div>
                      </td>
                    }

                    <!-- Azioni -->
                    <td class="py-3.5 px-4 align-top text-right whitespace-nowrap">
                      <div class="flex items-center justify-end gap-2">
                        <a
                          [routerLink]="['/projects', proj.id]"
                          class="px-2.5 py-1 text-xs font-semibold text-[#3857F1] bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                        >
                          Gestisci &rarr;
                        </a>
                        @if (authService.isAdmin()) {
                          <button
                            type="button"
                            (click)="deleteProject(proj)"
                            class="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                            title="Elimina corso"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        }
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </div>
  `
})
export class ProjectsListComponent implements OnInit {
  private apiService = inject(ApiService);
  authService = inject(AuthService);

  projects = signal<Project[]>([]);
  loading = signal(true);

  // Filtri di ricerca
  searchQuery = signal('');
  filterCourse = signal(true);
  filterTeacher = signal(true);
  filterDate = signal(true);
  filterDesc = signal(true);

  // Lista filtrata con logica OR
  filteredProjects = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const list = this.projects();

    if (!query) {
      return list;
    }

    const checkCourse = this.filterCourse();
    const checkTeacher = this.filterTeacher();
    const checkDate = this.filterDate();
    const checkDesc = this.filterDesc();

    // Se nessun criterio è selezionato, cerchiamo su tutti per default
    const matchAllCriteria = !checkCourse && !checkTeacher && !checkDate && !checkDesc;

    return list.filter(p => {
      // 1. Nome Corso (in OR)
      if (checkCourse || matchAllCriteria) {
        if (p.title && p.title.toLowerCase().includes(query)) {
          return true;
        }
      }

      // 2. Nome Insegnante (in OR)
      if (checkTeacher || matchAllCriteria) {
        if (p.teachers && p.teachers.length > 0) {
          const matchTeacher = p.teachers.some(t => {
            const fullName = `${t.first_name || ''} ${t.last_name || ''}`.toLowerCase();
            return fullName.includes(query);
          });
          if (matchTeacher) return true;
        }
      }

      // 3. Data (in OR)
      if (checkDate || matchAllCriteria) {
        const start = p.start_date ? p.start_date.toLowerCase() : '';
        const end = p.end_date ? p.end_date.toLowerCase() : '';
        if (start.includes(query) || end.includes(query)) {
          return true;
        }
      }

      // 4. Descrizione (in OR)
      if (checkDesc || matchAllCriteria) {
        if (p.description && p.description.toLowerCase().includes(query)) {
          return true;
        }
      }

      return false;
    });
  });

  ngOnInit(): void {
    this.loadProjects();
  }

  loadProjects(): void {
    this.loading.set(true);
    this.apiService.getProjects().subscribe({
      next: (data) => {
        this.projects.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Errore nel caricamento commesse:', err);
        this.loading.set(false);
      }
    });
  }

  toggleCriteria(type: 'course' | 'teacher' | 'date' | 'desc'): void {
    switch (type) {
      case 'course':
        this.filterCourse.update(v => !v);
        break;
      case 'teacher':
        this.filterTeacher.update(v => !v);
        break;
      case 'date':
        this.filterDate.update(v => !v);
        break;
      case 'desc':
        this.filterDesc.update(v => !v);
        break;
    }
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.filterCourse.set(true);
    this.filterTeacher.set(true);
    this.filterDate.set(true);
    this.filterDesc.set(true);
  }

  deleteProject(proj: Project): void {
    if (!confirm(`Sei sicuro di voler eliminare la commessa "${proj.title}"?`)) {
      return;
    }

    this.apiService.deleteProject(proj.id).subscribe({
      next: () => {
        this.projects.update(list => list.filter(p => p.id !== proj.id));
      },
      error: (err) => {
        alert(err?.error?.error || 'Errore durante l\'eliminazione della commessa.');
      }
    });
  }
}
