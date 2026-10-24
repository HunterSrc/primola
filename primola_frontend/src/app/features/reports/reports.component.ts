import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ProjectReportData, OperationalMonthlyReport, OperationalAfterschoolTeacher } from '../../core/models';
import { AppDatePipe } from '../../shared/pipes/app-date.pipe';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, AppDatePipe],
  template: `
    <div class="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">

      <!-- Header & Tab Navigation -->
      <div class="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center space-x-2">
            <h1 class="text-xl sm:text-2xl font-bold text-slate-800">Rendicontazione & Report</h1>
            <span class="text-[10px] sm:text-xs bg-indigo-500/10 text-indigo-700 font-bold px-2.5 py-0.5 rounded-full border border-indigo-500/20">
              ADMIN & OFFICE
            </span>
          </div>
          <p class="text-xs sm:text-sm text-slate-500">Pasti consumati per alunno, costi teacher doposcuola e corsi terminati nel mese</p>
        </div>

        <div class="flex items-center space-x-1.5 sm:space-x-2 bg-slate-100 p-1 sm:p-1.5 rounded-xl border border-slate-200 overflow-x-auto w-full md:w-auto">
          <button
            type="button"
            (click)="activeTab.set('OPERATIONAL')"
            [class.bg-white]="activeTab() === 'OPERATIONAL'"
            [class.shadow-sm]="activeTab() === 'OPERATIONAL'"
            [class.text-indigo-700]="activeTab() === 'OPERATIONAL'"
            [class.font-bold]="activeTab() === 'OPERATIONAL'"
            class="flex-1 md:flex-initial px-3.5 sm:px-4 py-2 text-xs md:text-sm rounded-lg text-slate-600 transition-all cursor-pointer whitespace-nowrap text-center"
          >
            Rendicontazione Mensile
          </button>

          <button
            type="button"
            (click)="activeTab.set('PROJECTS')"
            [class.bg-white]="activeTab() === 'PROJECTS'"
            [class.shadow-sm]="activeTab() === 'PROJECTS'"
            [class.text-indigo-700]="activeTab() === 'PROJECTS'"
            [class.font-bold]="activeTab() === 'PROJECTS'"
            class="flex-1 md:flex-initial px-3.5 sm:px-4 py-2 text-xs md:text-sm rounded-lg text-slate-600 transition-all cursor-pointer whitespace-nowrap text-center"
          >
            Riepilogo Generale Commesse
          </button>
        </div>
      </div>

      <!-- TAB 1: RENDICONTAZIONE MENSILE OPERATIVA (ADMIN + OFFICE) -->
      @if (activeTab() === 'OPERATIONAL') {
        <div class="space-y-6">

          <!-- Barra Mese e Anno -->
          <div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 class="text-sm sm:text-base font-bold text-slate-800">Seleziona Mese di Rendicontazione</h2>
              <p class="text-xs text-slate-500">Visualizza pasti per studente e compensi docenti maturati</p>
            </div>

            <div class="flex items-center space-x-2.5 w-full sm:w-auto">
              <select
                [(ngModel)]="selectedMonth"
                (ngModelChange)="loadOperationalReport()"
                class="flex-1 sm:flex-initial px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                @for (m of monthsList; track m.value) {
                  <option [value]="m.value">{{ m.name }}</option>
                }
              </select>

              <select
                [(ngModel)]="selectedYear"
                (ngModelChange)="loadOperationalReport()"
                class="flex-1 sm:flex-initial px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                @for (y of yearsList; track y) {
                  <option [value]="y">{{ y }}</option>
                }
              </select>

              <button
                type="button"
                (click)="loadOperationalReport()"
                class="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-colors"
              >
                Aggiorna
              </button>
            </div>
          </div>

          @if (loadingOperational()) {
            <div class="bg-white p-12 rounded-2xl text-center text-slate-400 border border-slate-200/80">
              Caricamento rendicontazione operativa mensile...
            </div>
          } @else if (operationalData(); as op) {

            <!-- KPI Cards Rendicontazione -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs border-l-4 border-l-amber-500">
                <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Pasti Erogati Mese</span>
                <p class="text-2xl sm:text-3xl font-extrabold text-amber-600 mt-1">
                  {{ totalMealsCount() }} pasti
                </p>
                <p class="text-[11px] text-slate-400 mt-0.5">
                  Consumati da {{ op.students_meals.length }} alunni iscritti
                </p>
              </div>

              <div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs border-l-4 border-l-indigo-500">
                <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Costo Teacher Doposcuola</span>
                <p class="text-2xl sm:text-3xl font-extrabold text-indigo-700 mt-1">
                  € {{ op.afterschool_teachers.summary.total_cost | number:'1.2-2' }}
                </p>
                <p class="text-[11px] text-slate-400 mt-0.5">
                  {{ op.afterschool_teachers.summary.total_hours }} ore turni • {{ op.afterschool_teachers.summary.total_teachers }} docenti
                </p>
              </div>

              <div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs border-l-4 border-l-emerald-500">
                <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Costo Teacher Corsi Terminati</span>
                <p class="text-2xl sm:text-3xl font-extrabold text-emerald-600 mt-1">
                  € {{ op.finished_courses_teachers.summary.total_cost | number:'1.2-2' }}
                </p>
                <p class="text-[11px] text-slate-400 mt-0.5">
                  {{ op.finished_courses_teachers.summary.total_courses }} corsi conclusi nel mese
                </p>
              </div>
            </div>

            <!-- SEZIONE 1: PASTI CONSUMATI PER ALUNNO -->
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden space-y-3 p-4 sm:p-6">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div class="flex items-center space-x-2">
                  <span class="w-3 h-3 rounded-full bg-amber-500"></span>
                  <h3 class="font-bold text-base sm:text-lg text-slate-800">
                    Pasti Consumati per Alunno ({{ filteredStudentMeals().length }})
                  </h3>
                </div>

                <input
                  type="text"
                  [(ngModel)]="searchStudentQuery"
                  placeholder="Cerca alunno o scuola..."
                  class="px-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-64"
                />
              </div>

              <div class="overflow-x-auto border border-slate-200 rounded-xl">
                <table class="w-full text-left border-collapse text-xs sm:text-sm min-w-[500px]">
                  <thead>
                    <tr class="bg-slate-50 text-slate-600 font-semibold uppercase text-[11px] border-b border-slate-200">
                      <th class="py-3 px-4">Alunno</th>
                      <th class="py-3 px-4">Scuola</th>
                      <th class="py-3 px-4 text-center">Presenze Svolte</th>
                      <th class="py-3 px-4 text-center">Spettanza Sett.</th>
                      <th class="py-3 px-4 text-center">Previsti Mese</th>
                      <th class="py-3 px-4 text-center">Pasti Consumati</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    @for (s of filteredStudentMeals(); track s.student_id) {
                      <tr class="hover:bg-slate-50/60 transition-colors">
                        <td class="py-3 px-4 font-semibold text-slate-800">{{ s.last_name }} {{ s.first_name }}</td>
                        <td class="py-3 px-4 text-slate-500 text-xs">{{ s.school || 'Non specificata' }}</td>
                        <td class="py-3 px-4 text-center text-slate-700 font-medium">{{ s.days_present }} gg</td>
                        <td class="py-3 px-4 text-center text-slate-500">{{ s.weekly_meals }} / sett.</td>
                        <td class="py-3 px-4 text-center text-indigo-700 font-semibold">{{ s.expected_meals }}</td>
                        <td class="py-3 px-4 text-center">
                          <span
                            class="inline-block px-3 py-1 rounded-full text-xs font-bold"
                            [class.bg-amber-100]="s.meals_consumed > 0"
                            [class.text-amber-800]="s.meals_consumed > 0"
                            [class.bg-slate-100]="s.meals_consumed === 0"
                            [class.text-slate-400]="s.meals_consumed === 0"
                          >
                            🍽️ {{ s.meals_consumed }} pasti
                          </span>
                        </td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="6" class="py-8 text-center text-slate-400">Nessun alunno trovato.</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>

            <!-- SEZIONE 2: COSTO PER TEACHER DOPO SCUOLA -->
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

                      <!-- Righe espanse con dettaglio turni -->
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

            <!-- SEZIONE 3: COSTO PER TEACHER CORSI TERMINATI -->
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

                  <!-- Docenti del corso concluso -->
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

      <!-- TAB 2: RIEPILOGO GENERALE COMMESSE (ESISTENTE) -->
      @if (activeTab() === 'PROJECTS') {
        <div class="space-y-6">
          <div class="flex justify-end">
            <button
              type="button"
              (click)="loadProjectsReport()"
              class="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-xl shadow-xs"
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
export class ReportsComponent implements OnInit {
  private apiService = inject(ApiService);
  authService = inject(AuthService);

  readonly activeTab = signal<'OPERATIONAL' | 'PROJECTS'>('OPERATIONAL');

  // Operational Monthly Report
  operationalData = signal<OperationalMonthlyReport | null>(null);
  loadingOperational = signal<boolean>(true);

  selectedYear = new Date().getFullYear();
  selectedMonth = new Date().getMonth() + 1;
  searchStudentQuery = '';
  expandedTeacherShifts = signal<Set<string>>(new Set<string>());

  // Projects Report
  reportData = signal<ProjectReportData | null>(null);
  loadingProjects = signal<boolean>(false);

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
    this.loadOperationalReport();
    this.loadProjectsReport();
  }

  loadOperationalReport(): void {
    this.loadingOperational.set(true);
    this.apiService.getOperationalMonthlyReport(Number(this.selectedYear), Number(this.selectedMonth)).subscribe({
      next: (data) => {
        this.operationalData.set(data);
        this.loadingOperational.set(false);
      },
      error: (err) => {
        console.error('Errore caricamento report operativo mensile:', err);
        this.loadingOperational.set(false);
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
        console.error('Errore nel caricamento report commesse:', err);
        this.loadingProjects.set(false);
      }
    });
  }

  filteredStudentMeals() {
    const list = this.operationalData()?.students_meals || [];
    const q = this.searchStudentQuery.toLowerCase().trim();
    if (!q) return list;
    return list.filter(s =>
      s.first_name.toLowerCase().includes(q) ||
      s.last_name.toLowerCase().includes(q) ||
      s.school.toLowerCase().includes(q)
    );
  }

  totalMealsCount(): number {
    const list = this.operationalData()?.students_meals || [];
    return list.reduce((acc, s) => acc + (s.meals_consumed || 0), 0);
  }

  toggleTeacherShifts(userId: string): void {
    const current = new Set(this.expandedTeacherShifts());
    if (current.has(userId)) {
      current.delete(userId);
    } else {
      current.add(userId);
    }
    this.expandedTeacherShifts.set(current);
  }

  isShiftsExpanded(userId: string): boolean {
    return this.expandedTeacherShifts().has(userId);
  }
}
