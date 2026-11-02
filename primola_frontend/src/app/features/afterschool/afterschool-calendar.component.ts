import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { AfterschoolWeekSchedule, AfterschoolWeekDay, TeacherShift, User, ClosureDay, Student, AfterschoolStudentScheduleItem } from '../../core/models';
import { getItalianHoliday, ItalianHoliday } from '../../core/utils/holidays.util';

@Component({
  selector: 'app-afterschool-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-3 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      
      <!-- Header Banner & Week Navigation -->
      <div class="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shadow-inner shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 sm:w-7 sm:h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h1 class="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Calendario Doposcuola</h1>
                <span class="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  Settimanale (Lun - Ven)
                </span>
              </div>
              <p class="text-xs sm:text-sm font-semibold text-slate-500 mt-0.5">
                Pianificazione orari presenze docenti & monitoraggio bambini e servizio mensa
              </p>
            </div>
          </div>
        </div>

        <!-- Week Navigator Controls & Admin Actions -->
        <div class="flex items-center gap-2 self-start md:self-auto w-full md:w-auto justify-between md:justify-end flex-wrap">
          <div class="flex items-center bg-slate-100/80 p-1 rounded-2xl border border-slate-200">
            <button
              (click)="previousWeek()"
              [disabled]="loading()"
              title="Settimana Precedente"
              class="p-2 hover:bg-white text-slate-700 hover:text-slate-900 rounded-xl transition-all shadow-none hover:shadow-xs disabled:opacity-40"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              (click)="currentWeek()"
              [disabled]="loading()"
              class="px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-white rounded-xl transition-all shadow-none hover:shadow-xs"
            >
              Questa Settimana
            </button>
            <button
              (click)="nextWeek()"
              [disabled]="loading()"
              title="Settimana Successiva"
              class="p-2 hover:bg-white text-slate-700 hover:text-slate-900 rounded-xl transition-all shadow-none hover:shadow-xs disabled:opacity-40"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <!-- Gestione Chiusure (Solo ADMIN) -->
          @if (isAdmin()) {
            <button
              (click)="openClosuresModal()"
              title="Gestione date di chiusura straordinarie"
              class="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs sm:text-sm font-bold rounded-xl sm:rounded-2xl border border-rose-200/80 shadow-2xs flex items-center space-x-1.5 transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              <span>Chiusure</span>
            </button>
          }

          @if (canEdit()) {
            <button
              (click)="openShiftModal()"
              class="px-3.5 py-2 sm:px-4 sm:py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-bold rounded-xl sm:rounded-2xl shadow-sm hover:shadow flex items-center space-x-1.5 transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
              </svg>
              <span>Nuovo Turno</span>
            </button>
          }
        </div>
      </div>

      <!-- Date Range Label & Status Info + Legenda -->
      <div class="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-slate-600">
        <div class="flex items-center gap-2">
          <span class="font-bold text-slate-800 text-sm sm:text-base capitalize">
            {{ formatWeekInterval() }}
          </span>
          @if (loading()) {
            <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">
              <svg class="animate-spin h-3 w-3 text-amber-600" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              Caricamento...
            </span>
          }
        </div>

        <div class="flex flex-wrap items-center gap-3 text-[11px]">
          <!-- Legenda Turni e Giorni -->
          <div class="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 flex-wrap">
            <span class="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Legenda:</span>
            <span class="inline-flex items-center gap-1.5 font-bold text-indigo-900">
              <span class="w-3 h-3 rounded-md bg-indigo-500 ring-2 ring-indigo-300"></span>
              I miei turni
            </span>
            <span class="inline-flex items-center gap-1.5 font-bold text-amber-900">
              <span class="w-3 h-3 rounded-md bg-amber-400"></span>
              Altri docenti
            </span>
            <span class="inline-flex items-center gap-1.5 font-bold text-amber-700">
              <span class="w-2.5 h-3.5 rounded-l bg-amber-500 border-l-2 border-amber-600"></span>
              Oggi
            </span>
            <span class="inline-flex items-center gap-1.5 font-bold text-rose-800">
              <span class="w-3 h-3 rounded-md bg-rose-200 border border-rose-400"></span>
              Festivo / Chiuso
            </span>
          </div>

          @if (canEdit()) {
            <span class="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200 font-semibold">
              ✓ Amministrazione attiva (Office / Admin)
            </span>
          } @else {
            <span class="text-blue-700 bg-blue-50 px-2.5 py-1 rounded-xl border border-blue-200 font-semibold">
              ℹ Modalità consultazione (Docente)
            </span>
          }
        </div>
      </div>

      <!-- Error Toast -->
      @if (errorMessage()) {
        <div class="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs sm:text-sm font-semibold flex items-center justify-between">
          <span>{{ errorMessage() }}</span>
          <button (click)="errorMessage.set(null)" class="text-rose-500 hover:text-rose-700 font-bold">&times;</button>
        </div>
      }

      <!-- 5-Day Weekly Grid (Lunedì - Venerdì) -->
      <div class="grid grid-cols-1 md:grid-cols-5 gap-3.5 sm:gap-4 items-start">
        @for (day of schedule()?.days || []; track day.date) {
          @let holiday = getHolidayInfo(day.date);
          @let isClosure = !!day.closure;
          @let isToday = isDayToday(day.date);

          <div 
            class="bg-white rounded-2xl sm:rounded-3xl border transition-all duration-300 overflow-hidden flex flex-col relative"
            [ngClass]="{
              'border-amber-400 ring-2 ring-amber-400/40 shadow-xl shadow-amber-500/15 border-l-[6px] border-l-amber-500': isToday,
              'border-rose-300/80 bg-rose-50/20 shadow-2xs': !isToday && (holiday || isClosure),
              'border-slate-200/90 shadow-2xs hover:shadow-xs': !isToday && !holiday && !isClosure
            }"
          >
            <!-- Day Column Header -->
            <div 
              class="p-3.5 sm:p-4 border-b transition-colors relative"
              [ngClass]="{
                'bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-transparent border-amber-200': isToday,
                'bg-rose-50/70 border-rose-200/70': !isToday && (holiday || isClosure),
                'bg-slate-50/80 border-slate-100': !isToday && !holiday && !isClosure
              }"
            >
              <div class="flex items-center justify-between">
                <span 
                  class="text-xs font-extrabold uppercase tracking-wider"
                  [ngClass]="isToday ? 'text-amber-900 font-black' : (holiday || isClosure ? 'text-rose-700' : 'text-slate-700')"
                >
                  {{ day.day_name }}
                </span>

                <!-- Badge Giorno: Oggi oppure Festivo/Chiusura -->
                @if (isToday) {
                  <span class="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500 text-white shadow-xs tracking-wider animate-pulse">
                    Oggi
                  </span>
                } @else if (holiday) {
                  <span class="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
                    Festivo
                  </span>
                } @else if (isClosure) {
                  <span class="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-rose-600 text-white shadow-2xs">
                    Chiusura
                  </span>
                }
              </div>

              <div class="text-base sm:text-lg font-black text-slate-900 mt-0.5">
                {{ formatDayDate(day.date) }}
              </div>

              <!-- Banner Festività o Chiusura Straordinaria -->
              @if (holiday || isClosure) {
                <div class="mt-2 p-1.5 rounded-xl bg-rose-100/80 border border-rose-300 text-rose-900 text-[11px] font-bold flex items-center justify-between gap-1">
                  <div class="flex items-center gap-1 truncate">
                    <span>{{ holiday ? '🎉' : '🚫' }}</span>
                    <span class="truncate" [title]="holiday ? holiday.name : (day.closure?.title || 'Chiusura')">
                      {{ holiday ? holiday.name : (day.closure?.title || 'Chiusura doposcuola') }}
                    </span>
                  </div>
                  @if (isClosure && isAdmin()) {
                    <button
                      (click)="confirmDeleteClosure(day.closure!.id, day.closure!.title)"
                      title="Rimuovi chiusura"
                      class="text-rose-500 hover:text-rose-800 text-xs px-1 font-bold"
                    >
                      &times;
                    </button>
                  }
                </div>
              }

              <!-- Mini Stats (Bambini e Totale Pasti Mensa) -->
              <div class="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/60 text-[11px] font-semibold text-slate-500 gap-1.5">
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200 font-bold text-[10px]">
                  🎒 Bambini: {{ day.expected_students_count }}
                </span>
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100/90 text-amber-900 border border-amber-300 font-bold text-[10px]">
                  🍽️ Mensa: {{ day.meals_count }}
                </span>
              </div>
            </div>

            <!-- Content Area: Teachers Shifts & Students List -->
            <div class="p-3 sm:p-3.5 space-y-4 flex-1 flex flex-col">
              
              <!-- 1. Turni Docenti -->
              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <h4 class="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Turni Docenti
                  </h4>
                  @if (canEdit()) {
                    <button
                      (click)="openShiftModal(day.date)"
                      title="Aggiungi turno per questo giorno"
                      class="text-amber-600 hover:text-amber-700 hover:bg-amber-50 px-2 py-0.5 rounded-lg text-xs font-bold transition-colors"
                    >
                      + Turno
                    </button>
                  }
                </div>

                @if (day.shifts.length === 0) {
                  <div 
                    class="p-3 rounded-xl text-center text-xs font-medium border border-dashed"
                    [ngClass]="holiday || isClosure ? 'bg-rose-50/50 text-rose-600 border-rose-200' : 'bg-slate-50/80 text-slate-400 border-slate-200'"
                  >
                    {{ holiday || isClosure ? 'Doposcuola chiuso / nessun turno' : 'Nessun docente programmato' }}
                  </div>
                } @else {
                  <div class="space-y-2.5">
                    @for (shift of day.shifts; track shift.id) {
                      <div 
                        class="p-3 rounded-2xl border transition-all relative group shadow-2xs hover:shadow-xs"
                        [ngClass]="{
                          'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-500/20 shadow-indigo-100': isMyShift(shift),
                          'bg-white border-slate-200/90 hover:border-amber-400': !isMyShift(shift)
                        }"
                      >
                        <div class="flex items-start justify-between gap-1.5">
                          <div class="min-w-0 flex-1">
                            <!-- Header Card Turno: Nome Docente + Badge "Io" se applicabile -->
                            <div class="flex items-center gap-1.5 flex-wrap">
                              <span 
                                class="font-extrabold text-sm tracking-tight leading-snug truncate"
                                [ngClass]="isMyShift(shift) ? 'text-indigo-950 font-black' : 'text-slate-900'"
                              >
                                {{ shift.last_name }} {{ shift.first_name }}
                              </span>
                              @if (isMyShift(shift)) {
                                <span class="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-indigo-600 text-white shadow-2xs">
                                  Io
                                </span>
                              }
                            </div>

                            <!-- Orario Turno In Risalto su Un'Unica Riga -->
                            <div class="mt-2">
                              <span 
                                class="inline-flex items-center gap-1.5 text-xs sm:text-sm font-black whitespace-nowrap px-2.5 py-1 rounded-xl border shadow-2xs"
                                [ngClass]="{
                                  'bg-indigo-600 text-white border-indigo-700': isMyShift(shift),
                                  'bg-amber-500/15 text-amber-950 border-amber-500/35': !isMyShift(shift)
                                }"
                              >
                                <svg 
                                  xmlns="http://www.w3.org/2000/svg" 
                                  class="w-4 h-4 shrink-0" 
                                  [ngClass]="isMyShift(shift) ? 'text-white' : 'text-amber-700'"
                                  fill="none" 
                                  viewBox="0 0 24 24" 
                                  stroke="currentColor"
                                >
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span class="tracking-tight whitespace-nowrap">{{ shift.start_time }} – {{ shift.end_time }}</span>
                              </span>
                            </div>

                            @if (shift.notes) {
                              <p 
                                class="text-[11px] italic mt-1.5 line-clamp-2"
                                [ngClass]="isMyShift(shift) ? 'text-indigo-700 font-medium' : 'text-slate-500'"
                              >
                                {{ shift.notes }}
                              </p>
                            }
                          </div>

                          @if (canEdit()) {
                            <div class="flex items-center space-x-0.5 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                              <button
                                (click)="editShift(shift, day.date)"
                                title="Modifica Turno"
                                class="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>

                              <button
                                (click)="confirmDeleteShift(shift)"
                                title="Elimina Turno"
                                class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          }
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>

              <!-- Divider -->
              <div class="border-t border-slate-100"></div>

              <!-- 2. Bambini Attesi Doposcuola -->
              <div class="space-y-2 flex-1 flex flex-col">
                <div class="flex items-center justify-between pb-1 border-b border-slate-100">
                  <h4 class="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Elenco Bambini Doposcuola
                  </h4>
                  @if (canManageStudents()) {
                    <button
                      type="button"
                      (click)="openAddStudentModal(day)"
                      class="px-2 py-0.5 text-[11px] font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200/80 rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
                      title="Aggiungi studente per questo giorno con presenza e diritto mensa"
                    >
                      <span class="font-extrabold">+</span> Alunno
                    </button>
                  }
                </div>

                @if (day.students.length === 0) {
                  <div class="p-3 bg-slate-50/80 rounded-xl text-center text-slate-400 text-xs font-medium border border-dashed border-slate-200">
                    Nessun bambino previsto
                  </div>
                } @else {
                  <div class="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                    @for (st of day.students; track st.student_id) {
                      <div 
                        class="p-2 rounded-xl border text-xs flex items-center justify-between transition-colors gap-2"
                        [ngClass]="{
                          'bg-emerald-50/40 border-emerald-300': st.is_present,
                          'bg-slate-50/50 border-slate-100 hover:bg-slate-100/60': !st.is_present
                        }"
                      >
                        <!-- Clickable student name/presence for Teacher and Office/Admin -->
                        <div 
                          class="min-w-0 pr-1 flex-1 select-none"
                          [class.cursor-pointer]="canTogglePresence()"
                          (click)="canTogglePresence() ? toggleStudentPresence(day, st) : null"
                          [title]="canTogglePresence() ? (st.is_present ? 'Clicca per segnare Assente' : 'Clicca per segnare Presente') : ''"
                        >
                          <div class="font-bold text-slate-800 truncate flex items-center gap-1.5 hover:text-teal-700 transition-colors">
                            <span 
                              class="w-2.5 h-2.5 rounded-full inline-block shrink-0 transition-colors"
                              [ngClass]="st.is_present ? 'bg-emerald-500 shadow-xs' : 'bg-slate-300'"
                              [title]="st.is_present ? 'Presente' : 'Non presente'"
                            ></span>
                            <span class="truncate" [class.text-emerald-950]="st.is_present">{{ st.last_name }} {{ st.first_name }}</span>
                          </div>
                          @if (st.school) {
                            <div class="text-[10px] text-slate-400 truncate pl-4">
                              {{ st.school }}
                            </div>
                          }
                        </div>

                        <!-- Badge Mensa: Cliccabile per Office/Admin, sola lettura per Teacher -->
                        <div class="shrink-0 flex items-center gap-1">
                          @if (canManageMeals()) {
                            <button
                              type="button"
                              (click)="toggleStudentMeal(day, st)"
                              [title]="st.has_meal ? 'Mensa attiva - Clicca per rimuovere' : 'Nessuna mensa - Clicca per attivare'"
                              class="inline-flex items-center gap-0.5 text-[10px] font-extrabold px-1.5 py-0.5 rounded-md border transition-all cursor-pointer"
                              [ngClass]="st.has_meal ? 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200 shadow-2xs' : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200'"
                            >
                              🍽️ {{ st.has_meal ? 'Mensa' : 'No Mensa' }}
                            </button>
                          } @else {
                            @if (st.has_meal) {
                              <span 
                                class="inline-flex items-center gap-0.5 text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300"
                                title="Diritto a pasto / Mensa registrata"
                              >
                                🍽️ Mensa
                              </span>
                            } @else {
                              <span class="text-[10px] text-slate-300" title="Nessuna mensa">
                                —
                              </span>
                            }
                          }
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>

            </div>
          </div>
        }
      </div>

      <!-- Modal Aggiungi / Modifica Turno (Solo Office/Admin) -->
      @if (showShiftModal()) {
        <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div class="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full p-5 sm:p-7 shadow-2xl border border-slate-100 space-y-4 animate-fade-in">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 class="text-lg font-extrabold text-slate-900">
                {{ editingShiftId() ? 'Modifica Turno Docente' : 'Nuovo Turno Docente' }}
              </h3>
              <button (click)="closeShiftModal()" class="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold">&times;</button>
            </div>

            @if (modalError()) {
              <div class="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
                {{ modalError() }}
              </div>
            }

            <div class="space-y-3.5 text-xs">
              <!-- Selezione Docente -->
              <div>
                <label class="block font-bold text-slate-700 mb-1">Docente / Insegnante *</label>
                <select
                  [(ngModel)]="shiftForm.user_id"
                  class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
                >
                  <option value="" disabled>Seleziona un docente...</option>
                  @for (u of teachersList(); track u.id) {
                    <option [value]="u.id">
                      {{ u.last_name || '' }} {{ u.first_name || u.name || '' }} ({{ u.email }})
                    </option>
                  }
                </select>
              </div>

              <!-- Data Turno -->
              <div>
                <label class="block font-bold text-slate-700 mb-1">Data Turno *</label>
                <input
                  type="date"
                  [(ngModel)]="shiftForm.shift_date"
                  class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
                />
              </div>

              <!-- Orario Inizio / Fine -->
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block font-bold text-slate-700 mb-1">Ora Inizio *</label>
                  <input
                    type="time"
                    [(ngModel)]="shiftForm.start_time"
                    class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
                  />
                </div>
                <div>
                  <label class="block font-bold text-slate-700 mb-1">Ora Fine *</label>
                  <input
                    type="time"
                    [(ngModel)]="shiftForm.end_time"
                    class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
                  />
                </div>
              </div>

              <!-- Note -->
              <div>
                <label class="block font-bold text-slate-700 mb-1">Note (facoltative)</label>
                <textarea
                  [(ngModel)]="shiftForm.notes"
                  rows="2"
                  placeholder="Es. Aiuto compiti gruppo medie, accoglienza..."
                  class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                ></textarea>
              </div>
            </div>

            <!-- Modal Actions -->
            <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                (click)="closeShiftModal()"
                class="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Annulla
              </button>
              <button
                type="button"
                (click)="saveShift()"
                [disabled]="modalSaving()"
                class="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-sm transition-all disabled:opacity-50"
              >
                {{ modalSaving() ? 'Salvataggio...' : (editingShiftId() ? 'Salva Modifiche' : 'Crea Turno') }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Modal Gestione Chiusure Straordinarie (Solo Admin) -->
      @if (showClosuresModal() && isAdmin()) {
        <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div class="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full p-5 sm:p-7 shadow-2xl border border-slate-100 space-y-4 animate-fade-in">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100">
              <div class="flex items-center space-x-2">
                <span class="p-2 rounded-xl bg-rose-50 text-rose-600 font-bold">🚫</span>
                <div>
                  <h3 class="text-lg font-extrabold text-slate-900">Date di Chiusura Straordinarie</h3>
                  <p class="text-xs text-slate-500">Pannello amministratore per sospensione attività doposcuola</p>
                </div>
              </div>
              <button (click)="closeClosuresModal()" class="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold">&times;</button>
            </div>

            <!-- Form Aggiunta Chiusura -->
            <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
              <h4 class="text-xs font-bold text-slate-800 uppercase tracking-wider">Aggiungi Nuova Chiusura</h4>

              @if (closureFormError()) {
                <div class="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
                  {{ closureFormError() }}
                </div>
              }

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label class="block text-[11px] font-bold text-slate-600 mb-1">Data Chiusura *</label>
                  <input
                    type="date"
                    [(ngModel)]="closureForm.date"
                    class="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label class="block text-[11px] font-bold text-slate-600 mb-1">Motivazione / Titolo *</label>
                  <input
                    type="text"
                    [(ngModel)]="closureForm.title"
                    placeholder="Es. Festa Patrono, Assemblea..."
                    class="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div>
                <label class="block text-[11px] font-bold text-slate-600 mb-1">Note (facoltative)</label>
                <input
                  type="text"
                  [(ngModel)]="closureForm.notes"
                  placeholder="Note interne o dettagli per lo staff..."
                  class="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div class="flex justify-end pt-1">
                <button
                  type="button"
                  (click)="saveClosure()"
                  [disabled]="closureSaving()"
                  class="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-all disabled:opacity-50"
                >
                  {{ closureSaving() ? 'Salvataggio...' : '+ Aggiungi Chiusura' }}
                </button>
              </div>
            </div>

            <!-- Lista Chiusure Esistenti -->
            <div class="space-y-2">
              <h4 class="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                <span>Chiusure Registrate ({{ closuresList().length }})</span>
                @if (closuresLoading()) {
                  <span class="text-[11px] text-slate-400 font-normal">Aggiornamento...</span>
                }
              </h4>

              <div class="max-h-56 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-2xl bg-white">
                @for (c of closuresList(); track c.id) {
                  <div class="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div>
                      <div class="flex items-center gap-2">
                        <span class="font-extrabold text-xs text-slate-900">{{ formatDayDate(c.date) }}</span>
                        <span class="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[10px] font-bold">
                          {{ c.title }}
                        </span>
                      </div>
                      @if (c.notes) {
                        <p class="text-[11px] text-slate-400 mt-0.5 italic">{{ c.notes }}</p>
                      }
                    </div>
                    <button
                      (click)="confirmDeleteClosure(c.id, c.title)"
                      title="Elimina chiusura"
                      class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                } @empty {
                  <div class="p-6 text-center text-xs text-slate-400">
                    Nessuna data di chiusura straordinaria registrata.
                  </div>
                }
              </div>
            </div>

            <div class="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                (click)="closeClosuresModal()"
                class="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Modal Aggiungi Alunno a Giorno Calendario (Solo Office/Admin) -->
      @if (showAddStudentModal() && canManageStudents()) {
        <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div class="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full p-5 sm:p-7 shadow-2xl border border-slate-100 space-y-4 animate-fade-in">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100">
              <div class="flex items-center space-x-2">
                <span class="p-2 rounded-xl bg-teal-50 text-teal-600 font-bold">🎒</span>
                <div>
                  <h3 class="text-lg font-extrabold text-slate-900">Aggiungi Alunno al Giorno</h3>
                  <p class="text-xs text-slate-500">
                    {{ selectedDayForAddStudent()?.day_name }} {{ selectedDayForAddStudent()?.date }}
                  </p>
                </div>
              </div>
              <button (click)="closeAddStudentModal()" class="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold">&times;</button>
            </div>

            @if (addStudentError()) {
              <div class="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
                {{ addStudentError() }}
              </div>
            }

            <!-- Ricerca Alunno -->
            <div class="space-y-1.5">
              <label class="block text-xs font-bold text-slate-700">Cerca Alunno</label>
              <div class="relative">
                <input
                  type="text"
                  [ngModel]="studentSearchQuery()"
                  (ngModelChange)="studentSearchQuery.set($event)"
                  placeholder="Nome, cognome, scuola..."
                  class="w-full px-3 py-2 pl-9 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            <!-- Lista Alunni Selezionabili -->
            <div class="space-y-1">
              <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Seleziona Alunno
              </label>

              @if (studentsLoading()) {
                <div class="p-4 text-center text-xs text-slate-400">Caricamento alunni...</div>
              } @else {
                <div class="max-h-48 overflow-y-auto space-y-1 border border-slate-100 rounded-xl p-1 bg-slate-50/50">
                  @for (st of availableStudentsForModal(); track st.id) {
                    <button
                      type="button"
                      (click)="selectStudentToAdd(st)"
                      class="w-full text-left p-2 rounded-lg text-xs flex items-center justify-between transition-colors"
                      [ngClass]="{
                        'bg-teal-50 text-teal-900 border border-teal-300 font-bold': selectedStudentToAdd()?.id === st.id,
                        'hover:bg-slate-100 text-slate-700 border border-transparent': selectedStudentToAdd()?.id !== st.id
                      }"
                    >
                      <div class="truncate">
                        <span>{{ st.last_name }} {{ st.first_name }}</span>
                        @if (st.school) {
                          <span class="text-[10px] text-slate-400 ml-1.5 font-normal">({{ st.school }})</span>
                        }
                      </div>
                      <div class="shrink-0 text-[10px]">
                        @if ((st.weekly_meals ?? 0) > 0) {
                          <span class="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">Pasti previsti</span>
                        }
                      </div>
                    </button>
                  } @empty {
                    <div class="p-3 text-center text-xs text-slate-400">
                      Nessun alunno trovato o già tutti presenti in questo giorno.
                    </div>
                  }
                </div>
              }
            </div>

            <!-- Opzioni di Presenza e Mensa per lo Studente Selezionato -->
            @if (selectedStudentToAdd()) {
              <div class="p-3.5 bg-teal-50/60 rounded-2xl border border-teal-100 space-y-3">
                <div class="text-xs font-bold text-teal-900 flex items-center justify-between">
                  <span>Alunno selezionato:</span>
                  <span class="font-extrabold">{{ selectedStudentToAdd()?.last_name }} {{ selectedStudentToAdd()?.first_name }}</span>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <!-- Checkbox Presenza -->
                  <label class="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                    <input
                      type="checkbox"
                      [(ngModel)]="addStudentForm.is_present"
                      class="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                    />
                    <div class="text-xs">
                      <span class="font-bold text-slate-800">Segna Presente</span>
                      <p class="text-[10px] text-slate-400">Registra presenza oggi</p>
                    </div>
                  </label>

                  <!-- Checkbox Mensa -->
                  <label class="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                    <input
                      type="checkbox"
                      [(ngModel)]="addStudentForm.has_meal"
                      class="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
                    />
                    <div class="text-xs">
                      <span class="font-bold text-slate-800">Diritto a Pasto / Mensa</span>
                      <p class="text-[10px] text-slate-400">Consuma pasto oggi</p>
                    </div>
                  </label>
                </div>
              </div>
            }

            <!-- Modal Actions -->
            <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                (click)="closeAddStudentModal()"
                class="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Annulla
              </button>
              <button
                type="button"
                (click)="confirmAddStudent()"
                [disabled]="!selectedStudentToAdd() || addStudentSaving()"
                class="px-5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs transition-all disabled:opacity-40"
              >
                {{ addStudentSaving() ? 'Salvataggio...' : 'Aggiungi e Salva' }}
              </button>
            </div>
          </div>
        </div>
      }

    </div>
  `
})
export class AfterschoolCalendarComponent implements OnInit {
  private api = inject(ApiService);
  private authService = inject(AuthService);

  readonly currentDate = signal<Date>(new Date());
  readonly schedule = signal<AfterschoolWeekSchedule | null>(null);
  readonly teachersList = signal<User[]>([]);
  readonly loading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  // Permessi RBAC
  readonly canEdit = computed(() => this.authService.canManageAttendanceStudents());
  readonly isAdmin = computed(() => this.authService.isAdmin());
  readonly canManageStudents = computed(() => this.authService.canManageAttendanceStudents());
  readonly canManageMeals = computed(() => this.authService.canManageAttendanceMeals());
  readonly canTogglePresence = computed(() => this.authService.isTeacher() || this.authService.isOffice() || this.authService.isAdmin());
  readonly currentUserId = computed(() => {
    const u = this.authService.currentUser();
    return u?.id ? String(u.id) : null;
  });

  // Modal Aggiungi Alunno a Giorno Calendario (Solo Office/Admin)
  readonly showAddStudentModal = signal<boolean>(false);
  readonly selectedDayForAddStudent = signal<AfterschoolWeekDay | null>(null);
  readonly allStudentsList = signal<Student[]>([]);
  readonly studentsLoading = signal<boolean>(false);
  readonly studentSearchQuery = signal<string>('');
  readonly selectedStudentToAdd = signal<Student | null>(null);
  readonly addStudentSaving = signal<boolean>(false);
  readonly addStudentError = signal<string | null>(null);

  addStudentForm = {
    is_present: true,
    has_meal: true
  };

  readonly availableStudentsForModal = computed(() => {
    const day = this.selectedDayForAddStudent();
    const all = this.allStudentsList();
    const query = this.studentSearchQuery().trim().toLowerCase();
    const existingIds = new Set((day?.students || []).map(s => String(s.student_id)));

    return all.filter(s => {
      if (existingIds.has(String(s.id))) return false;
      if (!query) return true;
      const full = `${s.first_name || ''} ${s.last_name || ''} ${s.school || ''} ${s.fiscal_code || ''}`.toLowerCase();
      return full.includes(query);
    });
  });

  isMyShift(shift: TeacherShift): boolean {
    const myId = this.currentUserId();
    if (!myId) return false;
    return String(shift.user_id) === myId;
  }

  getHolidayInfo(dateStr: string): ItalianHoliday | null {
    return getItalianHoliday(dateStr);
  }

  // Modal Shift State
  readonly showShiftModal = signal<boolean>(false);
  readonly editingShiftId = signal<string | null>(null);
  readonly modalSaving = signal<boolean>(false);
  readonly modalError = signal<string | null>(null);

  shiftForm = {
    user_id: '',
    shift_date: '',
    start_time: '14:00',
    end_time: '17:30',
    notes: ''
  };

  // Modal Closures (Solo Admin)
  readonly showClosuresModal = signal<boolean>(false);
  readonly closuresList = signal<ClosureDay[]>([]);
  readonly closuresLoading = signal<boolean>(false);
  readonly closureSaving = signal<boolean>(false);
  readonly closureFormError = signal<string | null>(null);

  closureForm = {
    date: '',
    title: '',
    notes: ''
  };

  ngOnInit(): void {
    this.loadWeekSchedule();
    if (this.canEdit()) {
      this.loadTeachers();
    }
  }

  getMondayIso(d: Date): string {
    const copy = new Date(d);
    const day = copy.getDay(); // 0=Dom, 1=Lun
    const diff = copy.getDate() - day + (day === 0 ? -6 : 1);
    copy.setDate(diff);
    return copy.toISOString().split('T')[0];
  }

  loadWeekSchedule(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    const mondayStr = this.getMondayIso(this.currentDate());

    this.api.getAfterschoolWeekSchedule(mondayStr).subscribe({
      next: (data) => {
        this.schedule.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err?.error?.error || 'Errore nel caricamento del calendario doposcuola.');
      }
    });
  }

  loadTeachers(): void {
    this.api.getUsers().subscribe({
      next: (users) => {
        const teachers = users.filter(u => {
          const groups = u.groups || [];
          return groups.includes('TEACHER') || groups.includes('ADMIN') || groups.includes('OFFICE');
        });
        this.teachersList.set(teachers.length > 0 ? teachers : users);
      },
      error: (err) => console.error('Errore fetch docenti per turni:', err)
    });
  }

  previousWeek(): void {
    const d = new Date(this.currentDate());
    d.setDate(d.getDate() - 7);
    this.currentDate.set(d);
    this.loadWeekSchedule();
  }

  nextWeek(): void {
    const d = new Date(this.currentDate());
    d.setDate(d.getDate() + 7);
    this.currentDate.set(d);
    this.loadWeekSchedule();
  }

  currentWeek(): void {
    this.currentDate.set(new Date());
    this.loadWeekSchedule();
  }

  formatWeekInterval(): string {
    const s = this.schedule();
    if (!s || !s.week_start || !s.week_end) return '';
    const d1 = new Date(s.week_start);
    const d2 = new Date(s.week_end);
    const opt: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    return `${d1.toLocaleDateString('it-IT', opt)} - ${d2.toLocaleDateString('it-IT', { ...opt, year: 'numeric' })}`;
  }

  formatDayDate(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
  }

  isDayToday(dateStr: string): boolean {
    const todayStr = new Date().toISOString().split('T')[0];
    return dateStr === todayStr;
  }

  openShiftModal(dayDate?: string): void {
    this.editingShiftId.set(null);
    this.modalError.set(null);
    this.shiftForm = {
      user_id: this.teachersList().length > 0 ? String(this.teachersList()[0].id) : '',
      shift_date: dayDate || this.getMondayIso(this.currentDate()),
      start_time: '14:00',
      end_time: '17:30',
      notes: ''
    };
    this.showShiftModal.set(true);
  }

  editShift(shift: TeacherShift, fallbackDate?: string): void {
    this.editingShiftId.set(shift.id);
    this.modalError.set(null);

    let rawDate = shift.shift_date || fallbackDate || '';
    if (rawDate && rawDate.includes('T')) {
      rawDate = rawDate.split('T')[0];
    }

    this.shiftForm = {
      user_id: shift.user_id,
      shift_date: rawDate,
      start_time: shift.start_time || '14:00',
      end_time: shift.end_time || '17:30',
      notes: shift.notes || ''
    };
    this.showShiftModal.set(true);
  }

  closeShiftModal(): void {
    this.showShiftModal.set(false);
    this.editingShiftId.set(null);
  }

  saveShift(): void {
    if (!this.shiftForm.user_id || !this.shiftForm.shift_date || !this.shiftForm.start_time || !this.shiftForm.end_time) {
      this.modalError.set('Compila tutti i campi obbligatori.');
      return;
    }

    if (this.shiftForm.start_time >= this.shiftForm.end_time) {
      this.modalError.set("L'orario di inizio deve essere precedente all'orario di fine.");
      return;
    }

    this.modalSaving.set(true);
    this.modalError.set(null);

    const editId = this.editingShiftId();
    if (editId) {
      this.api.updateTeacherShift(editId, this.shiftForm).subscribe({
        next: () => {
          this.modalSaving.set(false);
          this.closeShiftModal();
          this.loadWeekSchedule();
        },
        error: (err) => {
          this.modalSaving.set(false);
          this.modalError.set(err?.error?.error || "Errore durante l'aggiornamento del turno.");
        }
      });
    } else {
      this.api.createTeacherShift(this.shiftForm).subscribe({
        next: () => {
          this.modalSaving.set(false);
          this.closeShiftModal();
          this.loadWeekSchedule();
        },
        error: (err) => {
          this.modalSaving.set(false);
          this.modalError.set(err?.error?.error || 'Errore durante la creazione del turno.');
        }
      });
    }
  }

  confirmDeleteShift(shift: TeacherShift): void {
    if (!confirm(`Sei sicuro di voler eliminare il turno di ${shift.first_name || ''} ${shift.last_name || ''}?`)) {
      return;
    }

    this.api.deleteTeacherShift(shift.id).subscribe({
      next: () => {
        this.loadWeekSchedule();
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.error || "Errore durante l'eliminazione del turno.");
      }
    });
  }

  // ================= METODI CHIUSURE (SOLO ADMIN) =================
  openClosuresModal(): void {
    this.closureFormError.set(null);
    this.closureForm = {
      date: new Date().toISOString().split('T')[0],
      title: '',
      notes: ''
    };
    this.loadClosuresList();
    this.showClosuresModal.set(true);
  }

  closeClosuresModal(): void {
    this.showClosuresModal.set(false);
  }

  loadClosuresList(): void {
    this.closuresLoading.set(true);
    this.api.getAfterschoolClosures().subscribe({
      next: (list) => {
        this.closuresList.set(list);
        this.closuresLoading.set(false);
      },
      error: (err) => {
        this.closuresLoading.set(false);
        console.error('Errore fetch chiusure:', err);
      }
    });
  }

  saveClosure(): void {
    if (!this.closureForm.date || !this.closureForm.title.trim()) {
      this.closureFormError.set('Inserisci la data e una motivazione/titolo per la chiusura.');
      return;
    }

    this.closureSaving.set(true);
    this.closureFormError.set(null);

    this.api.createAfterschoolClosure(this.closureForm).subscribe({
      next: () => {
        this.closureSaving.set(false);
        this.closureForm.title = '';
        this.closureForm.notes = '';
        this.loadClosuresList();
        this.loadWeekSchedule();
      },
      error: (err) => {
        this.closureSaving.set(false);
        this.closureFormError.set(err?.error?.error || 'Errore durante il salvataggio della chiusura.');
      }
    });
  }

  confirmDeleteClosure(id: string, title: string): void {
    if (!confirm(`Confermi la cancellazione della chiusura "${title}"?`)) {
      return;
    }

    this.api.deleteAfterschoolClosure(id).subscribe({
      next: () => {
        this.loadClosuresList();
        this.loadWeekSchedule();
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.error || 'Errore nella cancellazione della chiusura.');
      }
    });
  }

  // --- Gestione Alunni & Presenze / Mensa dal Calendario ---

  openAddStudentModal(day: AfterschoolWeekDay): void {
    if (!this.canManageStudents()) return;
    this.selectedDayForAddStudent.set(day);
    this.selectedStudentToAdd.set(null);
    this.studentSearchQuery.set('');
    this.addStudentError.set(null);
    this.addStudentForm = {
      is_present: true,
      has_meal: true
    };
    this.showAddStudentModal.set(true);

    if (this.allStudentsList().length === 0) {
      this.studentsLoading.set(true);
      this.api.getStudents().subscribe({
        next: (students) => {
          this.allStudentsList.set(students);
          this.studentsLoading.set(false);
        },
        error: (err) => {
          console.error('Errore caricamento studenti per calendario:', err);
          this.studentsLoading.set(false);
        }
      });
    }
  }

  selectStudentToAdd(student: Student): void {
    this.selectedStudentToAdd.set(student);
    this.addStudentForm.is_present = true;
    this.addStudentForm.has_meal = (student.weekly_meals ?? 0) > 0;
  }

  closeAddStudentModal(): void {
    this.showAddStudentModal.set(false);
    this.selectedDayForAddStudent.set(null);
    this.selectedStudentToAdd.set(null);
    this.addStudentError.set(null);
  }

  confirmAddStudent(): void {
    const day = this.selectedDayForAddStudent();
    const student = this.selectedStudentToAdd();
    if (!day || !student) {
      this.addStudentError.set('Seleziona uno studente');
      return;
    }

    this.addStudentSaving.set(true);
    this.addStudentError.set(null);

    const record = {
      student_id: student.id,
      first_name: student.first_name,
      last_name: student.last_name,
      school: student.school || '',
      is_present: this.addStudentForm.is_present,
      has_meal: this.addStudentForm.has_meal
    };

    this.api.saveAttendancesBulk(day.date, [record]).subscribe({
      next: () => {
        this.addStudentSaving.set(false);

        // Aggiorna localmente il calendario
        const currentSched = this.schedule();
        if (currentSched) {
          const targetDay = currentSched.days.find(d => d.date === day.date);
          if (targetDay) {
            const newItem: AfterschoolStudentScheduleItem = {
              student_id: student.id,
              first_name: student.first_name,
              last_name: student.last_name,
              school: student.school || '',
              is_present: this.addStudentForm.is_present,
              has_meal: this.addStudentForm.has_meal,
              canteen_used: this.addStudentForm.has_meal,
              already_registered: true
            };
            targetDay.students = [...targetDay.students, newItem].sort((a, b) =>
              a.last_name.localeCompare(b.last_name)
            );
            targetDay.expected_students_count = targetDay.students.length;
            targetDay.meals_count = targetDay.students.filter(s => s.has_meal).length;
            this.schedule.set({ ...currentSched });
          }
        }

        this.closeAddStudentModal();
      },
      error: (err) => {
        this.addStudentSaving.set(false);
        this.addStudentError.set(err?.error?.error || err.message || 'Errore nel salvataggio');
      }
    });
  }

  toggleStudentPresence(day: AfterschoolWeekDay, st: AfterschoolStudentScheduleItem): void {
    if (!this.canTogglePresence()) return;
    const previousState = !!st.is_present;
    const newState = !previousState;
    st.is_present = newState;

    this.api.saveAttendancesBulk(day.date, [{
      student_id: st.student_id,
      first_name: st.first_name,
      last_name: st.last_name,
      is_present: newState,
      has_meal: !!st.has_meal
    }]).subscribe({
      next: () => {
        // Aggiornamento ottimistico confermato
      },
      error: (err) => {
        console.error('Errore toggle presenza dal calendario:', err);
        st.is_present = previousState;
        alert('Impossibile aggiornare la presenza: ' + (err?.error?.error || err.message || 'Errore di rete'));
      }
    });
  }

  toggleStudentMeal(day: AfterschoolWeekDay, st: AfterschoolStudentScheduleItem): void {
    if (!this.canManageMeals()) return;
    const previousState = !!st.has_meal;
    const newState = !previousState;
    st.has_meal = newState;
    st.canteen_used = newState;
    day.meals_count = day.students.filter(s => s.has_meal).length;

    this.api.saveAttendancesBulk(day.date, [{
      student_id: st.student_id,
      first_name: st.first_name,
      last_name: st.last_name,
      is_present: !!st.is_present,
      has_meal: newState
    }]).subscribe({
      next: () => {
        // Aggiornamento ottimistico confermato
      },
      error: (err) => {
        console.error('Errore toggle mensa dal calendario:', err);
        st.has_meal = previousState;
        st.canteen_used = previousState;
        day.meals_count = day.students.filter(s => s.has_meal).length;
        alert('Impossibile aggiornare la mensa: ' + (err?.error?.error || err.message || 'Errore di rete'));
      }
    });
  }
}
