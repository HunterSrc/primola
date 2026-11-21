import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { OperationalMonthlyReport } from '../../core/models';
import { AppDatePipe } from '../../shared/pipes/app-date.pipe';

@Component({
  selector: 'app-afterschool-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, AppDatePipe],
  template: `
    <div class="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">

      <!-- Header -->
      <div class="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center space-x-2">
            <h1 class="text-xl sm:text-2xl font-bold text-slate-800">Rendicontazione Doposcuola</h1>
            <span class="text-[10px] sm:text-xs bg-indigo-500/10 text-indigo-700 font-bold px-2.5 py-0.5 rounded-full border border-indigo-500/20">
              ADMIN & OFFICE
            </span>
          </div>
          <p class="text-xs sm:text-sm text-slate-500">Rendicontazione mensile ore e compensi insegnanti e turni del doposcuola</p>
        </div>
      </div>

      <!-- Barra Mese e Anno -->
      <div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 class="text-sm sm:text-base font-bold text-slate-800">Seleziona Mese di Rendicontazione</h2>
          <p class="text-xs text-slate-500">Visualizza ore svolte e compensi docenti maturati per i turni doposcuola</p>
        </div>

        <div class="flex items-center space-x-2.5 w-full sm:w-auto">
          <select
            [(ngModel)]="selectedMonth"
            (ngModelChange)="loadReport()"
            class="flex-1 sm:flex-initial px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            @for (m of monthsList; track m.value) {
              <option [value]="m.value">{{ m.name }}</option>
            }
          </select>

          <select
            [(ngModel)]="selectedYear"
            (ngModelChange)="loadReport()"
            class="flex-1 sm:flex-initial px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            @for (y of yearsList; track y) {
              <option [value]="y">{{ y }}</option>
            }
          </select>

          <button
            type="button"
            (click)="loadReport()"
            class="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Aggiorna
          </button>
        </div>
      </div>

      @if (loading()) {
        <div class="bg-white p-12 rounded-2xl text-center text-slate-400 border border-slate-200/80">
          Caricamento rendicontazione doposcuola...
        </div>
      } @else if (operationalData(); as op) {

        <!-- KPI Cards Doposcuola -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs border-l-4 border-l-indigo-500">
            <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Costo Teacher Doposcuola</span>
            <p class="text-2xl sm:text-3xl font-extrabold text-indigo-700 mt-1">
              € {{ op.afterschool_teachers.summary.total_cost | number:'1.2-2' }}
            </p>
            <p class="text-[11px] text-slate-400 mt-0.5">
              Compensi totali maturati nel mese
            </p>
          </div>

          <div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs border-l-4 border-l-blue-500">
            <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Ore Totali Turni</span>
            <p class="text-2xl sm:text-3xl font-extrabold text-blue-700 mt-1">
              {{ op.afterschool_teachers.summary.total_hours }} h
            </p>
            <p class="text-[11px] text-slate-400 mt-0.5">
              Ore svolte nei turni doposcuola
            </p>
          </div>

          <div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs border-l-4 border-l-slate-700">
            <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Docenti Attivi</span>
            <p class="text-2xl sm:text-3xl font-extrabold text-slate-800 mt-1">
              {{ op.afterschool_teachers.summary.total_teachers }}
            </p>
            <p class="text-[11px] text-slate-400 mt-0.5">
              Insegnanti con turni nel mese
            </p>
          </div>
        </div>

        <!-- TABELLA COSTO PER TEACHER DOPOSCUOLA -->
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden p-4 sm:p-6 space-y-4">
          <div class="flex items-center justify-between border-b border-slate-100 pb-3">
            <div class="flex items-center space-x-2">
              <span class="w-3 h-3 rounded-full bg-indigo-600"></span>
              <h3 class="font-bold text-base sm:text-lg text-slate-800">
                Costo per Teacher Doposcuola - Mese Selezionato
              </h3>
            </div>
            <span class="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
              Totale: € {{ op.afterschool_teachers.summary.total_cost | number:'1.2-2' }}
            </span>
          </div>

          <div class="overflow-x-auto border border-slate-200 rounded-xl">
            <table class="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr class="bg-slate-50 text-slate-600 font-semibold uppercase text-[11px] border-b border-slate-200">
                  <th class="py-3 px-4">Docente</th>
                  <th class="py-3 px-4">Contatti</th>
                  <th class="py-3 px-4 text-center">Turni nel Mese</th>
                  <th class="py-3 px-4 text-center">Ore Totali</th>
                  <th class="py-3 px-4 text-center">Tariffa Oraria</th>
                  <th class="py-3 px-4 text-right">Compenso Dovuto</th>
                  <th class="py-3 px-4 text-center">Dettaglio</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                @for (t of op.afterschool_teachers.teachers; track t.user_id) {
                  <tr class="hover:bg-slate-50/60 transition-colors">
                    <td class="py-3 px-4 font-bold text-slate-800">{{ t.teacher_name }}</td>
                    <td class="py-3 px-4 text-xs text-slate-500">
                      <div>{{ t.email || 'N/D' }}</div>
                      <div class="text-slate-400 font-mono">{{ t.phone || '' }}</div>
                    </td>
                    <td class="py-3 px-4 text-center text-slate-700 font-semibold">{{ t.shifts_count }}</td>
                    <td class="py-3 px-4 text-center text-indigo-700 font-bold">{{ t.total_hours }} h</td>
                    <td class="py-3 px-4 text-center text-slate-600">€ {{ t.hourly_rate | number:'1.2-2' }} /h</td>
                    <td class="py-3 px-4 text-right font-extrabold text-emerald-600">€ {{ t.total_cost | number:'1.2-2' }}</td>
                    <td class="py-3 px-4 text-center">
                      <button
                        type="button"
                        (click)="toggleTeacherShifts(t.user_id)"
                        class="px-2.5 py-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold underline cursor-pointer"
                      >
                        {{ isShiftsExpanded(t.user_id) ? 'Nascondi' : 'Vedi turni (' + t.shifts.length + ')' }}
                      </button>
                    </td>
                  </tr>

                  @if (isShiftsExpanded(t.user_id)) {
                    <tr class="bg-indigo-50/40">
                      <td colspan="7" class="p-3">
                        <div class="bg-white rounded-xl p-3 border border-indigo-100 space-y-2">
                          <h5 class="font-bold text-xs text-slate-700">Dettaglio Turni Calendario - {{ t.teacher_name }}</h5>
                          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                            @for (s of t.shifts; track s.id) {
                              <div class="p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs flex justify-between items-center">
                                <div>
                                  <span class="font-bold font-mono text-slate-800">{{ s.shift_date | appDate }}</span>
                                  <span class="text-slate-500 block text-[11px]">{{ s.start_time }} - {{ s.end_time }}</span>
                                </div>
                                <div class="text-right">
                                  <span class="font-bold text-indigo-700">{{ s.hours }} h</span>
                                  <span class="text-slate-400 block text-[11px]">€ {{ s.cost | number:'1.2-2' }}</span>
                                </div>
                              </div>
                            }
                          </div>
                        </div>
                      </td>
                    </tr>
                  }
                } @empty {
                  <tr>
                    <td colspan="7" class="py-8 text-center text-slate-400">Nessun turno docente doposcuola nel mese selezionato.</td>
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
export class AfterschoolReportsComponent implements OnInit {
  private apiService = inject(ApiService);

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
  loading = signal(false);
  expandedTeachers = signal<Record<string, boolean>>({});

  ngOnInit(): void {
    this.loadReport();
  }

  loadReport(): void {
    this.loading.set(true);
    this.apiService.getOperationalMonthlyReport(Number(this.selectedYear), Number(this.selectedMonth)).subscribe({
      next: (data) => {
        this.operationalData.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Errore caricamento rendicontazione doposcuola:', err);
        this.loading.set(false);
      }
    });
  }

  toggleTeacherShifts(userId: string): void {
    const current = { ...this.expandedTeachers() };
    current[userId] = !current[userId];
    this.expandedTeachers.set(current);
  }

  isShiftsExpanded(userId: string): boolean {
    return !!this.expandedTeachers()[userId];
  }
}
