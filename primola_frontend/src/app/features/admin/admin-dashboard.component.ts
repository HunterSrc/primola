import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { FinancialMonthlyReport } from '../../core/models';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="p-3 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-4 sm:space-y-6 pb-6 md:pb-0">

      <!-- Titolo -->
      <div class="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center space-x-2">
            <h1 class="text-xl sm:text-2xl font-bold text-slate-800">Pannello Admin & Statistiche</h1>
            <span class="text-[10px] sm:text-xs bg-amber-500/10 text-amber-600 font-bold px-2 py-0.5 rounded-full border border-amber-500/20">ADMIN</span>
          </div>
          <p class="text-xs sm:text-sm text-slate-500">Bilancio entrate/uscite, rendicontazione doposcuola, mensa e docenti</p>
        </div>
      </div>

      <!-- BILANCIO & STATISTICHE FINANZIARIE (SOLO ADMIN) -->
        <div class="space-y-4 sm:space-y-6">

          <!-- Barra Filtri Mese & Tariffe -->
          <div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div class="flex items-center space-x-2">
                <span class="w-3 h-3 rounded-full bg-emerald-600"></span>
                <h2 class="text-sm sm:text-base font-bold text-slate-800">Bilancio Economico Mensile</h2>
              </div>
              <p class="text-xs text-slate-500">Confronto entrate/uscite previste ed effettive per Doposcuola, Mensa e Corsi</p>
            </div>

            <div class="flex flex-wrap items-center gap-2.5">
              <select
                [(ngModel)]="financialMonth"
                (ngModelChange)="loadFinancialReport()"
                class="px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                @for (m of monthsList; track m.value) {
                  <option [value]="m.value">{{ m.name }}</option>
                }
              </select>

              <select
                [(ngModel)]="financialYear"
                (ngModelChange)="loadFinancialReport()"
                class="px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                @for (y of yearsList; track y) {
                  <option [value]="y">{{ y }}</option>
                }
              </select>

              <a
                routerLink="/admin/afterschool-packages"
                class="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-semibold rounded-xl transition-colors flex items-center space-x-1.5"
              >
                <span>⚙️ Tariffe</span>
              </a>
            </div>
          </div>

          @if (loadingFinancial()) {
            <div class="bg-white p-12 rounded-2xl text-center text-slate-400 border border-slate-200/80">
              Calcolo bilancio economico in corso...
            </div>
          } @else if (financialReport(); as fin) {
            <!-- KPI Riassuntivi Generali -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
                <span class="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider block">Entrate Totali</span>
                <p class="text-xl sm:text-3xl font-extrabold text-emerald-600 mt-1">
                  € {{ fin.summary.total_actual_revenues | number:'1.2-2' }}
                </p>
                <p class="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">
                  Maturate / Previste: € {{ fin.summary.total_expected_revenues | number:'1.2-2' }}
                </p>
                @if ((fin.summary.total_pending_revenues ?? fin.doposcuola.revenues.pending ?? 0) > 0) {
                  <p class="text-[10px] sm:text-[11px] text-amber-600 font-semibold mt-0.5">
                    Da Incassare: € {{ (fin.summary.total_pending_revenues ?? fin.doposcuola.revenues.pending ?? 0) | number:'1.2-2' }}
                  </p>
                }
              </div>

              <div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
                <span class="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider block">Uscite Totali</span>
                <p class="text-xl sm:text-3xl font-extrabold text-rose-600 mt-1">
                  € {{ fin.summary.total_actual_expenses | number:'1.2-2' }}
                </p>
                <p class="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">
                  Previste: € {{ fin.summary.total_expected_expenses | number:'1.2-2' }}
                </p>
              </div>

              <div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
                <span class="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider block">Margine Netto</span>
                <p class="text-xl sm:text-3xl font-extrabold mt-1" [class.text-emerald-700]="fin.summary.total_actual_margin >= 0" [class.text-rose-700]="fin.summary.total_actual_margin < 0">
                  € {{ fin.summary.total_actual_margin | number:'1.2-2' }}
                </p>
                <p class="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">
                  Previsto: € {{ fin.summary.total_expected_margin | number:'1.2-2' }}
                </p>
              </div>

              <div class="bg-gradient-to-r from-amber-500 to-orange-500 p-4 sm:p-5 rounded-2xl text-white shadow-md shadow-orange-500/15">
                <span class="text-[10px] sm:text-xs font-semibold text-amber-100 uppercase tracking-wider block">Pasti Totali Emessi</span>
                <p class="text-xl sm:text-3xl font-extrabold mt-1">
                  {{ fin.summary.total_meals_issued }} pasti
                </p>
                <p class="text-[10px] sm:text-[11px] text-amber-100 mt-0.5">
                  Spese mensa caricate: € {{ fin.doposcuola.expenses.actual_catering_cost | number:'1.2-2' }}
                </p>
              </div>
            </div>

            <!-- SEZIONE BILANCIO DOPOSCUOLA -->
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden p-4 sm:p-6 space-y-4">
              <div class="flex items-center justify-between border-b border-slate-100 pb-3">
                <div class="flex items-center space-x-2">
                  <span class="w-3 h-3 rounded-full bg-indigo-600"></span>
                  <h3 class="font-bold text-base sm:text-lg text-slate-800">Doposcuola & Mensa</h3>
                </div>
                <span class="text-xs bg-indigo-50 text-indigo-700 font-bold px-2.5 py-1 rounded-full border border-indigo-100">
                  Tariffa Una Tantum: € {{ (fin.rates.one_off_fee ?? fin.rates.doposcuola_daily_fee ?? 0) | number:'1.2-2' }} • Pasto: € {{ fin.rates.meal_fee_student | number:'1.2-2' }}
                </span>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div class="bg-slate-50/80 p-4 rounded-xl border border-slate-200">
                  <span class="text-xs font-semibold text-slate-500 uppercase block">Entrate Doposcuola</span>
                  <p class="text-xl font-bold text-emerald-600 mt-1">
                    € {{ fin.doposcuola.revenues.actual | number:'1.2-2' }}
                    <span class="text-[11px] font-semibold text-emerald-700 ml-1">Incassato</span>
                  </p>
                  <div class="mt-1 space-y-0.5 text-xs">
                    <p class="text-slate-500">
                      Maturato / Previsto: <span class="font-semibold text-slate-700">€ {{ fin.doposcuola.revenues.expected | number:'1.2-2' }}</span>
                    </p>
                    <p class="text-amber-700 font-semibold">
                      Da Incassare: € {{ (fin.doposcuola.revenues.pending ?? 0) | number:'1.2-2' }}
                    </p>
                  </div>
                  <div class="mt-2 text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                    {{ fin.doposcuola.revenues.actual_days }} presenze • {{ fin.doposcuola.revenues.actual_meals }} pasti erogati
                  </div>
                </div>

                <div class="bg-slate-50/80 p-4 rounded-xl border border-slate-200">
                  <span class="text-xs font-semibold text-slate-500 uppercase block">Uscite Doposcuola</span>
                  <p class="text-xl font-bold text-rose-600 mt-1">
                    € {{ fin.doposcuola.expenses.actual | number:'1.2-2' }}
                  </p>
                  <p class="text-xs text-slate-400 mt-0.5">
                    Previste: € {{ fin.doposcuola.expenses.expected | number:'1.2-2' }}
                  </p>
                  <div class="mt-2 text-[11px] text-slate-500 pt-1 border-t border-slate-200/60 space-y-0.5">
                    <div>Docenti: <span class="font-semibold text-slate-700">€ {{ fin.doposcuola.expenses.actual_teacher_cost | number:'1.2-2' }}</span></div>
                    <div>Note Spese Mensa: <span class="font-semibold text-amber-700">€ {{ fin.doposcuola.expenses.actual_catering_cost | number:'1.2-2' }}</span></div>
                    <div>Note Spese Altro: <span class="font-semibold text-purple-700">€ {{ (fin.doposcuola.expenses.actual_other_expenses ?? 0) | number:'1.2-2' }}</span></div>
                  </div>
                </div>

                <div class="bg-slate-50/80 p-4 rounded-xl border border-slate-200">
                  <span class="text-xs font-semibold text-slate-500 uppercase block">Margine Doposcuola</span>
                  <p class="text-xl font-bold mt-1" [class.text-emerald-700]="fin.doposcuola.margin.actual >= 0" [class.text-rose-700]="fin.doposcuola.margin.actual < 0">
                    € {{ fin.doposcuola.margin.actual | number:'1.2-2' }}
                  </p>
                  <p class="text-xs text-slate-400 mt-0.5">
                    Margine previsto: € {{ fin.doposcuola.margin.expected | number:'1.2-2' }}
                  </p>
                  <div class="mt-2 text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                    Pasti emessi: <span class="font-bold text-amber-700">{{ fin.doposcuola.total_meals }}</span>
                  </div>
                </div>
              </div>

              <!-- Dettaglio Uscite Docenti Doposcuola -->
              <div class="pt-2">
                <h4 class="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Uscite Verso Teacher - Doposcuola</h4>
                <div class="overflow-x-auto border border-slate-200 rounded-xl">
                  <table class="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr class="bg-slate-50 text-slate-600 font-semibold uppercase border-b border-slate-200">
                        <th class="py-2.5 px-4">Docente</th>
                        <th class="py-2.5 px-4 text-center">Turni Svolti</th>
                        <th class="py-2.5 px-4 text-center">Ore Lavorate</th>
                        <th class="py-2.5 px-4 text-center">Tariffa Oraria</th>
                        <th class="py-2.5 px-4 text-right">Compenso Totale</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                      @for (t of fin.doposcuola.teachers; track t.user_id) {
                        <tr class="hover:bg-slate-50/60">
                          <td class="py-2.5 px-4 font-semibold text-slate-800">{{ t.name }}</td>
                          <td class="py-2.5 px-4 text-center text-slate-600">{{ t.shifts_count }}</td>
                          <td class="py-2.5 px-4 text-center font-medium text-slate-700">{{ t.total_hours }} h</td>
                          <td class="py-2.5 px-4 text-center text-slate-500">€ {{ t.hourly_rate | number:'1.2-2' }} /h</td>
                          <td class="py-2.5 px-4 text-right font-bold text-rose-600">€ {{ t.total_cost | number:'1.2-2' }}</td>
                        </tr>
                      } @empty {
                        <tr>
                          <td colspan="5" class="py-6 text-center text-slate-400">Nessun turno docente doposcuola registrato in questo mese.</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <!-- SEZIONE BILANCIO CORSI -->
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden p-4 sm:p-6 space-y-4">
              <div class="flex items-center justify-between border-b border-slate-100 pb-3">
                <div class="flex items-center space-x-2">
                  <span class="w-3 h-3 rounded-full bg-purple-600"></span>
                  <h3 class="font-bold text-base sm:text-lg text-slate-800">Corsi & Laboratori</h3>
                </div>
                <span class="text-xs bg-purple-50 text-purple-700 font-bold px-2.5 py-1 rounded-full border border-purple-100">
                  Commesse e Attività Speciali
                </span>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div class="bg-slate-50/80 p-4 rounded-xl border border-slate-200">
                  <span class="text-xs font-semibold text-slate-500 uppercase block">Entrate Corsi</span>
                  <p class="text-xl font-bold text-emerald-600 mt-1">
                    € {{ fin.courses.revenues.actual | number:'1.2-2' }}
                  </p>
                  <p class="text-xs text-slate-400 mt-0.5">
                    Previste (a capienza max): € {{ fin.courses.revenues.expected | number:'1.2-2' }}
                  </p>
                </div>

                <div class="bg-slate-50/80 p-4 rounded-xl border border-slate-200">
                  <span class="text-xs font-semibold text-slate-500 uppercase block">Uscite Corsi (Docenti)</span>
                  <p class="text-xl font-bold text-rose-600 mt-1">
                    € {{ fin.courses.expenses.actual | number:'1.2-2' }}
                  </p>
                  <p class="text-xs text-slate-400 mt-0.5">
                    Budget preventivato corsi attivi: € {{ fin.courses.expenses.expected | number:'1.2-2' }}
                  </p>
                </div>

                <div class="bg-slate-50/80 p-4 rounded-xl border border-slate-200">
                  <span class="text-xs font-semibold text-slate-500 uppercase block">Margine Corsi</span>
                  <p class="text-xl font-bold mt-1" [class.text-emerald-700]="fin.courses.margin.actual >= 0" [class.text-rose-700]="fin.courses.margin.actual < 0">
                    € {{ fin.courses.margin.actual | number:'1.2-2' }}
                  </p>
                  <p class="text-xs text-slate-400 mt-0.5">
                    Margine previsto: € {{ fin.courses.margin.expected | number:'1.2-2' }}
                  </p>
                </div>
              </div>

              <!-- Dettaglio Uscite Docenti Corsi -->
              <div class="pt-2">
                <h4 class="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Uscite Verso Teacher - Corsi</h4>
                <div class="overflow-x-auto border border-slate-200 rounded-xl">
                  <table class="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr class="bg-slate-50 text-slate-600 font-semibold uppercase border-b border-slate-200">
                        <th class="py-2.5 px-4">Corso / Attività</th>
                        <th class="py-2.5 px-4">Docente</th>
                        <th class="py-2.5 px-4 text-center">Ore Assegnate</th>
                        <th class="py-2.5 px-4 text-center">Tariffa</th>
                        <th class="py-2.5 px-4 text-center">Stato Corso</th>
                        <th class="py-2.5 px-4 text-right">Compenso</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                      @for (c of fin.courses.teachers; track (c.project_id + c.user_id)) {
                        <tr class="hover:bg-slate-50/60">
                          <td class="py-2.5 px-4 font-semibold text-slate-800">{{ c.project_title }}</td>
                          <td class="py-2.5 px-4 text-slate-700">{{ c.teacher_name }}</td>
                          <td class="py-2.5 px-4 text-center text-slate-600 font-medium">{{ c.assigned_hours }} h</td>
                          <td class="py-2.5 px-4 text-center text-slate-500">€ {{ c.hourly_rate | number:'1.2-2' }} /h</td>
                          <td class="py-2.5 px-4 text-center">
                            @if (c.is_finished) {
                              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                Concluso nel Mese
                              </span>
                            } @else {
                              <span class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                                In Corso
                              </span>
                            }
                          </td>
                          <td class="py-2.5 px-4 text-right font-bold text-rose-600">€ {{ c.total_cost | number:'1.2-2' }}</td>
                        </tr>
                      } @empty {
                        <tr>
                          <td colspan="6" class="py-6 text-center text-slate-400">Nessun docente associato a corsi attivi o conclusi in questo mese.</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          }
        </div>

    </div>
  `
})
export class AdminDashboardComponent implements OnInit {
  private api = inject(ApiService);

  // Financial Stats (Admin Only)
  readonly financialReport = signal<FinancialMonthlyReport | null>(null);
  readonly loadingFinancial = signal<boolean>(false);

  financialYear = new Date().getFullYear();
  financialMonth = new Date().getMonth() + 1;

  readonly monthsList = [
    { value: 1, name: 'Gennaio' },
    { value: 2, name: 'Febbraio' },
    { value: 3, name: 'Marzo' },
    { value: 4, name: 'Aprile' },
    { value: 5, name: 'Maggio' },
    { value: 6, name: 'Giugno' },
    { value: 7, name: 'Luglio' },
    { value: 8, name: 'Agosto' },
    { value: 9, name: 'Settembre' },
    { value: 10, name: 'Ottobre' },
    { value: 11, name: 'Novembre' },
    { value: 12, name: 'Dicembre' }
  ];

  readonly yearsList = [2024, 2025, 2026, 2027, 2028];

  ngOnInit(): void {
    this.loadFinancialReport();
  }

  loadFinancialReport(): void {
    this.loadingFinancial.set(true);
    this.api.getFinancialMonthlyReport(Number(this.financialYear), Number(this.financialMonth)).subscribe({
      next: (rep) => {
        this.financialReport.set(rep);
        this.loadingFinancial.set(false);
      },
      error: (err) => {
        console.error('Errore caricamento report finanziario:', err);
        this.loadingFinancial.set(false);
      }
    });
  }
}

