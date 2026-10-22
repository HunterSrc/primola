import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AttendanceRecord, Student } from '../../core/models';
import { AppDatePipe } from '../../shared/pipes/app-date.pipe';

@Component({
  selector: 'app-attendance-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, AppDatePipe],
  template: `
    <div class="p-3 sm:p-6 md:p-10 max-w-7xl mx-auto space-y-4 sm:space-y-6 pb-6 md:pb-0">
      
      <!-- Header Banner / Control Bar -->
      <div class="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 shadow-sm border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
        <div>
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shadow-inner shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 sm:w-7 sm:h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div>
              <h1 class="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Segna Presenze</h1>
              <p class="text-xs sm:text-sm font-semibold text-emerald-700 capitalize mt-0.5">{{ selectedDate() | appDate:'full' }}</p>
            </div>
          </div>
        </div>

        <!-- Controls: Data Picker, Add Extra, Save Button -->
        <div class="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 w-full md:w-auto">
          <div class="relative w-full sm:w-auto">
            <input
              type="date"
              [ngModel]="selectedDate()"
              (ngModelChange)="onDateChange($event)"
              class="w-full sm:w-auto min-w-[200px] px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors shadow-sm cursor-pointer"
            />
          </div>

          <div class="flex items-center gap-2 w-full sm:w-auto">
            <button
              (click)="showExtraModal.set(true)"
              class="flex-1 sm:flex-initial px-3.5 py-2 sm:px-4 sm:py-2.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 text-xs sm:text-sm font-bold rounded-xl sm:rounded-2xl flex items-center justify-center space-x-1.5 sm:space-x-2 transition-all border border-slate-200/80 shadow-sm min-h-[42px]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
              </svg>
              <span>+ Extra</span>
            </button>

            <button
              (click)="saveBulk()"
              [disabled]="isSaving()"
              class="flex-1 sm:flex-initial px-4 sm:px-6 py-2 sm:py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white text-xs sm:text-sm font-bold rounded-xl sm:rounded-2xl shadow-lg shadow-emerald-600/25 flex items-center justify-center space-x-1.5 sm:space-x-2 transition-all active:scale-95 min-h-[42px]"
            >
              @if (isSaving()) {
                <svg class="animate-spin -ml-1 mr-1.5 sm:mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Salvataggio...</span>
              } @else {
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                </svg>
                <span>Salva Presenze</span>
              }
            </button>
          </div>
        </div>
      </div>

      <!-- Quick Search Bar (Mobile e Desktop) -->
      <div class="relative">
        <input
          type="text"
          [(ngModel)]="searchQuery"
          placeholder="Cerca studente nella lista..."
          class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
        />
        @if (searchQuery) {
          <button (click)="searchQuery = ''" class="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-sm font-bold">&times;</button>
        }
      </div>

      <!-- KPI Stat Cards -->
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 sm:gap-4">
        <div class="bg-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <p class="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Attesi</p>
            <p class="text-xl sm:text-3xl font-extrabold text-slate-800 mt-1">{{ expectedCount() }}</p>
          </div>
          <div class="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-base sm:text-lg">
            👥
          </div>
        </div>

        <div class="bg-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <p class="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Presenti</p>
            <p class="text-xl sm:text-3xl font-extrabold text-emerald-600 mt-1">{{ presentCount() }}</p>
          </div>
          <div class="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-base sm:text-lg">
            ✓
          </div>
        </div>

        <div class="bg-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-2xs flex items-center justify-between border-l-4 border-l-purple-500">
          <div>
            <p class="text-[10px] sm:text-xs font-bold text-purple-600 uppercase tracking-wider">Extra</p>
            <p class="text-xl sm:text-3xl font-extrabold text-purple-600 mt-1">{{ extraCount() }}</p>
          </div>
          <div class="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-base sm:text-lg">
            ⭐
          </div>
        </div>

        <div class="bg-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <p class="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Assenti</p>
            <p class="text-xl sm:text-3xl font-extrabold text-rose-600 mt-1">{{ absentCount() }}</p>
          </div>
          <div class="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-base sm:text-lg">
            ✗
          </div>
        </div>

        <div class="col-span-2 sm:col-span-1 bg-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <p class="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Mensa</p>
            <p class="text-xl sm:text-3xl font-extrabold text-amber-600 mt-1">{{ mealCount() }}</p>
          </div>
          <div class="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-base sm:text-lg">
            🍽️
          </div>
        </div>
      </div>

      <!-- Box Recap Studenti Extra Inseriti Oggi -->
      @if (extraRecords().length > 0) {
        <div class="bg-gradient-to-r from-purple-50 via-white to-purple-50/30 rounded-2xl sm:rounded-3xl border border-purple-200 p-4 sm:p-5 shadow-2xs space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <span class="w-2.5 h-2.5 rounded-full bg-purple-600 animate-pulse"></span>
              <h2 class="text-xs sm:text-sm font-extrabold text-purple-900 uppercase tracking-wider">
                Studenti Extra Aggiunti ({{ extraRecords().length }})
              </h2>
            </div>
            <span class="text-[10px] sm:text-xs font-semibold px-2 py-0.5 sm:px-2.5 sm:py-1 bg-purple-100 text-purple-700 rounded-full border border-purple-200">
              Fuori abbonamento
            </span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            @for (extra of extraRecords(); track extra.student_id) {
              <div class="bg-white rounded-xl sm:rounded-2xl border border-purple-100 p-3 shadow-2xs flex items-center justify-between">
                <div>
                  <div class="flex items-center space-x-1.5">
                    <span class="font-bold text-slate-800 text-xs sm:text-sm">{{ extra.last_name }} {{ extra.first_name }}</span>
                  </div>
                  <p class="text-[11px] text-slate-400 truncate max-w-[150px]">{{ extra.school || 'Scuola non indicata' }}</p>
                  @if (extra.main_tutor_phone) {
                    <a [href]="'tel:' + extra.main_tutor_phone" class="text-[11px] text-emerald-600 font-mono mt-0.5 block hover:underline">📞 {{ extra.main_tutor_phone }}</a>
                  }
                </div>

                <div class="text-right flex flex-col items-end space-y-1">
                  <div class="flex items-center space-x-1">
                    @if (extra.is_present) {
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Presente
                      </span>
                    } @else {
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
                        Non Presente
                      </span>
                    }
                    <button
                      type="button"
                      (click)="removeExtraStudent(extra.student_id)"
                      class="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition-colors"
                      title="Rimuovi extra"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  @if (extra.has_meal) {
                    <span class="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      🍲 Mensa
                    </span>
                  }
                </div>
              </div>
            }
          </div>
        </div>
      }

      <!-- Toast Feedback Salva -->
      @if (saveSuccessMessage()) {
        <div class="p-3.5 sm:p-4 bg-emerald-500 text-white rounded-2xl flex items-center justify-between shadow-xl shadow-emerald-500/20">
          <div class="flex items-center space-x-3">
            <div class="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs sm:text-sm">✓</div>
            <span class="font-bold text-xs sm:text-sm">{{ saveSuccessMessage() }}</span>
          </div>
          <button (click)="saveSuccessMessage.set(null)" class="text-white hover:text-emerald-100 font-bold text-lg p-1">&times;</button>
        </div>
      }

      <!-- VISTA MOBILE: Cards Touch-Friendly per Smartphone (md:hidden) -->
      <div class="block md:hidden space-y-3">
        @for (item of filteredRecords(); track item.student_id; let idx = $index) {
          <div
            class="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/90 transition-all"
            [class.border-emerald-400]="item.is_present"
            [class.bg-emerald-50/15]="item.is_present"
          >
            <!-- Card Header: Nome, Extra Tag, Scuola, Telefono -->
            <div class="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
              <div class="flex items-center space-x-3">
                <div class="w-10 h-10 rounded-2xl flex items-center justify-center font-extrabold text-xs shrink-0 shadow-2xs"
                     [class]="item.is_present ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'">
                  {{ item.first_name.charAt(0) }}{{ item.last_name.charAt(0) }}
                </div>
                <div>
                  <div class="flex items-center space-x-1.5 flex-wrap">
                    <span class="text-sm font-bold text-slate-900">{{ item.last_name }} {{ item.first_name }}</span>
                    @if (item.is_extra) {
                      <span class="px-1.5 py-0.5 text-[9px] bg-purple-100 text-purple-800 rounded font-extrabold uppercase border border-purple-200">EXTRA</span>
                    }
                  </div>
                  <p class="text-xs text-slate-500">{{ item.school || 'Scuola non indicata' }}</p>
                </div>
              </div>

              <div class="flex items-center space-x-2">
                @if (item.main_tutor_phone) {
                  <a
                    [href]="'tel:' + item.main_tutor_phone"
                    class="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 shrink-0 border border-emerald-200/60 active:scale-95"
                    title="Chiama tutore"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </a>
                }
                @if (item.is_extra) {
                  <button
                    type="button"
                    (click)="removeExtraStudent(item.student_id)"
                    class="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 shrink-0 border border-rose-200/60 active:scale-95"
                    title="Rimuovi extra"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                }
              </div>
            </div>

            <!-- Card Actions: Bottoni Touch Grandi (minimo 44px) -->
            <div class="grid grid-cols-3 gap-2 pt-3">
              <!-- Presente Button -->
              <button
                type="button"
                (click)="togglePresence(getOriginalIndex(item))"
                [class]="item.is_present ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-2 ring-emerald-500/20' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'"
                class="min-h-[44px] py-2 px-2 rounded-xl font-bold transition-all flex flex-col items-center justify-center text-xs active:scale-95"
              >
                <span class="text-sm leading-none mb-0.5">@if (item.is_present) { ✓ } @else { ✕ }</span>
                <span class="text-[10px]">Presente</span>
              </button>

              <!-- Mensa Button -->
              <button
                type="button"
                (click)="toggleMeal(getOriginalIndex(item))"
                [disabled]="!item.is_present"
                [class]="item.has_meal ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'"
                class="min-h-[44px] py-2 px-2 rounded-xl font-bold transition-all flex flex-col items-center justify-center text-xs disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
              >
                <span class="text-sm leading-none mb-0.5">🍲</span>
                <span class="text-[10px]">Mensa</span>
              </button>

              <!-- Giustificato Button -->
              <button
                type="button"
                (click)="toggleExcused(getOriginalIndex(item))"
                [disabled]="item.is_present"
                [class]="item.is_excused ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'"
                class="min-h-[44px] py-2 px-2 rounded-xl font-bold transition-all flex flex-col items-center justify-center text-xs disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
              >
                <span class="text-sm leading-none mb-0.5">📋</span>
                <span class="text-[10px]">Giustif.</span>
              </button>
            </div>

            <!-- Note Input Mobile -->
            <div class="mt-2.5">
              <input
                type="text"
                [(ngModel)]="item.notes"
                placeholder="Note opzionali..."
                class="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-slate-400"
              />
            </div>
          </div>
        } @empty {
          <div class="p-8 bg-white rounded-2xl text-center text-slate-400 font-medium border border-slate-200">
            Nessuno studente trovato per questa data o ricerca.
          </div>
        }
      </div>

      <!-- VISTA DESKTOP / TABLET: Tabella Tradizionale (hidden md:block) -->
      <div class="hidden md:block bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200/80 text-slate-600 text-xs font-bold uppercase tracking-wider">
                <th class="py-4 px-6">Studente</th>
                <th class="py-4 px-6">Scuola / Tutore</th>
                <th class="py-4 px-6 text-center">Presente</th>
                <th class="py-4 px-6 text-center">Mensa</th>
                <th class="py-4 px-6 text-center">Giustificato</th>
                <th class="py-4 px-6">Note</th>
                <th class="py-4 px-4 text-center w-12">Azioni</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-sm">
              @for (item of filteredRecords(); track item.student_id; let idx = $index) {
                <tr class="hover:bg-slate-50/70 transition-colors" [class.bg-emerald-50/20]="item.is_present">
                  
                  <!-- Nome e Avatar -->
                  <td class="py-4 px-6 font-bold text-slate-800">
                    <div class="flex items-center space-x-3.5">
                      <div class="w-9 h-9 rounded-2xl flex items-center justify-center font-extrabold text-xs shrink-0 shadow-sm"
                           [class]="item.is_present ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'">
                        {{ item.first_name.charAt(0) }}{{ item.last_name.charAt(0) }}
                      </div>
                      <div>
                        <div class="flex items-center space-x-2">
                          <span class="text-base text-slate-900">{{ item.last_name }} {{ item.first_name }}</span>
                          @if (item.is_extra) {
                            <span class="px-2 py-0.5 text-[10px] bg-purple-100 text-purple-800 rounded-full font-extrabold uppercase border border-purple-200">EXTRA</span>
                          }
                        </div>
                      </div>
                    </div>
                  </td>

                  <!-- Info Scuola & Telefono -->
                  <td class="py-4 px-6 text-slate-600 text-xs">
                    <div class="font-medium text-slate-800">{{ item.school || 'Non indicata' }}</div>
                    @if (item.main_tutor_phone) {
                      <a [href]="'tel:' + item.main_tutor_phone" class="text-slate-400 font-mono mt-0.5 block hover:text-emerald-600">{{ item.main_tutor_phone }}</a>
                    }
                  </td>

                  <!-- Presente Toggle -->
                  <td class="py-4 px-6 text-center">
                    <button
                      type="button"
                      (click)="togglePresence(getOriginalIndex(item))"
                      [class]="item.is_present ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-2 ring-emerald-500/20' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'"
                      class="w-10 h-10 rounded-2xl font-bold transition-all inline-flex items-center justify-center text-sm active:scale-90"
                    >
                      @if (item.is_present) { ✓ } @else { ✕ }
                    </button>
                  </td>

                  <!-- Mensa Toggle -->
                  <td class="py-4 px-6 text-center">
                    <button
                      type="button"
                      (click)="toggleMeal(getOriginalIndex(item))"
                      [disabled]="!item.is_present"
                      [class]="item.has_meal ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30' : 'bg-slate-100 text-slate-300 hover:bg-slate-200'"
                      class="w-10 h-10 rounded-2xl font-bold transition-all inline-flex items-center justify-center text-sm disabled:opacity-20 disabled:cursor-not-allowed active:scale-90"
                    >
                      🍲
                    </button>
                  </td>

                  <!-- Giustificato Toggle -->
                  <td class="py-4 px-6 text-center">
                    <button
                      type="button"
                      (click)="toggleExcused(getOriginalIndex(item))"
                      [disabled]="item.is_present"
                      [class]="item.is_excused ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' : 'bg-slate-100 text-slate-300 hover:bg-slate-200'"
                      class="w-10 h-10 rounded-2xl font-bold transition-all inline-flex items-center justify-center text-xs disabled:opacity-20 disabled:cursor-not-allowed active:scale-90"
                    >
                      GIUST.
                    </button>
                  </td>

                  <!-- Note Input -->
                  <td class="py-4 px-6">
                    <input
                      type="text"
                      [(ngModel)]="item.notes"
                      placeholder="Note opzionali..."
                      class="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-400"
                    />
                  </td>

                  <!-- Azioni (es. Rimuovi Extra) -->
                  <td class="py-4 px-4 text-center">
                    @if (item.is_extra) {
                      <button
                        type="button"
                        (click)="removeExtraStudent(item.student_id)"
                        class="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-all"
                        title="Rimuovi studente extra"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    }
                  </td>

                </tr>
              } @empty {
                <tr>
                  <td colspan="7" class="py-16 text-center text-slate-400 font-medium">
                    Nessuno studente iscritto previsto per questa data.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- Modale Aggiungi Studente Extra -->
      @if (showExtraModal()) {
        <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div class="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full p-5 sm:p-8 shadow-2xl border border-slate-100 space-y-4 sm:space-y-5 animate-fade-in">
            <div class="flex items-center justify-between pb-3 sm:pb-4 border-b border-slate-100">
              <h3 class="text-lg sm:text-xl font-extrabold text-slate-900">Aggiungi Studente Extra</h3>
              <button (click)="showExtraModal.set(false)" class="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold">&times;</button>
            </div>

            <p class="text-xs text-slate-500">
              Seleziona uno studente già presente nel gestionale da registrare come extra oggi:
            </p>

            <div class="max-h-60 sm:max-h-64 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl sm:rounded-2xl">
              @for (student of availableExtraStudents(); track student.id) {
                <div class="p-3 sm:p-3.5 hover:bg-emerald-50/50 flex items-center justify-between transition-colors">
                  <div>
                    <p class="text-xs sm:text-sm font-bold text-slate-900">{{ student.last_name }} {{ student.first_name }}</p>
                    <p class="text-[11px] text-slate-400">{{ student.school || 'Nessuna scuola specificata' }}</p>
                  </div>
                  <button
                    (click)="addExtraStudent(student)"
                    class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                  >
                    + Aggiungi
                  </button>
                </div>
              } @empty {
                <div class="p-8 text-center text-xs text-slate-400">Tutti gli studenti risultano già inclusi nella lista.</div>
              }
            </div>

            <div class="pt-2 flex justify-end">
              <button
                (click)="showExtraModal.set(false)"
                class="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition-colors"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      }

    </div>
  `
})
export class AttendanceDashboardComponent implements OnInit {
  private api = inject(ApiService);

