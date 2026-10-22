import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { DailyReport, MensaReport, MonthlyReport } from '../../core/models';
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
            <h1 class="text-xl sm:text-2xl font-bold text-slate-800">Pannello Admin & Report</h1>
            <span class="text-[10px] sm:text-xs bg-amber-500/10 text-amber-600 font-bold px-2 py-0.5 rounded-full border border-amber-500/20">ADMIN</span>
          </div>
          <p class="text-xs sm:text-sm text-slate-500">Statistiche presenze, gestione assenze ingiustificate e rendicontazione mensa</p>
        </div>

        <div class="flex items-center space-x-1.5 sm:space-x-2 bg-slate-100 p-1 sm:p-1.5 rounded-xl border border-slate-200 overflow-x-auto w-full md:w-auto">
          <button
            (click)="activeSection.set('ATTENDANCES')"
            [class.bg-white]="activeSection() === 'ATTENDANCES'"
            [class.shadow-sm]="activeSection() === 'ATTENDANCES'"
            [class.text-emerald-700]="activeSection() === 'ATTENDANCES'"
            [class.font-bold]="activeSection() === 'ATTENDANCES'"
            class="flex-1 md:flex-initial px-3 sm:px-4 py-2 text-xs md:text-sm rounded-lg text-slate-600 transition-all cursor-pointer whitespace-nowrap text-center"
          >
            Giornaliero
          </button>

          <button
            (click)="activeSection.set('MONTHLY')"
            [class.bg-white]="activeSection() === 'MONTHLY'"
            [class.shadow-sm]="activeSection() === 'MONTHLY'"
            [class.text-emerald-700]="activeSection() === 'MONTHLY'"
            [class.font-bold]="activeSection() === 'MONTHLY'"
            class="flex-1 md:flex-initial px-3 sm:px-4 py-2 text-xs md:text-sm rounded-lg text-slate-600 transition-all cursor-pointer whitespace-nowrap text-center"
          >
            Mensile
          </button>

          <button
            (click)="activeSection.set('MENSA')"
            [class.bg-white]="activeSection() === 'MENSA'"
            [class.shadow-sm]="activeSection() === 'MENSA'"
            [class.text-emerald-700]="activeSection() === 'MENSA'"
            [class.font-bold]="activeSection() === 'MENSA'"
            class="flex-1 md:flex-initial px-3 sm:px-4 py-2 text-xs md:text-sm rounded-lg text-slate-600 transition-all cursor-pointer whitespace-nowrap text-center"
          >
            Mensa
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
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 sm:gap-4">
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

              <div class="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs border-l-4 border-l-amber-500">
                <p class="text-[10px] sm:text-xs font-semibold text-amber-600 uppercase">Di cui Extra</p>
                <p class="text-xl sm:text-3xl font-extrabold text-amber-600 mt-1">{{ rep.statistics.extraPresent ?? rep.extraStudents?.length ?? 0 }}</p>
                <p class="text-[10px] sm:text-[11px] text-amber-600 font-medium mt-0.5">fuori piano</p>
              </div>

              <div class="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
                <p class="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase">Assenti</p>
                <p class="text-xl sm:text-3xl font-extrabold text-rose-600 mt-1">{{ rep.statistics.absent }}</p>
                <p class="text-[10px] sm:text-[11px] text-rose-500 font-medium mt-0.5">
                  {{ rep.statistics.absent - rep.statistics.excused }} ingiustificati
                </p>
              </div>

              <div class="col-span-2 sm:col-span-1 bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
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
                    <option value="EXTRA">Extra</option>
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
                          @if (item.is_extra) {
                            <span class="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-purple-100 text-purple-800 uppercase">Extra</span>
                          }
                        </div>
                        <p class="text-xs text-slate-500">{{ item.school || 'Scuola non specificata' }}</p>
                      </div>

                      <div class="text-right">
                        @if (item.is_present) {
                          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            ✓ Presente
                          </span>
                        } @else if (item.is_absent_justified) {
                          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                            Giustificato
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
                      <th class="py-3.5 px-6 text-center whitespace-nowrap">Tipo</th>
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
                          } @else if (item.is_absent_justified) {
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                              Giustificato
                            </span>
                          } @else {
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              ✕ Assente Ingiustificato
                            </span>
                          }
                        </td>
                        <td class="py-3.5 px-6 text-center whitespace-nowrap">
                          @if (item.is_extra) {
                            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-800 border border-purple-200 uppercase">
                              Extra
                            </span>
                          } @else {
                            <span class="text-xs text-slate-400 font-medium">Standard</span>
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
                        <td colspan="7" class="py-10 text-center text-slate-400 font-medium">
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
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 sm:gap-4">
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

              <div class="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs border-l-4 border-l-purple-500">
                <p class="text-[10px] sm:text-xs font-semibold text-purple-600 uppercase">Di cui Extra</p>
                <p class="text-xl sm:text-3xl font-extrabold text-purple-600 mt-1">{{ mon.summary.totalExtraPresent }}</p>
                <p class="text-[10px] sm:text-[11px] text-purple-600 font-medium mt-0.5">fuori piano</p>
              </div>

              <div class="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
                <p class="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase">Assenti</p>
                <p class="text-xl sm:text-3xl font-extrabold text-rose-600 mt-1">{{ mon.summary.totalUnjustifiedAbsent }}</p>
                <p class="text-[10px] sm:text-[11px] text-rose-500 font-medium mt-0.5">{{ mon.summary.totalExcused }} giustif.</p>
              </div>

              <div class="col-span-2 sm:col-span-1 bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
                <p class="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase">Pasti Mensa</p>
                <p class="text-xl sm:text-3xl font-extrabold text-amber-600 mt-1">{{ mon.summary.totalMeals }}</p>
                <p class="text-[10px] sm:text-[11px] text-amber-600 font-medium mt-0.5">consumati</p>
              </div>
            </div>

            <!-- Andamento Giornaliero del Mese con tabella scrollabile -->
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
              <div class="p-4 sm:p-5 border-b border-slate-200/80 bg-slate-50/70 flex items-center justify-between">
                <div class="flex items-center space-x-2">
                  <span class="w-3 h-3 rounded-full bg-emerald-500 shrink-0"></span>
                  <h3 class="font-bold text-sm sm:text-base text-slate-800">Andamento Giornaliero</h3>
                </div>
                <span class="text-xs font-mono text-slate-500">Dal {{ mon.from | appDate }} al {{ mon.to | appDate }}</span>
              </div>

              <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse min-w-[500px]">
                  <thead>
                    <tr class="bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                      <th class="py-3 px-4 sm:px-6">Data</th>
                      <th class="py-3 px-4 sm:px-6 text-center">Presenti</th>
                      <th class="py-3 px-4 sm:px-6 text-center">Extra</th>
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
                          @if (day.extra > 0) {
                            <span class="px-2 py-0.5 rounded-full text-xs font-extrabold bg-purple-100 text-purple-800 border border-purple-200">
                              {{ day.extra }}
                            </span>
                          } @else {
                            <span class="text-xs text-slate-300">0</span>
                          }
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
                        <td colspan="5" class="py-8 text-center text-slate-400 font-medium text-xs">
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

              <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse min-w-[500px]">
                  <thead>
                    <tr class="bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                      <th class="py-3 px-4 sm:px-6">Studente</th>
                      <th class="py-3 px-4 sm:px-6 text-center">Presente</th>
                      <th class="py-3 px-4 sm:px-6 text-center">Extra</th>
                      <th class="py-3 px-4 sm:px-6 text-center">Assenze</th>
                      <th class="py-3 px-4 sm:px-6 text-center">Pasti</th>
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
                        <td class="py-3 px-4 sm:px-6 text-center">
                          @if (stu.extra_days > 0) {
                            <span class="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                              {{ stu.extra_days }}
                            </span>
                          } @else {
                            <span class="text-xs text-slate-300">0</span>
                          }
                        </td>
                        <td class="py-3 px-4 sm:px-6 text-center font-medium text-rose-600 text-xs sm:text-sm">
                          {{ stu.days_absent }}
                        </td>
                        <td class="py-3 px-4 sm:px-6 text-center font-bold text-amber-700 text-xs sm:text-sm">
                          {{ stu.meals_count }}
                        </td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="5" class="py-8 text-center text-slate-400 font-medium text-xs">
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
          <div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <span class="text-xs sm:text-sm font-semibold text-slate-700">Intervallo di Conteggio:</span>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full md:w-auto items-center">
              <div class="flex items-center space-x-2">
                <span class="text-xs text-slate-400 w-8">Dal:</span>
                <input
                  type="date"
                  [(ngModel)]="mensaFrom"
                  (ngModelChange)="loadMensaReport()"
                  class="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-700 font-medium"
                />
              </div>
              <div class="flex items-center space-x-2">
                <span class="text-xs text-slate-400 w-8">Al:</span>
                <input
                  type="date"
                  [(ngModel)]="mensaTo"
                  (ngModelChange)="loadMensaReport()"
                  class="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-700 font-medium"
                />
              </div>
            </div>
          </div>

          @if (mensaReport(); as mensa) {
            <!-- Card Totale Pasti -->
            <div class="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-5 sm:p-6 text-white shadow-lg shadow-orange-500/20 flex items-center justify-between">
              <div>
                <p class="text-amber-100 text-[11px] sm:text-xs font-semibold uppercase tracking-wider">Totale Pasti Consumati</p>
                <h2 class="text-3xl sm:text-4xl font-extrabold mt-1">{{ mensa.total_meals }}</h2>
                <p class="text-amber-100 text-xs mt-1">Dal {{ mensa.from | appDate }} al {{ mensa.to | appDate }}</p>
              </div>
              <div class="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/20 flex items-center justify-center text-2xl sm:text-3xl shrink-0">
                🍲
              </div>
            </div>

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
                    <span class="px-3 py-1 bg-amber-50 text-amber-700 font-bold text-xs sm:text-sm rounded-xl border border-amber-200">
                      {{ day.total_meals }} pasti
                    </span>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      }

    </div>
  `
})
export class AdminDashboardComponent implements OnInit {
  private api = inject(ApiService);

  readonly activeSection = signal<'ATTENDANCES' | 'MONTHLY' | 'MENSA'>('ATTENDANCES');
  readonly reportDate = signal<string>(new Date().toISOString().split('T')[0]);
  readonly dailyReport = signal<DailyReport | null>(null);
  readonly monthlyReport = signal<MonthlyReport | null>(null);
  readonly mensaReport = signal<MensaReport | null>(null);

  selectedYear = new Date().getFullYear();
  selectedMonth = new Date().getMonth() + 1;

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

  mensaFrom = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  mensaTo = new Date().toISOString().split('T')[0];
  searchAttendanceQuery = '';
  statusFilter: 'ALL' | 'PRESENT' | 'ABSENT' | 'EXTRA' = 'ALL';

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
      if (this.statusFilter === 'EXTRA') return item.is_extra;
      return true;
    });
  }

  ngOnInit(): void {
    this.loadDailyReport();
    this.loadMonthlyReport();
    this.loadMensaReport();
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
    this.api.getMensaReport(this.mensaFrom, this.mensaTo).subscribe(rep => this.mensaReport.set(rep));
  }
}
