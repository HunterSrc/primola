import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ProjectReportData, OperationalMonthlyReport } from '../../core/models';
import { AppDatePipe } from '../../shared/pipes/app-date.pipe';

@Component({
  selector: 'app-course-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, AppDatePipe],
  template: `
    <div class="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">

      <!-- Header & Tab Navigation -->
      <div class="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center space-x-2">
            <h1 class="text-xl sm:text-2xl font-bold text-slate-800">Rendicontazione Corsi</h1>
            <span class="text-[10px] sm:text-xs bg-indigo-500/10 text-indigo-700 font-bold px-2.5 py-0.5 rounded-full border border-indigo-500/20">
              ADMIN & OFFICE
            </span>
          </div>
          <p class="text-xs sm:text-sm text-slate-500">Rendicontazione costi docenti per corsi terminati e riepilogo generale commesse</p>
        </div>

        <div class="flex items-center gap-1.5 sm:gap-2 bg-slate-100 p-1 sm:p-1.5 rounded-xl border border-slate-200 flex-wrap sm:flex-nowrap shrink-0 max-w-full">
          <button
            type="button"
            (click)="activeTab.set('MONTHLY')"
            [class.bg-white]="activeTab() === 'MONTHLY'"
            [class.shadow-sm]="activeTab() === 'MONTHLY'"
            [class.text-indigo-700]="activeTab() === 'MONTHLY'"
            [class.font-bold]="activeTab() === 'MONTHLY'"
            class="flex-1 sm:flex-initial px-3 sm:px-4 py-2 text-xs md:text-sm rounded-lg text-slate-600 transition-all cursor-pointer whitespace-nowrap text-center"
          >
            Corsi Terminati (Mese)
          </button>

          <button
            type="button"
            (click)="activeTab.set('PROJECTS')"
            [class.bg-white]="activeTab() === 'PROJECTS'"
            [class.shadow-sm]="activeTab() === 'PROJECTS'"
            [class.text-indigo-700]="activeTab() === 'PROJECTS'"
            [class.font-bold]="activeTab() === 'PROJECTS'"
            class="flex-1 sm:flex-initial px-3 sm:px-4 py-2 text-xs md:text-sm rounded-lg text-slate-600 transition-all cursor-pointer whitespace-nowrap text-center"
          >
            Riepilogo Generale Commesse
          </button>
        </div>
      </div>

      <!-- TAB 1: CORSI TERMINATI NEL MESE -->
      @if (activeTab() === 'MONTHLY') {
        <div class="space-y-6">
          <div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 class="text-sm sm:text-base font-bold text-slate-800">Seleziona Mese di Rendicontazione</h2>
              <p class="text-xs text-slate-500">Visualizza ore svolte e compensi docenti maturati per i corsi conclusi nel mese</p>
            </div>

            <div class="flex items-center space-x-2.5 w-full sm:w-auto">
              <select
                [(ngModel)]="selectedMonth"
                (ngModelChange)="loadMonthlyCourses()"
                class="flex-1 sm:flex-initial px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                @for (m of monthsList; track m.value) {
                  <option [value]="m.value">{{ m.name }}</option>
                }
              </select>

              <select
                [(ngModel)]="selectedYear"
                (ngModelChange)="loadMonthlyCourses()"
                class="flex-1 sm:flex-initial px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                @for (y of yearsList; track y) {
                  <option [value]="y">{{ y }}</option>
                }
              </select>

              <button
                type="button"
                (click)="loadMonthlyCourses()"
                class="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Aggiorna
              </button>
            </div>
          </div>

          @if (loadingMonthly()) {
            <div class="bg-white p-12 rounded-2xl text-center text-slate-400 border border-slate-200/80">
              Caricamento rendicontazione corsi mensile...
            </div>
          } @else if (operationalData(); as op) {
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs border-l-4 border-l-emerald-500">
                <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Costo Teacher Corsi Terminati</span>
                <p class="text-2xl sm:text-3xl font-extrabold text-emerald-600 mt-1">
                  € {{ op.finished_courses_teachers.summary.total_cost | number:'1.2-2' }}
                </p>
                <p class="text-[11px] text-slate-400 mt-0.5">
                  Compensi maturati nel mese selezionato
                </p>
              </div>

              <div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs border-l-4 border-l-purple-500">
                <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Corsi Conclusi nel Mese</span>
                <p class="text-2xl sm:text-3xl font-extrabold text-purple-700 mt-1">
                  {{ op.finished_courses_teachers.summary.total_courses }}
                </p>
                <p class="text-[11px] text-slate-400 mt-0.5">
                  Commesse/corsi terminati
                </p>
              </div>
            </div>

            <div class="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden p-4 sm:p-6 space-y-4">
              <div class="flex items-center justify-between border-b border-slate-100 pb-3">
                <div class="flex items-center space-x-2">
                  <span class="w-3 h-3 rounded-full bg-emerald-600"></span>
                  <h3 class="font-bold text-base sm:text-lg text-slate-800">
                    Costo per Teacher Corsi Terminati nel Mese
                  </h3>
                </div>
                <span class="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                  Totale Maturato: € {{ op.finished_courses_teachers.summary.total_cost | number:'1.2-2' }}
                </span>
              </div>

              @for (course of op.finished_courses_teachers.courses; track course.project_id) {
                <div class="border border-slate-200 rounded-xl overflow-hidden">
                  <div class="bg-slate-50/80 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200">
                    <div>
                      <div class="flex items-center space-x-2">
                        <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 uppercase">
                          {{ course.type || 'CORSO' }}
                        </span>
                        <h4 class="font-bold text-slate-800 text-sm">{{ course.title }}</h4>
                      </div>
                      <p class="text-xs text-slate-500 mt-0.5">
                        Concluso il: <span class="font-mono font-semibold text-slate-700">{{ course.end_date | appDate }}</span>
                        @if (course.location) {
                          • Sede: {{ course.location }}
                        }
                      </p>
                    </div>

                    <div class="text-right">
                      <span class="text-xs text-slate-400">Costo Totale Corso:</span>
                      <div class="text-base font-extrabold text-emerald-600">
                        € {{ course.total_cost | number:'1.2-2' }}
                      </div>
                    </div>
                  </div>

                  <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr class="bg-white text-slate-500 font-semibold uppercase text-[10px] border-b border-slate-100">
                          <th class="py-2.5 px-4">Docente</th>
                          <th class="py-2.5 px-4">Email</th>
                          <th class="py-2.5 px-4 text-center">Ore Assegnate</th>
                          <th class="py-2.5 px-4 text-center">Tariffa Oraria</th>
                          <th class="py-2.5 px-4 text-right">Compenso Maturato</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-slate-100">
                        @for (t of course.teachers; track t.user_id) {
                          <tr class="hover:bg-slate-50/50">
                            <td class="py-2.5 px-4 font-semibold text-slate-800">{{ t.teacher_name }}</td>
                            <td class="py-2.5 px-4 text-slate-500">{{ t.email || 'N/D' }}</td>
                            <td class="py-2.5 px-4 text-center font-bold text-slate-700">{{ t.assigned_hours }} h</td>
                            <td class="py-2.5 px-4 text-center text-slate-600">€ {{ t.hourly_rate | number:'1.2-2' }} /h</td>
                            <td class="py-2.5 px-4 text-right font-extrabold text-emerald-600">€ {{ t.total_cost | number:'1.2-2' }}</td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                </div>
              } @empty {
                <div class="p-8 text-center text-slate-400 text-xs sm:text-sm bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                  Nessun corso o commessa giunta al termine nel mese selezionato.
                </div>
              }
            </div>
          }
        </div>
      }

      <!-- TAB 2: RIEPILOGO GENERALE COMMESSE -->
      @if (activeTab() === 'PROJECTS') {
        <div class="space-y-6">
          <div class="flex justify-end">
            <button
              type="button"
              (click)="loadProjectsReport()"
              class="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-xl shadow-xs cursor-pointer"
            >
              Aggiorna Dati Commesse
            </button>
          </div>

          @if (loadingProjects()) {
            <div class="p-12 text-center text-slate-400">Caricamento report commesse...</div>
          } @else if (!reportData()) {
            <div class="bg-white rounded-2xl p-12 text-center text-slate-400 border border-slate-200/80">
              Nessun dato disponibile per il report commesse.
            </div>
          } @else {
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
                <div class="p-3 bg-blue-50 text-[#3857F1] rounded-xl">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div>
                  <span class="block text-xs font-semibold text-slate-400 uppercase">Commesse Totali</span>
                  <span class="text-2xl font-bold text-slate-800">{{ reportData()?.summary?.total_projects }}</span>
                </div>
              </div>

              <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
                <div class="p-3 bg-teal-50 text-teal-600 rounded-xl">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <span class="block text-xs font-semibold text-slate-400 uppercase">Monte Ore Complessivo</span>
                  <span class="text-2xl font-bold text-slate-800">{{ reportData()?.summary?.total_hours }} h</span>
                </div>
              </div>

              <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
                <div class="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <span class="block text-xs font-semibold text-slate-400 uppercase">Budget Compensi Totale</span>
                  <span class="text-2xl font-bold text-emerald-600">€ {{ reportData()?.summary?.total_cost | number:'1.2-2' }}</span>
                </div>
              </div>
            </div>

            <div class="space-y-4">
              @for (proj of reportData()?.projects; track proj.id) {
                <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                  <div class="bg-slate-50/70 p-4 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 class="font-bold text-slate-800 text-base">{{ proj.title }}</h3>
                      @if (proj.location) {
                        <p class="text-xs text-slate-500">{{ proj.location }}</p>
                      }
                    </div>
                    <div class="flex items-center gap-4 text-xs">
                      <span class="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 font-semibold">
                        Ore: {{ proj.total_hours }} h
                      </span>
                      <span class="px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 font-bold">
                        Costo: € {{ proj.total_cost | number:'1.2-2' }}
                      </span>
                    </div>
                  </div>

                  @if (proj.teachers.length === 0) {
                    <div class="p-4 text-xs text-slate-400 italic">Nessun docente associato.</div>
                  } @else {
                    <div class="overflow-x-auto">
                      <table class="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr class="bg-white text-slate-400 uppercase tracking-wider border-b border-slate-100">
                            <th class="py-2.5 px-4 font-semibold">Insegnante</th>
                            <th class="py-2.5 px-4 font-semibold">Email</th>
                            <th class="py-2.5 px-4 font-semibold text-right">Tariffa Oraria</th>
                            <th class="py-2.5 px-4 font-semibold text-right">Ore Previste</th>
                            <th class="py-2.5 px-4 font-semibold text-right">Compenso</th>
                          </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                          @for (t of proj.teachers; track t.user_id) {
                            <tr class="hover:bg-slate-50/50">
                              <td class="py-2.5 px-4 font-medium text-slate-700">
                                {{ t.first_name }} {{ t.last_name }}
                              </td>
                              <td class="py-2.5 px-4 text-slate-400">
                                {{ t.email }}
                              </td>
                              <td class="py-2.5 px-4 text-right font-mono">
                                € {{ t.hourly_rate | number:'1.2-2' }}
                              </td>
                              <td class="py-2.5 px-4 text-right font-mono">
                                {{ t.assigned_hours }} h
                              </td>
                              <td class="py-2.5 px-4 text-right font-mono font-semibold text-emerald-600">
                                € {{ t.total_cost | number:'1.2-2' }}
                              </td>
                            </tr>
                          }
                        </tbody>
                      </table>
                    </div>
                  }
                </div>
              }
            </div>
          }
        </div>
      }

    </div>
  `
})
export class CourseReportsComponent implements OnInit {
  private apiService = inject(ApiService);