  readonly selectedDate = signal<string>(new Date().toISOString().split('T')[0]);
  readonly records = signal<AttendanceRecord[]>([]);
  readonly allStudents = signal<Student[]>([]);
  readonly isSaving = signal<boolean>(false);
  readonly saveSuccessMessage = signal<string | null>(null);
  readonly showExtraModal = signal<boolean>(false);
  searchQuery = '';

  readonly extraRecords = computed(() => this.records().filter(r => r.is_extra));
  readonly expectedCount = computed(() => this.records().filter(r => !r.is_extra).length);
  readonly extraCount = computed(() => this.extraRecords().length);
  readonly presentCount = computed(() => this.records().filter(r => r.is_present).length);
  readonly absentCount = computed(() => this.records().filter(r => !r.is_present).length);
  readonly mealCount = computed(() => this.records().filter(r => r.is_present && r.has_meal).length);

  readonly formattedDate = computed(() => {
    const d = new Date(this.selectedDate());
    return d.toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  });

  readonly availableExtraStudents = computed(() => {
    const existingIds = new Set(this.records().map(r => r.student_id));
    return this.allStudents().filter(s => !existingIds.has(s.id));
  });

  filteredRecords(): AttendanceRecord[] {
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) return this.records();
    return this.records().filter(r =>
      r.first_name.toLowerCase().includes(q) ||
      r.last_name.toLowerCase().includes(q) ||
      (r.school && r.school.toLowerCase().includes(q))
    );
  }

  getOriginalIndex(item: AttendanceRecord): number {
    return this.records().findIndex(r => r.student_id === item.student_id);
  }

  ngOnInit(): void {
    this.loadData();
    this.api.getStudents().subscribe(students => this.allStudents.set(students));
  }

  loadData(): void {
    this.api.getExpectedAttendances(this.selectedDate()).subscribe(data => {
      this.records.set(data);
    });
  }

  onDateChange(newDate: string): void {
    this.selectedDate.set(newDate);
    this.loadData();
  }

  togglePresence(index: number): void {
    if (index < 0) return;
    const current = [...this.records()];
    const record = { ...current[index] };
    record.is_present = !record.is_present;
    if (!record.is_present) {
      record.has_meal = false;
    } else {
      record.is_excused = false;
    }
    current[index] = record;
    this.records.set(current);
  }

  toggleMeal(index: number): void {
    if (index < 0) return;
    const current = [...this.records()];
    const record = { ...current[index] };
    if (record.is_present) {
      record.has_meal = !record.has_meal;
      current[index] = record;
      this.records.set(current);
    }
  }

  toggleExcused(index: number): void {
    if (index < 0) return;
    const current = [...this.records()];
    const record = { ...current[index] };
    if (!record.is_present) {
      record.is_excused = !record.is_excused;
      current[index] = record;
      this.records.set(current);
    }
  }

  addExtraStudent(student: Student): void {
    const extraRecord: AttendanceRecord = {
      student_id: student.id,
      first_name: student.first_name,
      last_name: student.last_name,
      school: student.school || '',
      main_tutor_phone: student.main_tutor_phone,
      is_present: true,
      has_meal: true,
      is_excused: false,
      is_extra: true
    };
    this.records.update(prev => [...prev, extraRecord]);
    this.showExtraModal.set(false);
  }

  removeExtraStudent(studentId: number | string): void {
    this.records.update(prev => prev.filter(r => !(r.student_id === studentId && r.is_extra)));
  }

  saveBulk(): void {
    this.isSaving.set(true);
    this.saveSuccessMessage.set(null);
    this.api.saveAttendancesBulk(this.selectedDate(), this.records()).subscribe({
      next: res => {
        this.isSaving.set(false);
        this.saveSuccessMessage.set(`Presenze salvate con successo per ${res.count} studenti!`);
        setTimeout(() => this.saveSuccessMessage.set(null), 5000);
      },
      error: err => {
        this.isSaving.set(false);
        alert('Errore durante il salvataggio: ' + (err.message || 'Errore di rete'));
      }
    });
  }
}
