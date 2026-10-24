import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ProjectReportData } from '../../core/models';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6 max-w-7xl mx-auto space-y-6">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-slate-800">Report Commesse & Rendicontazione Ore</h1>
          <p class="text-sm text-slate-500">Riepilogo generale ore assegnate, compensi e dettaglio per commessa e docente</p>
        </div>
        <button
          type="button"
          (click)="loadReport()"
          class="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-xl shadow-xs"
        >
          Aggiorna Dati
        </button>
      </div>

      @if (loading()) {
        <div class="p-12 text-center text-slate-400">Caricamento report commesse...</div>
      } @else if (!reportData()) {
        <div class="bg-white rounded-2xl p-12 text-center text-slate-400 border border-slate-200/80">
          Nessun dato disponibile per il report commesse.
        </div>
      } @else {
        <!-- Metriche Aggregate in Alto -->
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

        <!-- Dettaglio per Singola Commessa -->
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

              <!-- Docenti della commessa -->
              @if (proj.teachers.length === 0) {
                <div class="p-4 text-xs text-slate-400 italic">Nessun docente associato.</div>
              } @else {
                <div class="overflow-x-auto">
                  <table class="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr class="text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100">
                        <th class="py-2.5 px-4">Docente</th>
                        <th class="py-2.5 px-4">Email</th>
                        <th class="py-2.5 px-4 text-right">Tariffa Oraria</th>
                        <th class="py-2.5 px-4 text-right">Ore Previste</th>
                        <th class="py-2.5 px-4 text-right">Compenso Calcolato</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                      @for (t of proj.teachers; track t.user_id) {
                        <tr>
                          <td class="py-2.5 px-4 font-semibold text-slate-700">
                            {{ t.first_name }} {{ t.last_name }}
                          </td>
                          <td class="py-2.5 px-4 text-slate-500 font-mono">
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
  `
})
export class ReportsComponent implements OnInit {
  private apiService = inject(ApiService);
  authService = inject(AuthService);

  reportData = signal<ProjectReportData | null>(null);
  loading = signal(true);

  ngOnInit(): void {
    this.loadReport();
  }

  loadReport(): void {
    this.loading.set(true);
    this.apiService.getProjectsReport().subscribe({
      next: (data) => {
        this.reportData.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Errore nel caricamento report commesse:', err);
        this.loading.set(false);
      }
    });
  }
}
