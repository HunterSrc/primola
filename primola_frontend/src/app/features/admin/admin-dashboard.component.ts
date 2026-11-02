import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { DailyReport, MensaReport, MonthlyReport, MonthlyStudentSummary, FinancialMonthlyReport, SystemSettings } from '../../core/models';
import { AppDatePipe } from '../../shared/pipes/app-date.pipe';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, AppDatePipe],
  template: `
    <div class="p-3 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-4 sm:space-y-6 pb-6 md:pb-0">

      <!-- Titolo & Switch Sub-Tab -->
      <div class="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center space-x-2">
            <h1 class="text-xl sm:text-2xl font-bold text-slate-800">Pannello Admin & Statistiche</h1>
            <span class="text-[10px] sm:text-xs bg-amber-500/10 text-amber-600 font-bold px-2 py-0.5 rounded-full border border-amber-500/20">ADMIN</span>
          </div>
          <p class="text-xs sm:text-sm text-slate-500">Statistiche presenze, bilancio entrate/uscite, rendicontazione mensa e docenti</p>
        </div>

        <div class="flex items-center space-x-1.5 sm:space-x-2 bg-slate-100 p-1 sm:p-1.5 rounded-xl border border-slate-200 overflow-x-auto w-full md:w-auto">
          <button
            (click)="setSection('ATTENDANCES')"
            [class.bg-white]="activeSection() === 'ATTENDANCES'"
            [class.shadow-sm]="activeSection() === 'ATTENDANCES'"
            [class.text-emerald-700]="activeSection() === 'ATTENDANCES'"
            [class.font-bold]="activeSection() === 'ATTENDANCES'"
            class="flex-1 md:flex-initial px-3 sm:px-4 py-2 text-xs md:text-sm rounded-lg text-slate-600 transition-all cursor-pointer whitespace-nowrap text-center"
          >
            Giornaliero
          </button>

          <button
            (click)="setSection('MONTHLY')"
            [class.bg-white]="activeSection() === 'MONTHLY'"
            [class.shadow-sm]="activeSection() === 'MONTHLY'"
            [class.text-emerald-700]="activeSection() === 'MONTHLY'"
            [class.font-bold]="activeSection() === 'MONTHLY'"
            class="flex-1 md:flex-initial px-3 sm:px-4 py-2 text-xs md:text-sm rounded-lg text-slate-600 transition-all cursor-pointer whitespace-nowrap text-center"
          >
            Mensile
          </button>

          <button
            (click)="setSection('MENSA')"
            [class.bg-white]="activeSection() === 'MENSA'"
            [class.shadow-sm]="activeSection() === 'MENSA'"
            [class.text-emerald-700]="activeSection() === 'MENSA'"
            [class.font-bold]="activeSection() === 'MENSA'"
            class="flex-1 md:flex-initial px-3 sm:px-4 py-2 text-xs md:text-sm rounded-lg text-slate-600 transition-all cursor-pointer whitespace-nowrap text-center"
          >
            Mensa
          </button>

          <button
            (click)="setSection('FINANCIAL')"
            [class.bg-white]="activeSection() === 'FINANCIAL'"
            [class.shadow-sm]="activeSection() === 'FINANCIAL'"
            [class.text-emerald-700]="activeSection() === 'FINANCIAL'"
            [class.font-bold]="activeSection() === 'FINANCIAL'"
            class="flex-1 md:flex-initial px-3 sm:px-4 py-2 text-xs md:text-sm rounded-lg text-slate-600 transition-all cursor-pointer whitespace-nowrap text-center"
          >
            Bilancio & Statistiche
          </button>
        </div>
      </div>

      <!-- SEZIONE 1: REPORT GIORNALIERO E ASSENZE -->
      @if (activeSection() === 'ATTENDANCES') {
        <div class="space-y-4 sm:space-y-6">
          
          <!-- Filtro Data -->
          <div class="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span class="text-xs sm:text-sm font-semibold text-slate-700">Data del Report:</span>
            <input
              type="date"
              [ngModel]="reportDate()"
              (ngModelChange)="onReportDateChange($event)"
              class="px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full sm:w-auto"
            />
          </div>

          <!-- Cards Statistiche -->
          @if (dailyReport(); as rep) {
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
              <div class="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
                <p class="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase">Attesi</p>
                <p class="text-xl sm:text-3xl font-extrabold text-slate-800 mt-1">{{ rep.statistics.totalExpected }}</p>
                <p class="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">a registro</p>
              </div>

              <div class="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
                <p class="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase">Presenti</p>
                <p class="text-xl sm:text-3xl font-extrabold text-emerald-600 mt-1">{{ rep.statistics.present }}</p>
                <p class="text-[10px] sm:text-[11px] text-emerald-600 font-medium mt-0.5">
                  {{ rep.statistics.totalExpected > 0 ? (rep.statistics.present / rep.statistics.totalExpected * 100 | number:'1.0-0') : 0 }}% affluenza
                </p>
              </div>

              <div class="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
                <p class="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase">Assenti Ingiustificati</p>
                <p class="text-xl sm:text-3xl font-extrabold text-rose-600 mt-1">{{ rep.statistics.absent }}</p>
                <p class="text-[10px] sm:text-[11px] text-rose-500 font-medium mt-0.5">non presenti</p>
              </div>

              <div class="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
                <p class="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase">Tot. Registrati</p>
                <p class="text-xl sm:text-3xl font-extrabold text-indigo-600 mt-1">{{ rep.allAttendances?.length || rep.statistics.totalInserted || 0 }}</p>
                <p class="text-[10px] sm:text-[11px] text-indigo-500 font-medium mt-0.5">record salvati</p>
              </div>
            </div>

            <!-- Tabella/Elenco Assenti Ingiustificati con Bottone Chiamata Rapida -->
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
              <div class="p-4 sm:p-5 border-b border-slate-200/80 flex items-center justify-between bg-rose-50/30">
                <div class="flex items-center space-x-2">
                  <span class="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
                  <h3 class="font-bold text-sm sm:text-base text-slate-800">Assenze Ingiustificate - Azione Rapida</h3>
                </div>
                <span class="text-[10px] sm:text-xs font-semibold px-2.5 py-1 bg-rose-100 text-rose-700 rounded-full">
                  {{ rep.unjustifiedAbsences.length }} da contattare
                </span>
              </div>

              <!-- Vista Mobile cards per assenze ingiustificate -->
              <div class="block md:hidden divide-y divide-slate-100">
                @for (absent of rep.unjustifiedAbsences; track absent.student_id) {
                  <div class="p-3.5 flex items-center justify-between gap-3">
                    <div>
                      <h4 class="text-sm font-bold text-slate-900">{{ absent.last_name }} {{ absent.first_name }}</h4>
                      <p class="text-xs text-slate-500">{{ absent.school || 'Scuola non specificata' }}</p>
                      <p class="text-xs text-slate-600 mt-0.5">Tutore: {{ absent.tutor_name || 'N/D' }}</p>
                    </div>

                    @if (absent.tutor_phone) {
                      <a
                        [href]="'tel:' + absent.tutor_phone"
                        class="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center space-x-1.5 shrink-0 active:scale-95"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        <span>Chiama</span>
                      </a>
                    }
                  </div>
                } @empty {
                  <div class="p-8 text-center text-slate-400 font-medium text-xs sm:text-sm">
                    Nessuna assenza ingiustificata per questa data! 🎉
                  </div>
                }
              </div>

              <!-- Vista Desktop Tabella Assenti -->
              <div class="hidden md:block overflow-x-auto">
                <table class="w-full text-left border-collapse">
                  <thead>
                    <tr class="bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                      <th class="py-3.5 px-6">Studente</th>
                      <th class="py-3.5 px-6">Scuola</th>
                      <th class="py-3.5 px-6">Tutore di Riferimento</th>
                      <th class="py-3.5 px-6 text-right">Contatta Subito</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100 text-sm">
                    @for (absent of rep.unjustifiedAbsences; track absent.student_id) {
                      <tr class="hover:bg-rose-50/20 transition-colors">
                        <td class="py-4 px-6 font-semibold text-slate-800">
                          {{ absent.last_name }} {{ absent.first_name }}
                        </td>
                        <td class="py-4 px-6 text-slate-500 text-xs">
                          {{ absent.school || 'Non specificata' }}
                        </td>
                        <td class="py-4 px-6 text-xs text-slate-700 font-medium">
                          {{ absent.tutor_name }}
                          <span class="block text-slate-400 font-normal">{{ absent.tutor_phone }}</span>
                        </td>
                        <td class="py-4 px-6 text-right">
                          <a
                            [href]="'tel:' + absent.tutor_phone"
                            class="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            <span>Chiama Tutore</span>
                          </a>
                        </td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="4" class="py-12 text-center text-slate-400 font-medium">
                          Nessuna assenza ingiustificata per questa data! 🎉
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Tabella Storico/Audit Completo -->
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
              <div class="p-4 sm:p-5 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70">
                <div class="flex items-center space-x-2">
                  <span class="w-3 h-3 rounded-full bg-indigo-600 shrink-0"></span>
                  <h3 class="font-bold text-sm sm:text-base text-slate-800">Tutti i Record Presenze ({{ filteredAttendances().length }})</h3>
                </div>

                <div class="flex items-center space-x-2 w-full sm:w-auto">
                  <input
                    type="text"
                    [(ngModel)]="searchAttendanceQuery"
                    placeholder="Filtra studente o scuola..."
                    class="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 flex-1 sm:w-56"
                  />
                  <select
                    [(ngModel)]="statusFilter"
                    class="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="ALL">Tutti</option>
                    <option value="PRESENT">Presenti</option>
                    <option value="ABSENT">Assenti</option>
                  </select>
                </div>
              </div>

              <!-- Vista Mobile Cards per la lista presenze registrate -->
              <div class="block md:hidden divide-y divide-slate-100">
                @for (item of filteredAttendances(); track item.attendance_id || item.student_id) {
                  <div class="p-3.5 space-y-2">
                    <div class="flex items-start justify-between">
                      <div>
                        <div class="flex items-center space-x-1.5">
                          <span class="font-bold text-slate-900 text-sm">{{ item.last_name }} {{ item.first_name }}</span>
                        </div>
                        <p class="text-xs text-slate-500">{{ item.school || 'Scuola non specificata' }}</p>
                      </div>

                      <div class="text-right">
                        @if (item.is_present) {
                          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            ✓ Presente
                          </span>
                        } @else {
                          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            ✕ Assente
                          </span>
                        }
                      </div>
                    </div>

                    <div class="flex items-center justify-between text-xs text-slate-500 pt-1">
                      <div class="flex items-center space-x-2">
                        <span class="font-mono text-[11px] text-slate-400">{{ item.date | appDate }}</span>
                        @if (item.canteen_used) {
                          <span class="text-[10px] font-semibold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                            🍲 Mensa
                          </span>
                        }
                      </div>

                      @if (item.tutor_phone) {
                        <a [href]="'tel:' + item.tutor_phone" class="text-emerald-700 font-mono text-[11px]">📞 {{ item.tutor_phone }}</a>
                      }
                    </div>
                  </div>
                } @empty {
                  <div class="p-8 text-center text-slate-400 font-medium text-xs">
                    Nessun record salvato per questa data ({{ reportDate() }}).
                  </div>
                }
              </div>

              <!-- Vista Desktop Tabella Audit -->
              <div class="hidden md:block overflow-x-auto">
                <table class="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr class="bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                      <th class="py-3.5 px-6 whitespace-nowrap">Data</th>
                      <th class="py-3.5 px-6">Studente</th>
                      <th class="py-3.5 px-6">Scuola</th>
                      <th class="py-3.5 px-6 text-center whitespace-nowrap">Stato Presenza</th>
                      <th class="py-3.5 px-6 text-center whitespace-nowrap min-w-[100px]">Mensa</th>
                      <th class="py-3.5 px-6">Tutore</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100 text-sm">
                    @for (item of filteredAttendances(); track item.attendance_id || item.student_id) {
                      <tr class="hover:bg-slate-50/60 transition-colors">
                        <td class="py-3.5 px-6 text-xs font-mono text-slate-600 whitespace-nowrap">
                          {{ item.date | appDate }}
                        </td>
                        <td class="py-3.5 px-6 font-semibold text-slate-800">
                          {{ item.last_name }} {{ item.first_name }}
                        </td>
                        <td class="py-3.5 px-6 text-slate-500 text-xs">
                          {{ item.school || 'Non specificata' }}
                        </td>
                        <td class="py-3.5 px-6 text-center whitespace-nowrap">
                          @if (item.is_present) {
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              ✓ Presente
                            </span>
                          } @else {
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              ✕ Assente Ingiustificato
                            </span>
                          }
                        </td>
                        <td class="py-3.5 px-6 text-center whitespace-nowrap min-w-[100px]">
                          @if (item.canteen_used) {
                            <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 shadow-2xs">
                              🍲 Mensa
                            </span>
                          } @else {
                            <span class="text-xs text-slate-300">-</span>
                          }
                        </td>
                        <td class="py-3.5 px-6 text-xs text-slate-600">
                          <p class="font-medium text-slate-700">{{ item.tutor_name || 'N/D' }}</p>
                          @if (item.tutor_phone) {
                            <a [href]="'tel:' + item.tutor_phone" class="text-slate-400 font-mono hover:text-emerald-600">{{ item.tutor_phone }}</a>
                          }
                        </td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="6" class="py-10 text-center text-slate-400 font-medium">
                          Nessun record di presenza salvato per la data selezionata ({{ reportDate() | appDate }}).
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }
        </div>
      }

      <!-- SEZIONE 2: REPORT MENSILE -->
      @if (activeSection() === 'MONTHLY') {
        <div class="space-y-4 sm:space-y-6">
          <!-- Selettore Mese e Anno -->
          <div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 class="text-sm sm:text-base font-bold text-slate-800">Seleziona Periodo Mensile</h2>
              <p class="text-xs text-slate-500">Statistiche mensili e andamento giorno per giorno</p>
            </div>
            <div class="flex items-center space-x-2.5 w-full sm:w-auto">
              <select
                [(ngModel)]="selectedMonth"
                (ngModelChange)="loadMonthlyReport()"
                class="flex-1 sm:flex-initial px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                @for (m of monthsList; track m.value) {
                  <option [value]="m.value">{{ m.name }}</option>
                }
              </select>

              <select
                [(ngModel)]="selectedYear"
                (ngModelChange)="loadMonthlyReport()"
                class="flex-1 sm:flex-initial px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                @for (y of yearsList; track y) {
                  <option [value]="y">{{ y }}</option>
                }
              </select>
            </div>
          </div>

          @if (monthlyReport(); as mon) {
            <!-- KPI Cards Mensili -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
              <div class="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
                <p class="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase">Giorni Attivi</p>
                <p class="text-xl sm:text-3xl font-extrabold text-slate-800 mt-1">{{ mon.summary.activeDays }}</p>
                <p class="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">giornate</p>
              </div>

              <div class="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
                <p class="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase">Presenze</p>
                <p class="text-xl sm:text-3xl font-extrabold text-emerald-600 mt-1">{{ mon.summary.totalPresent }}</p>
                <p class="text-[10px] sm:text-[11px] text-emerald-600 font-medium mt-0.5">nel mese</p>
              </div>

              <div class="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
                <p class="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase">Assenze Ingiustificate</p>
                <p class="text-xl sm:text-3xl font-extrabold text-rose-600 mt-1">{{ mon.summary.totalUnjustifiedAbsent }}</p>
                <p class="text-[10px] sm:text-[11px] text-rose-500 font-medium mt-0.5">nel mese</p>
              </div>

              <div class="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
                <p class="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase">Pasti Mensa</p>
                <p class="text-xl sm:text-3xl font-extrabold text-amber-600 mt-1">{{ mon.summary.totalMeals }}</p>
                <p class="text-[10px] sm:text-[11px] text-amber-600 font-medium mt-0.5">consumati</p>
              </div>
            </div>

            <!-- Andamento Giornaliero del Mese -->
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
              <div class="p-4 sm:p-5 border-b border-slate-200/80 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div class="flex items-center space-x-2">
                  <span class="w-3 h-3 rounded-full bg-emerald-500 shrink-0"></span>
                  <h3 class="font-bold text-sm sm:text-base text-slate-800">Andamento Giornaliero</h3>
                </div>
                <span class="text-xs font-mono text-slate-500">Dal {{ mon.from | appDate }} al {{ mon.to | appDate }}</span>
              </div>

              <!-- Vista Mobile a Card per Andamento Giornaliero (md:hidden) -->
              <div class="block md:hidden divide-y divide-slate-100">
                @for (day of mon.dailyTrend; track day.date) {
                  <div class="p-3.5 space-y-2">
                    <div class="flex items-center justify-between">
                      <span class="font-mono font-bold text-slate-900 text-xs">{{ day.date | appDate }}</span>
                      <span class="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        🍽️ {{ day.meals }} pasti
                      </span>
                    </div>

                    <div class="grid grid-cols-2 gap-2 text-center text-xs pt-1">
                      <div class="p-2 rounded-xl bg-emerald-50 border border-emerald-100">
                        <span class="block text-[10px] font-semibold text-emerald-800 uppercase">Presenti</span>
                        <span class="text-sm font-extrabold text-emerald-700">{{ day.present }}</span>
                      </div>

                      <div class="p-2 rounded-xl bg-rose-50 border border-rose-100">
                        <span class="block text-[10px] font-semibold text-rose-800 uppercase">Assenti</span>
                        <span class="text-sm font-extrabold text-rose-700">{{ day.absent }}</span>
                      </div>
                    </div>
                  </div>
                } @empty {
                  <div class="p-8 text-center text-slate-400 font-medium text-xs">
                    Nessun dato registrato per questo mese.
                  </div>
                }
              </div>

              <!-- Vista Desktop Tabella Andamento (hidden md:block) -->
              <div class="hidden md:block overflow-x-auto">
                <table class="w-full text-left border-collapse min-w-[500px]">
                  <thead>
                    <tr class="bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                      <th class="py-3 px-4 sm:px-6">Data</th>
                      <th class="py-3 px-4 sm:px-6 text-center">Presenti</th>
                      <th class="py-3 px-4 sm:px-6 text-center">Assenti</th>
                      <th class="py-3 px-4 sm:px-6 text-center">Mensa</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100 text-sm">
                    @for (day of mon.dailyTrend; track day.date) {
                      <tr class="hover:bg-slate-50/60 transition-colors">
                        <td class="py-3 px-4 sm:px-6 font-mono font-semibold text-slate-800 text-xs">{{ day.date | appDate }}</td>
                        <td class="py-3 px-4 sm:px-6 text-center">
                          <span class="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {{ day.present }}
                          </span>
                        </td>
                        <td class="py-3 px-4 sm:px-6 text-center">
                          @if (day.absent > 0) {
                            <span class="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              {{ day.absent }}
                            </span>
                          } @else {
                            <span class="text-xs text-slate-300">0</span>
                          }
                        </td>
                        <td class="py-3 px-4 sm:px-6 text-center font-bold text-amber-700">
                          {{ day.meals }}
                        </td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="4" class="py-8 text-center text-slate-400 font-medium text-xs">
                          Nessun dato registrato per questo mese.
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Tabella Riepilogo Presenze per Studente -->
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
              <div class="p-4 sm:p-5 border-b border-slate-200/80 bg-slate-50/70 flex items-center justify-between">
                <div class="flex items-center space-x-2">
                  <span class="w-3 h-3 rounded-full bg-indigo-500 shrink-0"></span>
                  <h3 class="font-bold text-sm sm:text-base text-slate-800">Riepilogo per Studente ({{ mon.studentsSummary.length }})</h3>
                </div>
              </div>

              <!-- Vista Mobile a Card per Studenti Mensili (md:hidden) -->
              <div class="block md:hidden divide-y divide-slate-100">
                @for (stu of mon.studentsSummary; track stu.student_id) {
                  <div class="p-3.5 space-y-2">
                    <div class="flex items-start justify-between">
                      <div>
                        <h4 class="font-bold text-slate-900 text-sm">{{ stu.last_name }} {{ stu.first_name }}</h4>
                        <p class="text-xs text-slate-500">{{ stu.school || 'Scuola non specificata' }}</p>
                      </div>
                      <span class="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                        🍽️ {{ stu.meals_count }} pasti
                      </span>
                    </div>

                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs pt-1">
                      <div class="p-2 rounded-xl bg-emerald-50 border border-emerald-100">
                        <span class="block text-[10px] font-semibold text-emerald-800 uppercase">Presente</span>
                        <span class="text-sm font-extrabold text-emerald-700">{{ stu.days_present }} gg</span>
                      </div>

                      <div class="p-2 rounded-xl bg-rose-50 border border-rose-100">
                        <span class="block text-[10px] font-semibold text-rose-800 uppercase">Assenze</span>
                        <span class="text-sm font-extrabold text-rose-700">{{ stu.days_absent }} gg</span>
                      </div>

                      <div class="p-2 rounded-xl bg-slate-50 border border-slate-200 text-left">
                        <label class="block text-[10px] font-semibold text-slate-600 uppercase mb-1">Pagate</label>
                        <input
                          type="number"
                          min="0"
                          [(ngModel)]="stu.presenze_pagate"
                          (change)="saveStudentPlan(stu)"
                          class="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs font-bold text-slate-800 text-center"
                        />
                      </div>

                      <div class="p-2 rounded-xl bg-indigo-50 border border-indigo-100">
                        <span class="block text-[10px] font-semibold text-indigo-800 uppercase">Eccedenza</span>
                        <span
                          class="inline-block mt-0.5 px-2 py-0.5 rounded-full text-xs font-black"
                          [class.bg-emerald-100]="getEccedenza(stu) === 0"
                          [class.text-emerald-800]="getEccedenza(stu) === 0"
                          [class.bg-purple-100]="getEccedenza(stu) > 0"
                          [class.text-purple-800]="getEccedenza(stu) > 0"
                          [class.bg-rose-100]="getEccedenza(stu) < 0"
                          [class.text-rose-800]="getEccedenza(stu) < 0"
                        >
                          {{ getEccedenza(stu) > 0 ? '+' + getEccedenza(stu) : getEccedenza(stu) }}
                        </span>
                      </div>
                    </div>
                  </div>
                } @empty {
                  <div class="p-8 text-center text-slate-400 font-medium text-xs">
                    Nessun record studenti per questo mese.
                  </div>
                }
              </div>

              <!-- Vista Desktop Tabella Studenti (hidden md:block) -->
              <div class="hidden md:block overflow-x-auto">
                <table class="w-full text-left border-collapse min-w-[650px]">
                  <thead>
                    <tr class="bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                      <th class="py-3 px-4 sm:px-6">Studente</th>
                      <th class="py-3 px-4 sm:px-6 text-center">Presente</th>
                      <th class="py-3 px-4 sm:px-6 text-center">Assenze</th>
                      <th class="py-3 px-4 sm:px-6 text-center">Pasti</th>
                      <th class="py-3 px-4 sm:px-6 text-center w-36">Presenze Pagate</th>
                      <th class="py-3 px-4 sm:px-6 text-center">Eccedenza</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100 text-sm">
                    @for (stu of mon.studentsSummary; track stu.student_id) {
                      <tr class="hover:bg-slate-50/60 transition-colors">
                        <td class="py-3 px-4 sm:px-6">
                          <p class="font-semibold text-slate-800 text-xs sm:text-sm">{{ stu.last_name }} {{ stu.first_name }}</p>
                          <p class="text-[11px] text-slate-400">{{ stu.school || 'Non spec.' }}</p>
                        </td>
                        <td class="py-3 px-4 sm:px-6 text-center font-bold text-emerald-700 text-xs sm:text-sm">
                          {{ stu.days_present }}
                        </td>
                        <td class="py-3 px-4 sm:px-6 text-center font-medium text-rose-600 text-xs sm:text-sm">
                          {{ stu.days_absent }}
                        </td>
                        <td class="py-3 px-4 sm:px-6 text-center font-bold text-amber-700 text-xs sm:text-sm">
                          {{ stu.meals_count }}
                        </td>
                        <td class="py-3 px-4 sm:px-6 text-center">
                          <input
                            type="number"
                            min="0"
                            [(ngModel)]="stu.presenze_pagate"
                            (change)="saveStudentPlan(stu)"
                            class="w-20 px-2 py-1 text-center bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </td>
                        <td class="py-3 px-4 sm:px-6 text-center">
                          <span
                            class="inline-block px-2.5 py-0.5 rounded-full text-xs font-black border"
                            [class.bg-emerald-50]="getEccedenza(stu) === 0"
                            [class.text-emerald-700]="getEccedenza(stu) === 0"
                            [class.border-emerald-200]="getEccedenza(stu) === 0"
                            [class.bg-purple-100]="getEccedenza(stu) > 0"
                            [class.text-purple-800]="getEccedenza(stu) > 0"
                            [class.border-purple-200]="getEccedenza(stu) > 0"
                            [class.bg-rose-50]="getEccedenza(stu) < 0"
                            [class.text-rose-700]="getEccedenza(stu) < 0"
                            [class.border-rose-200]="getEccedenza(stu) < 0"
                          >
                            {{ getEccedenza(stu) > 0 ? '+' + getEccedenza(stu) : getEccedenza(stu) }}
                          </span>
                        </td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="6" class="py-8 text-center text-slate-400 font-medium text-xs">
                          Nessun record studenti per questo mese.
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }
        </div>
      }

      <!-- SEZIONE 3: RENDICONTAZIONE MENSA -->
      @if (activeSection() === 'MENSA') {
        <div class="space-y-4 sm:space-y-6">
          <div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span class="text-xs sm:text-sm font-semibold text-slate-700">Seleziona Mese di Analisi Mensa:</span>
            <div class="flex items-center space-x-2.5 w-full sm:w-auto">
              <select
                [(ngModel)]="mensaMonth"
                (ngModelChange)="loadMensaReport()"
                class="flex-1 sm:flex-initial px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                @for (m of monthsList; track m.value) {
                  <option [value]="m.value">{{ m.name }}</option>
                }
              </select>

              <select
                [(ngModel)]="mensaYear"
                (ngModelChange)="loadMensaReport()"
                class="flex-1 sm:flex-initial px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                @for (y of yearsList; track y) {
                  <option [value]="y">{{ y }}</option>
                }
              </select>
            </div>
          </div>

          @if (mensaReport(); as mensa) {
            <!-- KPI Raggruppamento Mensa -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <div class="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-4 sm:p-5 text-white shadow-md shadow-orange-500/15">
                <p class="text-amber-100 text-[10px] sm:text-xs font-semibold uppercase tracking-wider">Totale Consegnati</p>
                <h2 class="text-2xl sm:text-4xl font-extrabold mt-1">{{ mensa.total_meals }}</h2>
                <p class="text-amber-100 text-[11px] mt-1">Dal {{ mensa.from | appDate }} al {{ mensa.to | appDate }}</p>
              </div>

              <div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs border-l-4 border-l-emerald-500">
                <p class="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase">Pasti Consegnati (Regolari)</p>
                <p class="text-2xl sm:text-3xl font-extrabold text-emerald-600 mt-1">{{ mensa.delivered_regular }}</p>
                <p class="text-[11px] text-slate-400 mt-1">in abbonamento</p>
              </div>

              <div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs border-l-4 border-l-purple-500">
                <p class="text-[10px] sm:text-xs font-semibold text-purple-600 uppercase">Pasti Consegnati Extra</p>
                <p class="text-2xl sm:text-3xl font-extrabold text-purple-600 mt-1">{{ mensa.delivered_extra }}</p>
                <p class="text-[11px] text-purple-500 mt-1">fuori abbonamento</p>
              </div>

              <div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs border-l-4 border-l-indigo-500">
                <p class="text-[10px] sm:text-xs font-semibold text-indigo-600 uppercase">Pasti Previsti Stimati</p>
                <p class="text-2xl sm:text-3xl font-extrabold text-indigo-700 mt-1">{{ mensa.expected_meals }}</p>
                <p class="text-[11px] text-slate-400 mt-1">su base presenze mensili</p>
              </div>
            </div>

            <!-- Riepilogo Pasti per Studente -->
            @if (mensa.students_breakdown && mensa.students_breakdown.length > 0) {
              <div class="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
                <div class="p-4 border-b border-slate-200 font-bold text-sm sm:text-base text-slate-800">
                  Dettaglio Mensile Pasti per Studente ({{ mensa.students_breakdown.length }})
                </div>
                <div class="overflow-x-auto">
                  <table class="w-full text-left border-collapse min-w-[520px]">
                    <thead>
                      <tr class="bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                        <th class="py-3 px-4 sm:px-6">Studente</th>
                        <th class="py-3 px-4 sm:px-6 text-center">Diritto Sett.</th>
                        <th class="py-3 px-4 sm:px-6 text-center">Previsti Mese</th>
                        <th class="py-3 px-4 sm:px-6 text-center">Consegnati Reg.</th>
                        <th class="py-3 px-4 sm:px-6 text-center">Consegnati Extra</th>
                        <th class="py-3 px-4 sm:px-6 text-center">Totale</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 text-xs sm:text-sm">
                      @for (stu of mensa.students_breakdown; track stu.student_id) {
                        <tr class="hover:bg-slate-50/60 transition-colors">
                          <td class="py-3 px-4 sm:px-6">
                            <p class="font-semibold text-slate-800">{{ stu.last_name }} {{ stu.first_name }}</p>
                            <p class="text-[11px] text-slate-400">{{ stu.school || 'Non spec.' }}</p>
                          </td>
                          <td class="py-3 px-4 sm:px-6 text-center font-medium text-slate-600">
                            {{ stu.weekly_meals }} / sett.
                          </td>
                          <td class="py-3 px-4 sm:px-6 text-center font-bold text-indigo-700">
                            {{ stu.expected_meals }}
                          </td>
                          <td class="py-3 px-4 sm:px-6 text-center font-bold text-emerald-700">
                            {{ stu.delivered_regular }}
                          </td>
                          <td class="py-3 px-4 sm:px-6 text-center">
                            @if (stu.delivered_extra > 0) {
                              <span class="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                                {{ stu.delivered_extra }}
                              </span>
                            } @else {
                              <span class="text-slate-300">0</span>
                            }
                          </td>
                          <td class="py-3 px-4 sm:px-6 text-center font-extrabold text-amber-700">
                            {{ stu.delivered_total }}
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            }

            <!-- Breakdown per Giorno -->
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
              <div class="p-4 border-b border-slate-200 font-bold text-sm sm:text-base text-slate-800">Dettaglio Giornaliero Pasti Mensa</div>
              <div class="divide-y divide-slate-100">
                @for (day of mensa.breakdown; track day.date) {
                  <div class="p-3.5 sm:p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div>
                      <p class="font-semibold text-slate-800 text-xs sm:text-sm font-mono">{{ day.date | appDate }}</p>
                      <p class="text-[11px] text-slate-400 mt-0.5">
                        {{ day.students.length }} studenti serviti
                      </p>
                    </div>
                    <div class="flex items-center space-x-2">
                      @if (day.extra_meals && day.extra_meals > 0) {
                        <span class="px-2.5 py-1 bg-purple-50 text-purple-700 font-bold text-xs rounded-xl border border-purple-200">
                          {{ day.extra_meals }} extra
                        </span>
                      }
                      <span class="px-3 py-1 bg-amber-50 text-amber-700 font-bold text-xs sm:text-sm rounded-xl border border-amber-200">
                        {{ day.total_meals }} pasti
                      </span>
                    </div>
                  </div>
                } @empty {
                  <div class="p-8 text-center text-slate-400 font-medium text-xs">
                    Nessun pasto registrato per questo mese.
                  </div>
                }
              </div>
            </div>
          }
        </div>
      }

      <!-- SEZIONE 4: BILANCIO & STATISTICHE FINANZIARIE (SOLO ADMIN) -->
      @if (activeSection() === 'FINANCIAL') {
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

              <button
                type="button"
                (click)="openSettingsModal()"
                class="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-semibold rounded-xl transition-colors flex items-center space-x-1.5"
              >
                <span>⚙️ Tariffe</span>
              </button>
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
                  Previste: € {{ fin.summary.total_expected_revenues | number:'1.2-2' }}
                </p>
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
                  Quota giornaliera: € {{ fin.rates.doposcuola_daily_fee | number:'1.2-2' }} • Pasto: € {{ fin.rates.meal_fee_student | number:'1.2-2' }}
                </span>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div class="bg-slate-50/80 p-4 rounded-xl border border-slate-200">
                  <span class="text-xs font-semibold text-slate-500 uppercase block">Entrate Doposcuola</span>
                  <p class="text-xl font-bold text-emerald-600 mt-1">
                    € {{ fin.doposcuola.revenues.actual | number:'1.2-2' }}
                  </p>
                  <p class="text-xs text-slate-400 mt-0.5">
                    Previste: € {{ fin.doposcuola.revenues.expected | number:'1.2-2' }}
                  </p>
                  <div class="mt-2 text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                    {{ fin.doposcuola.revenues.actual_days }} presenze • {{ fin.doposcuola.revenues.actual_meals }} pasti incassati
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
      }

      <!-- MODALE MODIFICA TARIFFE SISTEMA -->
      @if (showSettingsModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div class="bg-white rounded-2xl max-w-md w-full shadow-xl border border-slate-200 p-6 space-y-4">
            <div class="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 class="font-bold text-slate-800 text-base">Tariffe Economiche Primola</h3>
              <button
                type="button"
                (click)="closeSettingsModal()"
                class="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div class="space-y-3 text-xs sm:text-sm">
              <div>
                <label class="block font-semibold text-slate-700 mb-1">Quota Giornaliera Doposcuola (€ / studente / giorno)</label>
                <input
                  type="number"
                  step="0.5"
                  [(ngModel)]="editSettings.doposcuola_daily_fee"
                  class="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                />
              </div>

              <div>
                <label class="block font-semibold text-slate-700 mb-1">Quota Pasto Studente (€ / pasto addebitato)</label>
                <input
                  type="number"
                  step="0.1"
                  [(ngModel)]="editSettings.meal_fee_student"
                  class="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                />
              </div>

              <div class="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs text-amber-800">
                💡 I costi di riferimento della mensa sono ora calcolati automaticamente dal totale delle note spese inserite nella sezione <strong>Gestione Mensa & Spese</strong>.
              </div>
            </div>

            <div class="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                (click)="closeSettingsModal()"
                class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Annulla
              </button>
              <button
                type="button"
                [disabled]="savingSettings()"
                (click)="saveSettings()"
                class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50"
              >
                {{ savingSettings() ? 'Salvataggio...' : 'Salva Tariffe' }}
              </button>
            </div>
          </div>
        </div>
      }

    </div>
  `
})
export class AdminDashboardComponent implements OnInit {
  private api = inject(ApiService);

