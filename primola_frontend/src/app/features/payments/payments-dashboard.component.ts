import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import {
  MonthlyBillingSummary,
  StudentMonthlyBilling,
  AfterschoolPackage
} from '../../core/models';

@Component({
  selector: 'app-payments-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-3 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6 pb-12">
      <!-- Header Pagina & Filtro Mese -->
      <div class="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center space-x-2">
            <h1 class="text-xl sm:text-2xl font-bold text-slate-800">Gestione Pagamenti Doposcuola</h1>
            <span class="text-[10px] sm:text-xs bg-emerald-500/10 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-500/20">DOPOSCUOLA</span>
          </div>
          <p class="text-xs sm:text-sm text-slate-500 mt-1">
            Associazione tariffe mensili, calcolo automatico extra a tariffa una tantum e saldo pasti con metodo di pagamento
          </p>
        </div>

        <!-- Selettore Mese / Anno -->
        <div class="flex items-center space-x-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200 self-start md:self-auto">
          <button
            (click)="previousMonth()"
            class="p-2 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-all cursor-pointer"
            title="Mese precedente"
          >
            ◀
          </button>

          <select
            [(ngModel)]="selectedMonth"
            (change)="loadBilling()"
            class="bg-transparent text-sm font-semibold text-slate-700 py-1 px-2 border-0 focus:ring-0 cursor-pointer"
          >
            <option *ngFor="let m of monthsList" [value]="m.value">{{ m.name }}</option>
          </select>

          <select
            [(ngModel)]="selectedYear"
            (change)="loadBilling()"
            class="bg-transparent text-sm font-semibold text-slate-700 py-1 px-2 border-0 focus:ring-0 cursor-pointer"
          >
            <option *ngFor="let y of yearsList" [value]="y">{{ y }}</option>
          </select>

          <button
            (click)="nextMonth()"
            class="p-2 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-all cursor-pointer"
            title="Mese successivo"
          >
            ▶
          </button>
        </div>
      </div>

      <!-- Feedback Alert -->
      <div *ngIf="alertMessage()" class="p-4 rounded-xl border text-sm flex items-center justify-between transition-all"
           [ngClass]="alertType() === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'">
        <span>{{ alertMessage() }}</span>
        <button (click)="alertMessage.set(null)" class="text-slate-400 hover:text-slate-600 font-bold ml-4">✕</button>
      </div>

      <!-- KPI Summary Cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div class="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm">
          <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tariffe Pacchetti</p>
          <p class="text-xl sm:text-2xl font-black text-emerald-700 mt-1">
            {{ (billingData()?.totals?.total_packages_revenue ?? 0) | currency:'EUR':'symbol':'1.2-2' }}
          </p>
          <p class="text-[11px] text-slate-400 mt-0.5">Incassate all'assegnazione</p>
        </div>

        <div class="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm">
          <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Extra da Saldare</p>
          <p class="text-xl sm:text-2xl font-black text-amber-600 mt-1">
            {{ (billingData()?.totals?.total_extra_pending ?? 0) | currency:'EUR':'symbol':'1.2-2' }}
          </p>
          <p class="text-[11px] text-slate-400 mt-0.5">
            Saldati: {{ (billingData()?.totals?.total_extra_collected ?? 0) | currency:'EUR':'symbol':'1.2-2' }}
          </p>
        </div>

        <div class="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm">
          <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pasti da Saldare</p>
          <p class="text-xl sm:text-2xl font-black text-blue-600 mt-1">
            {{ (billingData()?.totals?.total_meals_pending ?? 0) | currency:'EUR':'symbol':'1.2-2' }}
          </p>
          <p class="text-[11px] text-slate-400 mt-0.5">
            Saldati: {{ (billingData()?.totals?.total_meals_collected ?? 0) | currency:'EUR':'symbol':'1.2-2' }}
          </p>
        </div>

        <div class="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm">
          <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Totale Valore Mese</p>
          <p class="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            {{ (billingData()?.totals?.grand_total_potential ?? 0) | currency:'EUR':'symbol':'1.2-2' }}
          </p>
          <p class="text-[11px] text-slate-400 mt-0.5">Pacchetti + Extra + Pasti</p>
        </div>
      </div>

      <!-- Barra Ricerca Studente -->
      <div class="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 flex items-center justify-between gap-3">
        <div class="relative flex-1 max-w-md">
          <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">🔍</span>
          <input
            type="text"
            [(ngModel)]="searchQuery"
            placeholder="Cerca per cognome, nome o scuola..."
            class="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white"
          />
        </div>

        <div class="text-xs text-slate-500 hidden sm:block">
          Tariffa Una Tantum: <strong class="text-slate-700">{{ billingData()?.unit_rates?.one_off_fee | currency:'EUR':'symbol':'1.2-2' }}/gg</strong> |
          Quota Pasto: <strong class="text-slate-700">{{ billingData()?.unit_rates?.meal_fee_student | currency:'EUR':'symbol':'1.2-2' }}</strong>
        </div>
      </div>

      <!-- VISTA MOBILE: Card Responsive (md:hidden) -->
      <div class="block md:hidden space-y-3">
        <div *ngIf="isLoading()" class="bg-white rounded-2xl border border-slate-200/80 p-8 text-center text-slate-400">
          <div class="inline-block animate-spin rounded-full h-6 w-6 border-2 border-emerald-600 border-t-transparent mr-2 align-middle"></div>
          Caricamento prospetto pagamenti...
        </div>

        <div *ngIf="!isLoading() && filteredStudents().length === 0" class="bg-white rounded-2xl border border-slate-200/80 p-8 text-center text-slate-400">
          Nessuno studente trovato per i criteri selezionati.
        </div>

        <div *ngFor="let stu of filteredStudents()" class="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 space-y-3">
          <div class="flex items-start justify-between gap-2">
            <div>
              <div class="font-bold text-slate-900 text-base">{{ stu.last_name }} {{ stu.first_name }}</div>
              <div class="text-xs text-slate-400">{{ stu.school || 'Scuola non specificata' }}</div>
            </div>
            <div class="text-right">
              <div class="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Totale Mese</div>
              <div class="font-black text-slate-900 text-base">{{ stu.total_due_month | currency:'EUR':'symbol':'1.2-2' }}</div>
            </div>
          </div>

          <!-- Alert Mese Precedente Da Saldare -->
          <div *ngIf="stu.previous_month_pending?.has_pending" class="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs space-y-2">
            <div class="font-bold flex items-center justify-between gap-2">
              <span>⚠️ Da saldare {{ getMonthName(stu.previous_month_pending!.month) }}:</span>
              <span class="text-rose-700">{{ stu.previous_month_pending!.total_pending | currency:'EUR':'symbol':'1.2-2' }}</span>
            </div>
            <div class="text-[11px] text-amber-800">
              <span *ngIf="!stu.previous_month_pending!.meals_paid && stu.previous_month_pending!.meals_count > 0">
                {{ stu.previous_month_pending!.meals_count }} pasti ({{ stu.previous_month_pending!.meals_total | currency:'EUR':'symbol':'1.2-2' }})
              </span>
              <span *ngIf="!stu.previous_month_pending!.meals_paid && stu.previous_month_pending!.meals_count > 0 && !stu.previous_month_pending!.extra_paid && stu.previous_month_pending!.extra_days_count > 0"> + </span>
              <span *ngIf="!stu.previous_month_pending!.extra_paid && stu.previous_month_pending!.extra_days_count > 0">
                {{ stu.previous_month_pending!.extra_days_count }} extra ({{ stu.previous_month_pending!.extra_days_total | currency:'EUR':'symbol':'1.2-2' }})
              </span>
            </div>
            <button
              (click)="openSettleModal(stu, stu.previous_month_pending!.year, stu.previous_month_pending!.month)"
              class="w-full min-h-[44px] inline-flex items-center justify-center px-3 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors cursor-pointer"
            >
              💳 Salda {{ getMonthName(stu.previous_month_pending!.month) }}
            </button>
          </div>

          <!-- Pacchetti Assegnati -->
          <div class="space-y-2">
            <div class="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Pacchetti Assegnati</div>
            <div class="flex flex-wrap items-center gap-2">
              <div
                *ngFor="let pkg of stu.assigned_packages"
                class="inline-flex items-center gap-2 px-3 py-2 text-xs rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200"
              >
                <span class="font-semibold">{{ pkg.package_name }}</span>
                <span class="text-[11px] font-bold text-emerald-700">({{ pkg.amount_paid | currency:'EUR':'symbol':'1.2-2' }})</span>
                <button
                  (click)="removePackage(pkg.id)"
                  class="min-w-[32px] min-h-[32px] inline-flex items-center justify-center text-rose-500 hover:text-rose-700 font-bold text-sm cursor-pointer"
                  title="Rimuovi pacchetto"
                >
                  ✕
                </button>
              </div>
              <button
                (click)="openAssignModal(stu)"
                class="min-h-[44px] inline-flex items-center px-3.5 py-2 text-xs font-semibold text-emerald-700 bg-white hover:bg-emerald-50 border border-dashed border-emerald-400 rounded-xl transition-colors cursor-pointer"
              >
                + Pacchetto
              </button>
            </div>
          </div>

          <!-- Riepilogo Presenze / Extra / Pasti -->
          <div class="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center text-xs">
            <div class="p-2 rounded-xl bg-slate-50">
              <div class="text-[10px] text-slate-400 font-semibold">Presenze</div>
              <div class="font-bold text-slate-800">{{ stu.days_present }} / {{ stu.total_covered_days }} gg</div>
              <div *ngIf="stu.days_present > stu.total_covered_days" class="text-[10px] text-rose-600 font-bold">
                +{{ stu.days_present - stu.total_covered_days }} ecc.
              </div>
            </div>
            <div class="p-2 rounded-xl bg-slate-50">
              <div class="text-[10px] text-slate-400 font-semibold">Extra</div>
              <div class="font-bold text-amber-700">{{ stu.extra_days_total | currency:'EUR':'symbol':'1.2-2' }}</div>
              <div *ngIf="stu.extra_days_count > 0" class="text-[10px] font-semibold" [ngClass]="stu.extra_paid ? 'text-emerald-700' : 'text-amber-700'">
                {{ stu.extra_paid ? 'Saldato' : 'Da saldare' }}
              </div>
            </div>
            <div class="p-2 rounded-xl bg-slate-50">
              <div class="text-[10px] text-slate-400 font-semibold">Pasti ({{ stu.meals_count }})</div>
              <div class="font-bold text-blue-700">{{ stu.meals_total | currency:'EUR':'symbol':'1.2-2' }}</div>
              <div *ngIf="stu.meals_count > 0" class="text-[10px] font-semibold" [ngClass]="stu.meals_paid ? 'text-emerald-700' : 'text-blue-700'">
                {{ stu.meals_paid ? 'Saldato' : 'Da saldare' }}
              </div>
            </div>
          </div>

          <button
            (click)="openSettleModal(stu)"
            [disabled]="(!stu.extra_days_count && !stu.meals_count) || (stu.extra_paid && stu.meals_paid)"
            class="w-full min-h-[44px] px-4 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            💳 Salda Fine Mese
          </button>
        </div>
      </div>

      <!-- Tabella Pagamenti Studenti (Desktop) -->
      <div class="hidden md:block bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm text-slate-600 min-w-[900px]">
            <thead class="bg-slate-50/75 border-b border-slate-200 text-xs font-semibold uppercase text-slate-500 tracking-wider">
              <tr>
                <th class="px-4 py-3.5">Studente</th>
                <th class="px-4 py-3.5">Pacchetti Assegnati</th>
                <th class="px-4 py-3.5 text-center">Presenze / Copertura</th>
                <th class="px-4 py-3.5 text-center">Extra (Una Tantum)</th>
                <th class="px-4 py-3.5 text-center">Pasti Consumati</th>
                <th class="px-4 py-3.5 text-center">Totale Mese</th>
                <th class="px-4 py-3.5 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr *ngIf="isLoading()">
                <td colspan="7" class="px-4 py-12 text-center text-slate-400">
                  <div class="inline-block animate-spin rounded-full h-6 w-6 border-2 border-emerald-600 border-t-transparent mr-2 align-middle"></div>
                  Caricamento prospetto pagamenti...
                </td>
              </tr>

              <tr *ngIf="!isLoading() && filteredStudents().length === 0">
                <td colspan="7" class="px-4 py-12 text-center text-slate-400">
                  Nessuno studente trovato per i criteri selezionati.
                </td>
              </tr>

              <tr *ngFor="let stu of filteredStudents()" class="hover:bg-slate-50/70 transition-colors">
                <!-- Studente -->
                <td class="px-4 py-3.5 font-medium text-slate-900">
                  <div class="font-bold text-slate-800">{{ stu.last_name }} {{ stu.first_name }}</div>
                  <div class="text-[11px] text-slate-400">{{ stu.school || 'Scuola non specificata' }}</div>

                  <!-- Alert Mese Precedente Da Saldare -->
                  <div *ngIf="stu.previous_month_pending?.has_pending" class="mt-2 p-2 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-[11px] space-y-1">
                    <div class="font-bold flex items-center gap-1">
                      <span>⚠️ Da saldare {{ getMonthName(stu.previous_month_pending!.month) }}:</span>
                      <span class="text-rose-700">{{ stu.previous_month_pending!.total_pending | currency:'EUR':'symbol':'1.2-2' }}</span>
                    </div>
                    <div class="text-[10px] text-amber-800">
                      <span *ngIf="!stu.previous_month_pending!.meals_paid && stu.previous_month_pending!.meals_count > 0">
                        {{ stu.previous_month_pending!.meals_count }} pasti ({{ stu.previous_month_pending!.meals_total | currency:'EUR':'symbol':'1.2-2' }})
                      </span>
                      <span *ngIf="!stu.previous_month_pending!.meals_paid && stu.previous_month_pending!.meals_count > 0 && !stu.previous_month_pending!.extra_paid && stu.previous_month_pending!.extra_days_count > 0"> + </span>
                      <span *ngIf="!stu.previous_month_pending!.extra_paid && stu.previous_month_pending!.extra_days_count > 0">
                        {{ stu.previous_month_pending!.extra_days_count }} extra ({{ stu.previous_month_pending!.extra_days_total | currency:'EUR':'symbol':'1.2-2' }})
                      </span>
                    </div>
                    <button
                      (click)="openSettleModal(stu, stu.previous_month_pending!.year, stu.previous_month_pending!.month)"
                      class="inline-flex items-center px-2 py-0.5 text-[10px] font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-md transition-colors cursor-pointer"
                    >
                      💳 Salda {{ getMonthName(stu.previous_month_pending!.month) }}
                    </button>
                  </div>
                </td>

                <!-- Pacchetti Assegnati -->
                <td class="px-4 py-3.5">
                  <div class="flex flex-wrap items-center gap-1.5">
                    <div
                      *ngFor="let pkg of stu.assigned_packages"
                      class="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200"
                    >
                      <span class="font-semibold">{{ pkg.package_name }}</span>
                      <span class="text-[10px] font-bold text-emerald-700">({{ pkg.amount_paid | currency:'EUR':'symbol':'1.2-2' }})</span>
                      <button
                        (click)="removePackage(pkg.id)"
                        class="text-rose-500 hover:text-rose-700 font-bold text-xs cursor-pointer ml-1"
                        title="Rimuovi pacchetto"
                      >
                        ✕
                      </button>
                    </div>

                    <button
                      (click)="openAssignModal(stu)"
                      class="inline-flex items-center px-2.5 py-1.5 text-xs font-semibold text-emerald-700 bg-white hover:bg-emerald-50 border border-dashed border-emerald-400 rounded-xl transition-colors cursor-pointer"
                      title="Assegna un nuovo pacchetto per questo mese"
                    >
                      + Pacchetto
                    </button>
                  </div>
                </td>

                <!-- Presenze / Copertura -->
                <td class="px-4 py-3.5 text-center">
                  <div class="text-xs font-semibold text-slate-700">
                    <span class="text-slate-900 font-bold text-sm">{{ stu.days_present }}</span> / {{ stu.total_covered_days }} gg
                  </div>
                  <div *ngIf="stu.days_present > stu.total_covered_days" class="text-[10px] text-rose-600 font-bold">
                    +{{ stu.days_present - stu.total_covered_days }} gg eccedenti
                  </div>
                </td>

                <!-- Extra (Una Tantum) -->
                <td class="px-4 py-3.5 text-center">
                  <div *ngIf="stu.extra_days_count === 0" class="text-xs text-slate-400">
                    Nessun extra
                  </div>
                  <div *ngIf="stu.extra_days_count > 0" class="space-y-0.5">
                    <div class="font-bold text-xs text-amber-700">
                      {{ stu.extra_days_total | currency:'EUR':'symbol':'1.2-2' }}
                    </div>
                    <div class="text-[10px] text-slate-500">
                      ({{ stu.extra_days_count }} × {{ stu.extra_days_unit_fee | currency:'EUR':'symbol':'1.2-2' }})
                    </div>
                    <div>
                      <span *ngIf="stu.extra_paid" class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800">
                        Saldato
                      </span>
                      <span *ngIf="!stu.extra_paid" class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800">
                        Da saldare
                      </span>
                    </div>
                  </div>
                </td>

                <!-- Pasti Consumati -->
                <td class="px-4 py-3.5 text-center">
                  <div *ngIf="stu.meals_count === 0" class="text-xs text-slate-400">
                    0 pasti
                  </div>
                  <div *ngIf="stu.meals_count > 0" class="space-y-0.5">
                    <div class="font-bold text-xs text-blue-700">
                      {{ stu.meals_total | currency:'EUR':'symbol':'1.2-2' }}
                    </div>
                    <div class="text-[10px] text-slate-500">
                      ({{ stu.meals_count }} × {{ stu.meal_unit_fee | currency:'EUR':'symbol':'1.2-2' }})
                    </div>
                    <div>
                      <span *ngIf="stu.meals_paid" class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800">
                        Saldato
                      </span>
                      <span *ngIf="!stu.meals_paid" class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 text-blue-800">
                        Da saldare
                      </span>
                    </div>
                  </div>
                </td>

                <!-- Totale Mese -->
                <td class="px-4 py-3.5 text-center">
                  <div class="font-black text-slate-800">
                    {{ stu.total_due_month | currency:'EUR':'symbol':'1.2-2' }}
                  </div>
                  <div *ngIf="stu.payment_method && (stu.extra_paid || stu.meals_paid)" class="mt-0.5">
                    <span class="inline-block px-2 py-0.5 text-[10px] font-semibold rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                      {{ stu.payment_method }}
                    </span>
                  </div>
                </td>

                <!-- Azioni -->
                <td class="px-4 py-3.5 text-right whitespace-nowrap">
                  <button
                    (click)="openSettleModal(stu)"
                    [disabled]="(!stu.extra_days_count && !stu.meals_count) || (stu.extra_paid && stu.meals_paid)"
                    class="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Registra saldo fine mese"
                  >
                    💳 Salda
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- MODALE ASSEGNAZIONE PACCHETTO -->
      <div *ngIf="showAssignModal()" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in overflow-y-auto">
        <div class="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg max-h-[90dvh] overflow-y-auto p-6 space-y-5 my-4">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 class="text-base font-bold text-slate-800">
              ➕ Assegna Pacchetto a:
              <span class="text-emerald-700">{{ selectedStudent()?.last_name }} {{ selectedStudent()?.first_name }}</span>
            </h3>
            <button (click)="closeAssignModal()" class="min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-slate-400 hover:text-slate-600 font-bold text-lg">✕</button>
          </div>

          <!-- Avviso Pendenze Mese Precedente nel Modale -->
          <div *ngIf="selectedStudent()?.previous_month_pending?.has_pending" class="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs space-y-2">
            <div class="flex items-center justify-between gap-2">
              <div class="font-bold">
                ⚠️ Pendenza {{ getMonthName(selectedStudent()!.previous_month_pending!.month) }} {{ selectedStudent()!.previous_month_pending!.year }}:
                <span class="text-rose-700">{{ selectedStudent()!.previous_month_pending!.total_pending | currency:'EUR':'symbol':'1.2-2' }}</span>
              </div>
              <button
                type="button"
                (click)="openSettleModal(selectedStudent()!, selectedStudent()!.previous_month_pending!.year, selectedStudent()!.previous_month_pending!.month)"
                class="min-h-[44px] px-3 py-2 text-[11px] font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors cursor-pointer shrink-0"
              >
                💳 Salda {{ getMonthName(selectedStudent()!.previous_month_pending!.month) }}
              </button>
            </div>
            <div class="text-[11px] text-amber-800">
              Risultano ancora da saldare:
              <strong *ngIf="!selectedStudent()!.previous_month_pending!.meals_paid && selectedStudent()!.previous_month_pending!.meals_count > 0">
                {{ selectedStudent()!.previous_month_pending!.meals_count }} pasti ({{ selectedStudent()!.previous_month_pending!.meals_total | currency:'EUR':'symbol':'1.2-2' }})
              </strong>
              <span *ngIf="!selectedStudent()!.previous_month_pending!.meals_paid && selectedStudent()!.previous_month_pending!.meals_count > 0 && !selectedStudent()!.previous_month_pending!.extra_paid && selectedStudent()!.previous_month_pending!.extra_days_count > 0"> e </span>
              <strong *ngIf="!selectedStudent()!.previous_month_pending!.extra_paid && selectedStudent()!.previous_month_pending!.extra_days_count > 0">
                {{ selectedStudent()!.previous_month_pending!.extra_days_count }} ingressi extra ({{ selectedStudent()!.previous_month_pending!.extra_days_total | currency:'EUR':'symbol':'1.2-2' }})
              </strong>.
            </div>
          </div>

          <div class="space-y-4">
            <!-- Selezione Pacchetto -->
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">
                Seleziona Pacchetto Doposcuola *
              </label>
              <select
                [(ngModel)]="selectedPackageId"
                class="w-full min-h-[44px] px-3 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500"
              >
                <option value="" disabled>-- Seleziona un pacchetto --</option>
                <option *ngFor="let p of availablePackages()" [value]="p.id">
                  {{ p.name }} ({{ p.monthly_days }} gg) - {{ (p.current_price !== null && p.current_price !== undefined) ? (p.current_price | currency:'EUR':'symbol':'1.2-2') : 'Tariffa non impostata' }}
                </option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">
                Note Opzionali
              </label>
              <input
                type="text"
                [(ngModel)]="assignNotes"
                placeholder="es. Assegnazione concordata con genitore"
                class="w-full min-h-[44px] px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div class="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              (click)="closeAssignModal()"
              class="min-h-[44px] px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Annulla
            </button>
            <button
              (click)="submitAssignPackage()"
              [disabled]="!selectedPackageId || isSubmitting()"
              class="min-h-[44px] px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              {{ isSubmitting() ? 'Salvataggio...' : 'Conferma & Registra' }}
            </button>
          </div>
        </div>
      </div>

      <!-- MODALE SALDO FINE MESE EXTRA / PASTI -->
      <div *ngIf="showSettleModal()" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
        <div class="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md max-h-[90dvh] overflow-y-auto p-6 space-y-5">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 class="text-base font-bold text-slate-800">
                💳 Salda {{ getMonthName(settleTargetMonth) }} {{ settleTargetYear }}:
                <span class="text-emerald-700">{{ selectedStudent()?.last_name }} {{ selectedStudent()?.first_name }}</span>
              </h3>
            </div>
            <button (click)="closeSettleModal()" class="min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-slate-400 hover:text-slate-600 font-bold text-lg">✕</button>
          </div>

          <div class="space-y-4">
            <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
              <label class="flex items-center space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  [(ngModel)]="settleExtraCheck"
                  [disabled]="settleExtraPaid || settleExtraDaysCount === 0"
                  class="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <div>
                  <span class="font-bold text-slate-800">Salda Extra Giorni ({{ settleExtraDaysCount }}):</span>
                  <span class="ml-1 text-amber-700 font-semibold">{{ settleExtraDaysTotal | currency:'EUR':'symbol':'1.2-2' }}</span>
                  <span *ngIf="settleExtraPaid" class="ml-2 text-emerald-600 font-semibold">(Già saldato)</span>
                </div>
              </label>

              <label class="flex items-center space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  [(ngModel)]="settleMealsCheck"
                  [disabled]="settleMealsPaid || settleMealsCount === 0"
                  class="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <div>
                  <span class="font-bold text-slate-800">Salda Pasti Cumulativi ({{ settleMealsCount }}):</span>
                  <span class="ml-1 text-blue-700 font-semibold">{{ settleMealsTotal | currency:'EUR':'symbol':'1.2-2' }}</span>
                  <span *ngIf="settleMealsPaid" class="ml-2 text-emerald-600 font-semibold">(Già saldato)</span>
                </div>
              </label>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">
                Metodo di Pagamento *
              </label>
              <select
                [(ngModel)]="settlePaymentMethod"
                class="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="Bonifico">Bonifico Bancario</option>
                <option value="Contanti">Contanti</option>
                <option value="POS / Carta">POS / Carta</option>
                <option value="RID / SDD">RID / Addebito Diretto</option>
                <option value="Altro">Altro</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">
                Note Saldo
              </label>
              <input
                type="text"
                [(ngModel)]="settleNotes"
                placeholder="es. Riferimento ricevuta o transazione"
                class="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div class="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              (click)="closeSettleModal()"
              class="min-h-[44px] px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Annulla
            </button>
            <button
              (click)="submitSettlePayments()"
              [disabled]="(!settleExtraCheck && !settleMealsCheck) || isSubmitting()"
              class="min-h-[44px] px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              {{ isSubmitting() ? 'Registrazione...' : 'Registra Saldo' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class PaymentsDashboardComponent implements OnInit {
  private api = inject(ApiService);

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

  billingData = signal<MonthlyBillingSummary | null>(null);
  availablePackages = signal<AfterschoolPackage[]>([]);
  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  searchQuery = '';

  alertMessage = signal<string | null>(null);
  alertType = signal<'success' | 'error'>('success');

  // Modale Assegnazione
  showAssignModal = signal<boolean>(false);
  selectedStudent = signal<StudentMonthlyBilling | null>(null);
  selectedPackageId = '';
  assignNotes = '';

  // Modale Saldo
  showSettleModal = signal<boolean>(false);
  settleTargetYear = new Date().getFullYear();
  settleTargetMonth = new Date().getMonth() + 1;
  settleExtraDaysCount = 0;
  settleExtraDaysTotal = 0;
  settleExtraPaid = false;
  settleMealsCount = 0;
  settleMealsTotal = 0;
  settleMealsPaid = false;
  settleExtraCheck = false;
  settleMealsCheck = false;
  settlePaymentMethod = 'Bonifico';
  settleNotes = '';

  ngOnInit(): void {
    this.loadPackagesCatalog();
    this.loadBilling();
  }

  getMonthName(month: number): string {
    return this.monthsList.find(m => m.value === Number(month))?.name || '';
  }

  loadPackagesCatalog(): void {
    this.api.getAfterschoolPackages().subscribe({
      next: (pkgs) => this.availablePackages.set(pkgs.filter(p => p.is_active)),
      error: (err) => console.error('Errore caricamento catalogo pacchetti:', err)
    });
  }

  loadBilling(): void {
    this.isLoading.set(true);
    this.api.getMonthlyBilling(Number(this.selectedYear), Number(this.selectedMonth)).subscribe({
      next: (summary) => {
        this.billingData.set(summary);
        const currentSelected = this.selectedStudent();
        if (currentSelected) {
          const updated = summary.students.find(s => s.student_id === currentSelected.student_id);
          if (updated) this.selectedStudent.set(updated);
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        this.showAlert(err.error?.error || 'Errore nel caricamento del prospetto pagamenti', 'error');
        this.isLoading.set(false);
      }
    });
  }

  previousMonth(): void {
    if (Number(this.selectedMonth) === 1) {
      this.selectedMonth = 12;
      this.selectedYear = Number(this.selectedYear) - 1;
    } else {
      this.selectedMonth = Number(this.selectedMonth) - 1;
    }
    this.loadBilling();
  }

  nextMonth(): void {
    if (Number(this.selectedMonth) === 12) {
      this.selectedMonth = 1;
      this.selectedYear = Number(this.selectedYear) + 1;
    } else {
      this.selectedMonth = Number(this.selectedMonth) + 1;
    }
    this.loadBilling();
  }

  filteredStudents(): StudentMonthlyBilling[] {
    const list = this.billingData()?.students || [];
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) return list;
    return list.filter(s =>
      s.first_name.toLowerCase().includes(q) ||
      s.last_name.toLowerCase().includes(q) ||
      (s.school && s.school.toLowerCase().includes(q))
    );
  }

  showAlert(msg: string, type: 'success' | 'error'): void {
    this.alertMessage.set(msg);
    this.alertType.set(type);
    setTimeout(() => {
      if (this.alertMessage() === msg) {
        this.alertMessage.set(null);
      }
    }, 4000);
  }

  // Assegnazione Pacchetto
  openAssignModal(stu: StudentMonthlyBilling): void {
    this.selectedStudent.set(stu);
    this.selectedPackageId = '';
    this.assignNotes = '';
    this.showAssignModal.set(true);
  }

  closeAssignModal(): void {
    this.showAssignModal.set(false);
    if (!this.showSettleModal()) {
      this.selectedStudent.set(null);
    }
  }

  submitAssignPackage(): void {
    const stu = this.selectedStudent();
    if (!stu || !this.selectedPackageId) return;

    this.isSubmitting.set(true);
    this.api.assignTariffToStudent({
      student_id: stu.student_id,
      year: Number(this.selectedYear),
      month: Number(this.selectedMonth),
      package_id: this.selectedPackageId,
      notes: this.assignNotes.trim() || null
    }).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeAssignModal();
        this.showAlert('Pacchetto assegnato con successo', 'success');
        this.loadBilling();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.showAlert(err.error?.error || 'Errore durante l\'assegnazione del pacchetto', 'error');
      }
    });
  }

  removePackage(assignmentId: string): void {
    if (!confirm('Sei sicuro di voler rimuovere questa tariffa assegnata?')) return;

    this.api.removeStudentTariff(assignmentId).subscribe({
      next: () => {
        this.showAlert('Pacchetto rimosso', 'success');
        this.loadBilling();
      },
      error: (err) => {
        this.showAlert(err.error?.error || 'Errore nella rimozione', 'error');
      }
    });
  }

  // Saldo
  openSettleModal(stu: StudentMonthlyBilling, targetYear?: number, targetMonth?: number): void {
    this.selectedStudent.set(stu);
    const y = targetYear ?? Number(this.selectedYear);
    const m = targetMonth ?? Number(this.selectedMonth);
    this.settleTargetYear = y;
    this.settleTargetMonth = m;

    const prev = stu.previous_month_pending;
    const isPrev = !!(prev && prev.year === y && prev.month === m);

    if (isPrev && prev) {
      this.settleExtraDaysCount = prev.extra_days_count;
      this.settleExtraDaysTotal = prev.extra_days_total;
      this.settleExtraPaid = prev.extra_paid;
      this.settleMealsCount = prev.meals_count;
      this.settleMealsTotal = prev.meals_total;
      this.settleMealsPaid = prev.meals_paid;
      this.settleExtraCheck = !prev.extra_paid && prev.extra_days_count > 0;
      this.settleMealsCheck = !prev.meals_paid && prev.meals_count > 0;
      this.settlePaymentMethod = 'Bonifico';
      this.settleNotes = '';
    } else {
      this.settleExtraDaysCount = stu.extra_days_count;
      this.settleExtraDaysTotal = stu.extra_days_total;
      this.settleExtraPaid = stu.extra_paid;
      this.settleMealsCount = stu.meals_count;
      this.settleMealsTotal = stu.meals_total;
      this.settleMealsPaid = stu.meals_paid;
      this.settleExtraCheck = !stu.extra_paid && stu.extra_days_count > 0;
      this.settleMealsCheck = !stu.meals_paid && stu.meals_count > 0;
      this.settlePaymentMethod = stu.payment_method || 'Bonifico';
      this.settleNotes = stu.notes || '';
    }
    this.showSettleModal.set(true);
  }

  closeSettleModal(): void {
    this.showSettleModal.set(false);
    if (!this.showAssignModal()) {
      this.selectedStudent.set(null);
    }
  }

  submitSettlePayments(): void {
    const stu = this.selectedStudent();
    if (!stu) return;

    this.isSubmitting.set(true);
    this.api.settleMonthlyPayments({
      student_id: stu.student_id,
      year: this.settleTargetYear,
      month: this.settleTargetMonth,
      settle_extra: this.settleExtraCheck,
      settle_meals: this.settleMealsCheck,
      payment_method: this.settlePaymentMethod,
      notes: this.settleNotes.trim() || null
    }).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeSettleModal();
        this.showAlert('Saldo registrato con successo', 'success');
        this.loadBilling();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.showAlert(err.error?.error || 'Errore durante la registrazione del saldo', 'error');
      }
    });
  }
}