  activeTab = signal<'MONTHLY' | 'PROJECTS'>('MONTHLY');

  selectedMonth = new Date().getMonth() + 1;
  selectedYear = new Date().getFullYear();

  monthsList = [
    { value: 1, name: 'Gennaio' }, { value: 2, name: 'Febbraio' }, { value: 3, name: 'Marzo' },
    { value: 4, name: 'Aprile' }, { value: 5, name: 'Maggio' }, { value: 6, name: 'Giugno' },
    { value: 7, name: 'Luglio' }, { value: 8, name: 'Agosto' }, { value: 9, name: 'Settembre' },
    { value: 10, name: 'Ottobre' }, { value: 11, name: 'Novembre' }, { value: 12, name: 'Dicembre' }
  ];
  yearsList = [2024, 2025, 2026, 2027, 2028];

  operationalData = signal<OperationalMonthlyReport | null>(null);
  loadingMonthly = signal(false);

  reportData = signal<ProjectReportData | null>(null);
  loadingProjects = signal(false);

  ngOnInit(): void {
    this.loadMonthlyCourses();
    this.loadProjectsReport();
  }

  loadMonthlyCourses(): void {
    this.loadingMonthly.set(true);
    this.apiService.getOperationalMonthlyReport(Number(this.selectedYear), Number(this.selectedMonth)).subscribe({
      next: (data) => {
        this.operationalData.set(data);
        this.loadingMonthly.set(false);
      },
      error: (err) => {
        console.error('Errore caricamento rendicontazione corsi:', err);
        this.loadingMonthly.set(false);
      }
    });
  }

  loadProjectsReport(): void {
    this.loadingProjects.set(true);
    this.apiService.getProjectsReport().subscribe({
      next: (data) => {
        this.reportData.set(data);
        this.loadingProjects.set(false);
      },
      error: (err) => {
        console.error('Errore caricamento report commesse:', err);
        this.loadingProjects.set(false);
      }
    });
  }
}