  readonly activeSection = signal<'ATTENDANCES' | 'MONTHLY' | 'MENSA' | 'FINANCIAL'>('ATTENDANCES');
  readonly reportDate = signal<string>(new Date().toISOString().split('T')[0]);
  readonly dailyReport = signal<DailyReport | null>(null);
  readonly monthlyReport = signal<MonthlyReport | null>(null);
  readonly mensaReport = signal<MensaReport | null>(null);

  // Financial Stats (Admin Only)
  readonly financialReport = signal<FinancialMonthlyReport | null>(null);
  readonly loadingFinancial = signal<boolean>(false);
  readonly showSettingsModal = signal<boolean>(false);
  readonly savingSettings = signal<boolean>(false);

  financialYear = new Date().getFullYear();
  financialMonth = new Date().getMonth() + 1;

  editSettings: SystemSettings = {
    doposcuola_daily_fee: 12.00,
    meal_fee_student: 5.50
  };

  selectedYear = new Date().getFullYear();
  selectedMonth = new Date().getMonth() + 1;

  mensaYear = new Date().getFullYear();
  mensaMonth = new Date().getMonth() + 1;

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

  searchAttendanceQuery = '';
  statusFilter: 'ALL' | 'PRESENT' | 'ABSENT' = 'ALL';

  setSection(section: 'ATTENDANCES' | 'MONTHLY' | 'MENSA' | 'FINANCIAL'): void {
    this.activeSection.set(section);
    if (section === 'FINANCIAL' && !this.financialReport()) {
      this.loadFinancialReport();
      this.loadSettings();
    }
  }

  filteredAttendances() {
    const list = this.dailyReport()?.allAttendances || [];
    const q = this.searchAttendanceQuery.toLowerCase().trim();
    return list.filter(item => {
      const matchQuery = !q ||
        item.first_name.toLowerCase().includes(q) ||
        item.last_name.toLowerCase().includes(q) ||
        (item.school && item.school.toLowerCase().includes(q));

      if (!matchQuery) return false;

      if (this.statusFilter === 'PRESENT') return item.is_present;
      if (this.statusFilter === 'ABSENT') return !item.is_present;
      return true;
    });
  }

  getEccedenza(stu: MonthlyStudentSummary): number {
    const present = Number(stu.days_present) || 0;
    const absent = Number(stu.days_absent) || 0;
    const paid = Number(stu.presenze_pagate) || 0;
    return (present + absent) - paid;
  }

  saveStudentPlan(stu: MonthlyStudentSummary): void {
    const paid = Number(stu.presenze_pagate) || 0;
    stu.presenze_pagate = paid;
    stu.eccedenza = this.getEccedenza(stu);

    this.api.saveMonthlyPlans({
      year: this.selectedYear,
      month: this.selectedMonth,
      plans: [
        {
          student_id: stu.student_id,
          presenze_pagate: paid
        }
      ]
    }).subscribe({
      next: () => {
        // Updated successfully
      },
      error: (err) => {
        console.error('Errore salvataggio piano mensile studente', err);
      }
    });
  }

  ngOnInit(): void {
    this.loadDailyReport();
    this.loadMonthlyReport();
    this.loadMensaReport();
    this.loadSettings();
  }

  onReportDateChange(date: string): void {
    this.reportDate.set(date);
    this.loadDailyReport();
  }

  loadDailyReport(): void {
    this.api.getDailyReport(this.reportDate()).subscribe(rep => this.dailyReport.set(rep));
  }

  loadMonthlyReport(): void {
    this.api.getMonthlyReport(this.selectedYear, this.selectedMonth).subscribe(rep => this.monthlyReport.set(rep));
  }

  loadMensaReport(): void {
    this.api.getMensaReport(Number(this.mensaYear), Number(this.mensaMonth)).subscribe(rep => this.mensaReport.set(rep));
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

  loadSettings(): void {
    this.api.getSystemSettings().subscribe({
      next: (res) => {
        if (res.settings) {
          this.editSettings = { ...res.settings };
        }
      },
      error: (err) => console.error('Errore caricamento impostazioni:', err)
    });
  }

  openSettingsModal(): void {
    this.showSettingsModal.set(true);
  }

  closeSettingsModal(): void {
    this.showSettingsModal.set(false);
  }

  saveSettings(): void {
    this.savingSettings.set(true);
    this.api.updateSystemSettings(this.editSettings).subscribe({
      next: () => {
        this.savingSettings.set(false);
        this.closeSettingsModal();
        this.loadFinancialReport();
      },
      error: (err) => {
        console.error('Errore salvataggio tariffe:', err);
        this.savingSettings.set(false);
      }
    });
  }
}

