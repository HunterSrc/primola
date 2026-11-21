import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import {
  CardStatus,
  CourseStudent,
  CourseStudentSummary,
  Project
} from '../../core/models';

interface StudentFormModel {
  nome: string;
  cognome: string;
  email: string;
  telefono: string;
  data_nascita: string;
  luogo_nascita: string;
  indirizzo_residenza: string;
  citta_residenza: string;
  possiede_tessera: boolean;
  data_scadenza_tessera: string;
}

@Component({
  selector: 'app-course-students',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="p-3 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-5 pb-12">
      <!-- Header -->
      <div class="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center space-x-2">
            <h1 class="text-xl sm:text-2xl font-bold text-slate-800">Studenti Corsi</h1>
            <span class="text-[10px] sm:text-xs bg-indigo-500/10 text-indigo-700 font-bold px-2.5 py-0.5 rounded-full border border-indigo-500/20">
              CORSI &amp; LABORATORI
            </span>
          </div>
          <p class="text-xs sm:text-sm text-slate-500 mt-1">
            Anagrafica iscritti ai corsi, stato tessere associative, scadenze e iscrizioni
          </p>
        </div>

        <button
          type="button"
          (click)="openCreateModal()"
          class="min-h-[44px] px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors flex items-center justify-center space-x-2 cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>Nuovo Studente Corso</span>
        </button>
      </div>

      <!-- Feedback Banner -->
      @if (alertMessage()) {
        <div
          class="p-3.5 sm:p-4 rounded-xl border text-xs sm:text-sm flex items-center justify-between shadow-sm"
          [ngClass]="alertType() === 'success'
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
            : alertType() === 'warning'
              ? 'bg-amber-50 text-amber-900 border-amber-300'
              : 'bg-rose-50 text-rose-800 border-rose-200'"
        >
          <span class="font-medium">{{ alertMessage() }}</span>
          <button type="button" (click)="alertMessage.set(null)" class="font-bold ml-4 opacity-70 hover:opacity-100 cursor-pointer">&times;</button>
        </div>
      }

      <!-- Alert Banner Scadenze Tessere -->
      @if (summary().expired > 0 || summary().expiring_soon > 0) {
        <div class="bg-amber-50 border border-amber-300 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="flex items-start space-x-3">
            <div class="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 class="text-sm font-bold text-amber-900">Attenzione scadenze tessere associative</h3>
              <p class="text-xs text-amber-800 mt-0.5">
                Ci sono tessere che richiedono verifica o rinnovo. Clicca su un badge per filtrare subito gli studenti.
              </p>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2 shrink-0">
            @if (summary().expired > 0) {
              <button
                type="button"
                (click)="setCardStatusFilter('SCADUTA')"
                class="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                {{ summary().expired }} Scadut{{ summary().expired === 1 ? 'a' : 'e' }}
              </button>
            }
            @if (summary().expiring_soon > 0) {
              <button
                type="button"
                (click)="setCardStatusFilter('IN_SCADENZA')"
                class="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                {{ summary().expiring_soon }} In scadenza (&le; 30 gg)
              </button>
            }
          </div>
        </div>
      }

      <!-- KPI Riepilogo -->
      <div class="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <button
          type="button"
          (click)="setCardStatusFilter('')"
          class="text-left bg-white rounded-2xl p-3.5 sm:p-4 border shadow-sm transition-all cursor-pointer"
          [ngClass]="selectedCardStatus() === '' ? 'border-slate-900 ring-1 ring-slate-900/10' : 'border-slate-200/80 hover:border-slate-300'"
        >
          <p class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Totale Studenti</p>
          <p class="text-xl sm:text-2xl font-black text-slate-900 mt-1">{{ summary().total }}</p>
        </button>

        <button
          type="button"
          (click)="setCardStatusFilter('VALIDA')"
          class="text-left bg-white rounded-2xl p-3.5 sm:p-4 border shadow-sm transition-all cursor-pointer"
          [ngClass]="selectedCardStatus() === 'VALIDA' ? 'border-emerald-500 ring-1 ring-emerald-500/20' : 'border-slate-200/80 hover:border-emerald-300'"
        >
          <p class="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">Tessera Valida</p>
          <p class="text-xl sm:text-2xl font-black text-emerald-700 mt-1">{{ summary().valid }}</p>
        </button>

        <button
          type="button"
          (click)="setCardStatusFilter('IN_SCADENZA')"
          class="text-left bg-white rounded-2xl p-3.5 sm:p-4 border shadow-sm transition-all cursor-pointer"
          [ngClass]="selectedCardStatus() === 'IN_SCADENZA' ? 'border-amber-500 ring-1 ring-amber-500/20' : 'border-slate-200/80 hover:border-amber-300'"
        >
          <p class="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">In Scadenza</p>
          <p class="text-xl sm:text-2xl font-black text-amber-600 mt-1">{{ summary().expiring_soon }}</p>
        </button>

        <button
          type="button"
          (click)="setCardStatusFilter('SCADUTA')"
          class="text-left bg-white rounded-2xl p-3.5 sm:p-4 border shadow-sm transition-all cursor-pointer"
          [ngClass]="selectedCardStatus() === 'SCADUTA' ? 'border-rose-500 ring-1 ring-rose-500/20' : 'border-slate-200/80 hover:border-rose-300'"
        >
          <p class="text-[11px] font-semibold text-rose-600 uppercase tracking-wider">Scadute</p>
          <p class="text-xl sm:text-2xl font-black text-rose-600 mt-1">{{ summary().expired }}</p>
        </button>

        <button
          type="button"
          (click)="setCardStatusFilter('NESSUNA_TESSERA')"
          class="col-span-2 sm:col-span-1 text-left bg-white rounded-2xl p-3.5 sm:p-4 border shadow-sm transition-all cursor-pointer"
          [ngClass]="selectedCardStatus() === 'NESSUNA_TESSERA' ? 'border-slate-500 ring-1 ring-slate-500/20' : 'border-slate-200/80 hover:border-slate-300'"
        >
          <p class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Nessuna Tessera</p>
          <p class="text-xl sm:text-2xl font-black text-slate-600 mt-1">{{ summary().no_card }}</p>
        </button>
      </div>

      <!-- Filter Bar -->
      <div class="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
          <div class="relative flex-1 max-w-md">
            <input
              type="text"
              [ngModel]="searchQuery()"
              (ngModelChange)="onSearchChange($event)"
              placeholder="Cerca per nome, cognome, email o telefono..."
              class="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            />
          </div>

          <select
            [ngModel]="selectedCardStatus()"
            (ngModelChange)="setCardStatusFilter($event)"
            class="px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 font-medium"
          >
            <option value="">Tutte le tessere</option>
            <option value="VALIDA">Valida</option>
            <option value="IN_SCADENZA">In scadenza (&le; 30 gg)</option>
            <option value="SCADUTA">Scaduta</option>
            <option value="NESSUNA_TESSERA">Nessuna tessera</option>
          </select>
        </div>

        @if (searchQuery() || selectedCardStatus()) {
          <button
            type="button"
            (click)="resetFilters()"
            class="text-xs font-semibold text-slate-500 hover:text-slate-800 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer self-start sm:self-auto"
          >
            Azzera filtri
          </button>
        }
      </div>

      <!-- Mobile View -->
      <div class="block md:hidden space-y-3">
        @if (isLoading()) {
          <div class="bg-white rounded-2xl border border-slate-200/80 p-8 text-center text-slate-400 text-sm">
            <div class="inline-block animate-spin rounded-full h-5 w-5 border-2 border-emerald-600 border-t-transparent mr-2 align-middle"></div>
            Caricamento studenti corsi...
          </div>
        } @else if (students().length === 0) {
          <div class="bg-white rounded-2xl border border-slate-200/80 p-8 text-center text-slate-400 text-sm">
            Nessuno studente trovato per i criteri selezionati.
          </div>
        } @else {
          @for (stu of students(); track stu.id) {
            <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 space-y-3">
              <div class="flex items-start justify-between gap-2">
                <div>
                  <h3 class="text-sm font-bold text-slate-900">{{ stu.cognome }} {{ stu.nome }}</h3>
                  <p class="text-xs text-slate-500 mt-0.5">{{ stu.email || 'Nessuna email' }}</p>
                  @if (stu.telefono) {
                    <p class="text-xs text-slate-500">{{ stu.telefono }}</p>
                  }
                </div>
                <span
                  class="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border shrink-0"
                  [ngClass]="getCardBadgeClass(stu.card_status)"
                >
                  {{ getCardBadgeLabel(stu) }}
                </span>
              </div>

              <div class="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                <div class="p-2 rounded-xl bg-slate-50">
                  <div class="text-[10px] text-slate-400 font-semibold uppercase">Corsi Iscritti</div>
                  <div class="font-bold text-slate-800 mt-0.5">{{ stu.enrollments_count ?? 0 }}</div>
                </div>
                <div class="p-2 rounded-xl bg-slate-50">
                  <div class="text-[10px] text-slate-400 font-semibold uppercase">Da Saldare</div>
                  <div
                    class="font-bold mt-0.5"
                    [ngClass]="(stu.remaining_amount ?? 0) > 0 ? 'text-amber-700' : 'text-emerald-700'"
                  >
                    {{ (stu.remaining_amount ?? 0) | currency:'EUR':'symbol':'1.2-2' }}
                  </div>
                </div>
              </div>

              <div class="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  (click)="openEnrollmentsModal(stu)"
                  class="flex-1 min-h-[40px] px-3 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors cursor-pointer"
                >
                  Corsi / Iscrizioni
                </button>
                <button
                  type="button"
                  (click)="openEditModal(stu)"
                  class="min-h-[40px] px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Modifica
                </button>
                <button
                  type="button"
                  (click)="deleteStudent(stu)"
                  class="min-h-[40px] px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors cursor-pointer"
                >
                  Elimina
                </button>
              </div>
            </div>
          }
        }
      </div>

      <!-- Desktop Table -->
      <div class="hidden md:block bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm text-slate-600 min-w-[900px]">
            <thead class="bg-slate-50/75 border-b border-slate-200 text-xs font-semibold uppercase text-slate-500 tracking-wider">
              <tr>
                <th class="px-4 py-3.5">Studente</th>
                <th class="px-4 py-3.5">Contatti</th>
                <th class="px-4 py-3.5">Residenza / Nascita</th>
                <th class="px-4 py-3.5">Tessera</th>
                <th class="px-4 py-3.5 text-center">Corsi</th>
                <th class="px-4 py-3.5 text-right">Da Saldare</th>
                <th class="px-4 py-3.5 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @if (isLoading()) {
                <tr>
                  <td colspan="7" class="px-4 py-12 text-center text-slate-400">
                    <div class="inline-block animate-spin rounded-full h-6 w-6 border-2 border-emerald-600 border-t-transparent mr-2 align-middle"></div>
                    Caricamento studenti corsi...
                  </td>
                </tr>
              } @else if (students().length === 0) {
                <tr>
                  <td colspan="7" class="px-4 py-12 text-center text-slate-400">
                    Nessuno studente trovato per i criteri selezionati.
                  </td>
                </tr>
              } @else {
                @for (stu of students(); track stu.id) {
                  <tr class="hover:bg-slate-50/70 transition-colors">
                    <td class="px-4 py-3.5">
                      <div class="font-bold text-slate-900">{{ stu.cognome }} {{ stu.nome }}</div>
                    </td>

                    <td class="px-4 py-3.5 text-xs space-y-0.5">
                      <div class="text-slate-700">{{ stu.email || '—' }}</div>
                      <div class="text-slate-500">{{ stu.telefono || '—' }}</div>
                    </td>

                    <td class="px-4 py-3.5 text-xs space-y-0.5">
                      <div class="text-slate-700">
                        {{ stu.citta_residenza || '—' }}
                        @if (stu.indirizzo_residenza) {
                          <span class="text-slate-400"> · {{ stu.indirizzo_residenza }}</span>
                        }
                      </div>
                      <div class="text-slate-400">
                        @if (stu.data_nascita) {
                          Nato/a il {{ formatDate(stu.data_nascita) }}
                        }
                        @if (stu.luogo_nascita) {
                          <span> ({{ stu.luogo_nascita }})</span>
                        }
                        @if (!stu.data_nascita && !stu.luogo_nascita) {
                          —
                        }
                      </div>
                    </td>

                    <td class="px-4 py-3.5">
                      <span
                        class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border"
                        [ngClass]="getCardBadgeClass(stu.card_status)"
                      >
                        {{ getCardBadgeLabel(stu) }}
                      </span>
                      @if (stu.possiede_tessera && stu.data_scadenza_tessera) {
                        <div class="text-[11px] text-slate-400 mt-1">
                          Scad. {{ formatDate(stu.data_scadenza_tessera) }}
                        </div>
                      }
                    </td>

                    <td class="px-4 py-3.5 text-center">
                      <span class="inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {{ stu.enrollments_count ?? 0 }}
                      </span>
                    </td>

                    <td class="px-4 py-3.5 text-right font-bold">
                      <span [ngClass]="(stu.remaining_amount ?? 0) > 0 ? 'text-amber-700' : 'text-emerald-700'">
                        {{ (stu.remaining_amount ?? 0) | currency:'EUR':'symbol':'1.2-2' }}
                      </span>
                    </td>

                    <td class="px-4 py-3.5 text-right">
                      <div class="inline-flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          (click)="openEnrollmentsModal(stu)"
                          class="px-2.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer"
                        >
                          Corsi / Iscrizioni
                        </button>
                        <button
                          type="button"
                          (click)="openEditModal(stu)"
                          class="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                        >
                          Modifica
                        </button>
                        <button
                          type="button"
                          (click)="deleteStudent(stu)"
                          class="px-2.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                        >
                          Elimina
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- MODAL: CREA / MODIFICA STUDENTE CORSO -->
    @if (showStudentModal()) {
      <div class="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
            <div>
              <h2 class="text-lg font-bold text-slate-800">
                {{ editingStudentId() ? 'Modifica Studente Corso' : 'Nuovo Studente Corso' }}
              </h2>
              <p class="text-xs text-slate-500">Compila i dati anagrafici e le informazioni sulla tessera</p>
            </div>
            <button type="button" (click)="closeStudentModal()" class="text-slate-400 hover:text-slate-700 text-xl font-bold px-2 cursor-pointer">&times;</button>
          </div>

          <form (ngSubmit)="saveStudent()" class="p-6 space-y-5">
            @if (modalError()) {
              <div class="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {{ modalError() }}
              </div>
            }

            <!-- Nome e Cognome -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Nome *</label>
                <input
                  type="text"
                  name="nome"
                  [(ngModel)]="form.nome"
                  required
                  placeholder="Es. Giulia"
                  class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Cognome *</label>
                <input
                  type="text"
                  name="cognome"
                  [(ngModel)]="form.cognome"
                  required
                  placeholder="Es. Bianchi"
                  class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <!-- Contatti -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  [(ngModel)]="form.email"
                  placeholder="esempio@email.it"
                  class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Telefono</label>
                <input
                  type="tel"
                  name="telefono"
                  [(ngModel)]="form.telefono"
                  placeholder="+39 333 1234567"
                  class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <!-- Nascita -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Data di Nascita</label>
                <input
                  type="date"
                  name="data_nascita"
                  [(ngModel)]="form.data_nascita"
                  class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Luogo di Nascita</label>
                <input
                  type="text"
                  name="luogo_nascita"
                  [(ngModel)]="form.luogo_nascita"
                  placeholder="Es. Milano"
                  class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <!-- Residenza -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Indirizzo di Residenza</label>
                <input
                  type="text"
                  name="indirizzo_residenza"
                  [(ngModel)]="form.indirizzo_residenza"
                  placeholder="Es. Via Roma 10"
                  class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Citt&agrave; di Residenza</label>
                <input
                  type="text"
                  name="citta_residenza"
                  [(ngModel)]="form.citta_residenza"
                  placeholder="Es. Bologna"
                  class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <!-- Tessera -->
            <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div class="flex items-center justify-between">
                <label for="possiede_tessera" class="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    id="possiede_tessera"
                    type="checkbox"
                    name="possiede_tessera"
                    [(ngModel)]="form.possiede_tessera"
                    (ngModelChange)="onTesseraToggle($event)"
                    class="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500"
                  />
                  <span class="text-sm font-bold text-slate-800">Possiede Tessera Associativa</span>
                </label>
              </div>

              @if (form.possiede_tessera) {
                <div>
                  <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Data Scadenza Tessera</label>
                  <input
                    type="date"
                    name="data_scadenza_tessera"
                    [(ngModel)]="form.data_scadenza_tessera"
                    class="w-full sm:w-64 px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              }
            </div>

            <div class="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                (click)="closeStudentModal()"
                class="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Annulla
              </button>
              <button
                type="submit"
                [disabled]="isSaving() || !form.nome.trim() || !form.cognome.trim()"
                class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-sm font-bold rounded-xl shadow-sm transition-colors cursor-pointer"
              >
                {{ isSaving() ? 'Salvataggio...' : (editingStudentId() ? 'Salva Modifiche' : 'Crea Studente') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }

    <!-- MODAL: CORSI & ISCRIZIONI DELLO STUDENTE -->
    @if (showEnrollmentsModal() && selectedStudent()) {
      <div class="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
          <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
            <div>
              <h2 class="text-lg font-bold text-slate-800">
                Iscrizioni di {{ selectedStudent()!.cognome }} {{ selectedStudent()!.nome }}
              </h2>
              <p class="text-xs text-slate-500">Visualizza i corsi attivi o iscrivi lo studente a un nuovo corso</p>
            </div>
            <button type="button" (click)="closeEnrollmentsModal()" class="text-slate-400 hover:text-slate-700 text-xl font-bold px-2 cursor-pointer">&times;</button>
          </div>

          <div class="p-6 space-y-6">
            @if (enrollModalError()) {
              <div class="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {{ enrollModalError() }}
              </div>
            }

            <!-- Elenco Iscrizioni Attuali -->
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <h3 class="text-sm font-bold text-slate-800">Corsi a cui &egrave; iscritto</h3>
                <a
                  routerLink="/course-payments"
                  (click)="closeEnrollmentsModal()"
                  class="text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline"
                >
                  Vai a Pagamenti Corsi &rarr;
                </a>
              </div>

              @if (isLoadingDetail()) {
                <div class="py-6 text-center text-slate-400 text-xs">Caricamento iscrizioni...</div>
              } @else if (!selectedStudent()!.enrollments || selectedStudent()!.enrollments!.length === 0) {
                <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 text-center">
                  Nessuna iscrizione attiva per questo studente.
                </div>
              } @else {
                <div class="space-y-2.5">
                  @for (enr of selectedStudent()!.enrollments!; track enr.id) {
                    <div class="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div class="font-bold text-slate-900 text-sm">{{ enr.project_title || 'Corso' }}</div>
                        <div class="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-2">
                          <span>Rate: <strong>{{ enr.paid_installments_count ?? countPaidInstallments(enr) }}/{{ enr.installments_count }}</strong></span>
                          <span>&middot;</span>
                          <span>Totale: <strong>{{ enr.total_amount | currency:'EUR':'symbol':'1.2-2' }}</strong></span>
                          <span>&middot;</span>
                          <span>Incassato: <strong class="text-emerald-700">{{ enr.paid_amount | currency:'EUR':'symbol':'1.2-2' }}</strong></span>
                          <span>&middot;</span>
                          <span>
                            Rimanenza:
                            <strong [ngClass]="enr.remaining_amount > 0 ? 'text-amber-700' : 'text-emerald-700'">
                              {{ enr.remaining_amount | currency:'EUR':'symbol':'1.2-2' }}
                            </strong>
                          </span>
                        </div>
                      </div>

                      <div class="flex items-center gap-2 shrink-0">
                        <span
                          class="px-2.5 py-0.5 rounded-full text-[11px] font-bold border"
                          [ngClass]="enr.payment_status === 'PAID'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'"
                        >
                          {{ enr.payment_status === 'PAID' ? 'Saldato' : 'Da saldare' }}
                        </span>
                        <button
                          type="button"
                          (click)="removeEnrollment(enr.id)"
                          class="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg cursor-pointer"
                        >
                          Rimuovi
                        </button>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>

            <!-- Form Nuova Iscrizione -->
            <form (ngSubmit)="submitEnrollment()" class="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-200/80 space-y-4">
              <h3 class="text-sm font-bold text-indigo-900">Iscrivi a un nuovo corso</h3>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div class="sm:col-span-2">
                  <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Corso *</label>
                  <select
                    name="project_id"
                    [(ngModel)]="enrollForm.project_id"
                    (ngModelChange)="onCourseSelectChange($event)"
                    required
                    class="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="">Seleziona un corso...</option>
                    @for (course of courses(); track course.id) {
                      <option [value]="course.id">
                        {{ course.title }}
                        @if (course.enrollment_fee) { — €{{ course.enrollment_fee }} }
                        @if (course.max_enrolled) { ({{ course.actual_enrolled ?? 0 }}/{{ course.max_enrolled }} iscritti) }
                      </option>
                    }
                  </select>
                </div>

                @if (getSelectedCourseForEnroll(); as selectedCourse) {
                  @if (isCourseAtOrOverCapacity(selectedCourse)) {
                    <div class="sm:col-span-2 p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start space-x-2">
                      <span class="font-bold">Attenzione:</span>
                      <span>
                        Il corso ha gi&agrave; raggiunto o superato il tetto statistico di
                        <strong>{{ selectedCourse.max_enrolled }}</strong> iscritti
                        (attuali: {{ selectedCourse.actual_enrolled ?? 0 }}).
                        Puoi comunque procedere con l'iscrizione.
                      </span>
                    </div>
                  }
                }

                <div>
                  <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Importo Totale (&euro;) *</label>
                  <input
                    type="number"
                    name="total_amount"
                    step="0.01"
                    min="0"
                    [(ngModel)]="enrollForm.total_amount"
                    required
                    class="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Numero Rate (1-4) *</label>
                  <select
                    name="installments_count"
                    [(ngModel)]="enrollForm.installments_count"
                    class="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option [ngValue]="1">1 rata (unica soluzione)</option>
                    <option [ngValue]="2">2 rate</option>
                    <option [ngValue]="3">3 rate</option>
                    <option [ngValue]="4">4 rate</option>
                  </select>
                  @if (enrollForm.total_amount > 0 && enrollForm.installments_count > 1) {
                    <p class="text-[11px] text-slate-500 mt-1">
                      Circa {{ (enrollForm.total_amount / enrollForm.installments_count) | currency:'EUR':'symbol':'1.2-2' }} a rata
                    </p>
                  }
                </div>

                <div class="sm:col-span-2">
                  <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Note</label>
                  <input
                    type="text"
                    name="notes"
                    [(ngModel)]="enrollForm.notes"
                    placeholder="Note opzionali sull'iscrizione..."
                    class="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div class="flex justify-end">
                <button
                  type="submit"
                  [disabled]="isEnrolling() || !enrollForm.project_id"
                  class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-sm font-bold rounded-xl shadow-sm transition-colors cursor-pointer"
                >
                  {{ isEnrolling() ? 'Iscrizione...' : 'Conferma Iscrizione' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    }
  `
})
export class CourseStudentsComponent implements OnInit {
  private api = inject(ApiService);

  students = signal<CourseStudent[]>([]);
  summary = signal<CourseStudentSummary>({
    total: 0,
    valid: 0,
    expiring_soon: 0,
    expired: 0,
    no_card: 0
  });
  courses = signal<Project[]>([]);

  isLoading = signal(false);
  searchQuery = signal('');
  selectedCardStatus = signal('');

  alertMessage = signal<string | null>(null);
  alertType = signal<'success' | 'warning' | 'error'>('success');

  // Create / Edit Modal
  showStudentModal = signal(false);
  editingStudentId = signal<string | null>(null);
  isSaving = signal(false);
  modalError = signal<string | null>(null);

  form: StudentFormModel = this.createEmptyForm();

  // Enrollments Modal
  showEnrollmentsModal = signal(false);
  selectedStudent = signal<CourseStudent | null>(null);
  isLoadingDetail = signal(false);
  isEnrolling = signal(false);
  enrollModalError = signal<string | null>(null);

  enrollForm = {
    project_id: '',
    total_amount: 0,
    installments_count: 1,
    notes: ''
  };

  getSelectedCourseForEnroll(): Project | null {
    const id = this.enrollForm.project_id;
    if (!id) return null;
    return this.courses().find(c => c.id === id) || null;
  }

  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.loadStudents();
    this.loadCourses();
  }

  loadStudents(): void {
    this.isLoading.set(true);
    this.api.getCourseStudents({
      search: this.searchQuery().trim() || undefined,
      card_status: this.selectedCardStatus() || undefined
    }).subscribe({
      next: res => {
        this.students.set(res.students || []);
        if (res.summary) {
          this.summary.set(res.summary);
        }
        this.isLoading.set(false);
      },
      error: err => {
        console.error('Errore caricamento studenti corsi', err);
        this.showAlert('Errore durante il caricamento degli studenti corsi.', 'error');
        this.isLoading.set(false);
      }
    });
  }

  loadCourses(): void {
    this.api.getProjects().subscribe({
      next: projects => {
        this.courses.set((projects || []).filter(p => p.type !== 'DOPOSCUOLA'));
      },
      error: err => {
        console.error('Errore caricamento corsi', err);
      }
    });
  }

  onSearchChange(value: string): void {
    this.searchQuery.set(value);
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    this.searchTimeout = setTimeout(() => {
      this.loadStudents();
    }, 250);
  }

  setCardStatusFilter(status: string): void {
    this.selectedCardStatus.set(status);
    this.loadStudents();
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.selectedCardStatus.set('');
    this.loadStudents();
  }

  // ---- Student Create / Edit Modal ----
  openCreateModal(): void {
    this.editingStudentId.set(null);
    this.form = this.createEmptyForm();
    this.modalError.set(null);
    this.showStudentModal.set(true);
  }

  openEditModal(student: CourseStudent): void {
    this.editingStudentId.set(student.id);
    this.form = {
      nome: student.nome || '',
      cognome: student.cognome || '',
      email: student.email || '',
      telefono: student.telefono || '',
      data_nascita: student.data_nascita ? String(student.data_nascita).slice(0, 10) : '',
      luogo_nascita: student.luogo_nascita || '',
      indirizzo_residenza: student.indirizzo_residenza || '',
      citta_residenza: student.citta_residenza || '',
      possiede_tessera: !!student.possiede_tessera,
      data_scadenza_tessera: student.data_scadenza_tessera ? String(student.data_scadenza_tessera).slice(0, 10) : ''
    };
    this.modalError.set(null);
    this.showStudentModal.set(true);
  }

  closeStudentModal(): void {
    this.showStudentModal.set(false);
    this.editingStudentId.set(null);
    this.modalError.set(null);
  }

  onTesseraToggle(checked: boolean): void {
    if (!checked) {
      this.form.data_scadenza_tessera = '';
    }
  }

  saveStudent(): void {
    if (!this.form.nome.trim() || !this.form.cognome.trim()) {
      this.modalError.set('Nome e Cognome sono obbligatori.');
      return;
    }

    this.isSaving.set(true);
    this.modalError.set(null);

    const payload: Partial<CourseStudent> = {
      nome: this.form.nome.trim(),
      cognome: this.form.cognome.trim(),
      email: this.form.email.trim() || null,
      telefono: this.form.telefono.trim() || null,
      data_nascita: this.form.data_nascita || null,
      luogo_nascita: this.form.luogo_nascita.trim() || null,
      indirizzo_residenza: this.form.indirizzo_residenza.trim() || null,
      citta_residenza: this.form.citta_residenza.trim() || null,
      possiede_tessera: !!this.form.possiede_tessera,
      data_scadenza_tessera: this.form.possiede_tessera && this.form.data_scadenza_tessera
        ? this.form.data_scadenza_tessera
        : null
    };

    const editingId = this.editingStudentId();
    const request$ = editingId
      ? this.api.updateCourseStudent(editingId, payload)
      : this.api.createCourseStudent(payload);

    request$.subscribe({
      next: () => {
        this.isSaving.set(false);
        this.closeStudentModal();
        this.showAlert(
          editingId ? 'Studente aggiornato correttamente.' : 'Nuovo studente creato correttamente.',
          'success'
        );
        this.loadStudents();
      },
      error: err => {
        this.isSaving.set(false);
        this.modalError.set(err?.error?.error || 'Errore durante il salvataggio dello studente.');
      }
    });
  }

  deleteStudent(student: CourseStudent): void {
    if (!confirm(`Eliminare lo studente ${student.cognome} ${student.nome} e tutte le relative iscrizioni?`)) {
      return;
    }
    this.api.deleteCourseStudent(student.id).subscribe({
      next: () => {
        this.showAlert(`Studente ${student.cognome} ${student.nome} eliminato.`, 'success');
        this.loadStudents();
        this.loadCourses();
      },
      error: err => {
        this.showAlert(err?.error?.error || 'Errore durante l\'eliminazione dello studente.', 'error');
      }
    });
  }

  // ---- Enrollments Modal ----
  openEnrollmentsModal(student: CourseStudent): void {
    this.selectedStudent.set(student);
    this.enrollModalError.set(null);
    this.enrollForm = {
      project_id: '',
      total_amount: 0,
      installments_count: 1,
      notes: ''
    };
    this.showEnrollmentsModal.set(true);
    this.refreshSelectedStudent(student.id);
  }

  closeEnrollmentsModal(): void {
    this.showEnrollmentsModal.set(false);
    this.selectedStudent.set(null);
    this.enrollModalError.set(null);
  }

  refreshSelectedStudent(studentId: string): void {
    this.isLoadingDetail.set(true);
    this.api.getCourseStudent(studentId).subscribe({
      next: detail => {
        this.selectedStudent.set(detail);
        this.isLoadingDetail.set(false);
      },
      error: err => {
        this.isLoadingDetail.set(false);
        this.enrollModalError.set(err?.error?.error || 'Errore durante il caricamento delle iscrizioni.');
      }
    });
  }

  onCourseSelectChange(projectId: string): void {
    const course = this.courses().find(c => c.id === projectId);
    if (course) {
      this.enrollForm.total_amount = Number(course.enrollment_fee ?? 0);
    } else {
      this.enrollForm.total_amount = 0;
    }
  }

  isCourseAtOrOverCapacity(course: Project): boolean {
    const max = Number(course.max_enrolled ?? 0);
    const actual = Number(course.actual_enrolled ?? 0);
    return max > 0 && actual >= max;
  }

  submitEnrollment(): void {
    const student = this.selectedStudent();
    if (!student || !this.enrollForm.project_id) return;

    this.isEnrolling.set(true);
    this.enrollModalError.set(null);

    this.api.createCourseEnrollment({
      course_student_id: student.id,
      project_id: this.enrollForm.project_id,
      total_amount: Number(this.enrollForm.total_amount),
      installments_count: Number(this.enrollForm.installments_count),
      notes: this.enrollForm.notes.trim() || undefined
    }).subscribe({
      next: res => {
        this.isEnrolling.set(false);
        this.enrollForm = {
          project_id: '',
          total_amount: 0,
          installments_count: 1,
          notes: ''
        };
        if (res?.over_capacity) {
          this.showAlert(
            `Iscrizione registrata. Avviso statistico: il corso ha superato il tetto massimo (${res.actual_enrolled}/${res.max_enrolled}).`,
            'warning'
          );
        } else {
          this.showAlert('Iscrizione al corso registrata correttamente.', 'success');
        }
        this.refreshSelectedStudent(student.id);
        this.loadStudents();
        this.loadCourses();
      },
      error: err => {
        this.isEnrolling.set(false);
        this.enrollModalError.set(err?.error?.error || 'Errore durante la creazione dell\'iscrizione.');
      }
    });
  }

  removeEnrollment(enrollmentId: string): void {
    const student = this.selectedStudent();
    if (!student) return;
    if (!confirm('Rimuovere questa iscrizione dal corso e le relative rate?')) {
      return;
    }
    this.api.deleteCourseEnrollment(enrollmentId).subscribe({
      next: () => {
        this.showAlert('Iscrizione rimossa.', 'success');
        this.refreshSelectedStudent(student.id);
        this.loadStudents();
        this.loadCourses();
      },
      error: err => {
        this.enrollModalError.set(err?.error?.error || 'Errore durante la rimozione dell\'iscrizione.');
      }
    });
  }

  // ---- Helpers ----
  countPaidInstallments(enrollment: { installments?: { status: string }[] }): number {
    return (enrollment.installments || []).filter(i => i.status === 'PAID').length;
  }

  getCardBadgeClass(status?: CardStatus): string {
    switch (status) {
      case 'VALIDA':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'IN_SCADENZA':
        return 'bg-amber-50 text-amber-800 border-amber-300';
      case 'SCADUTA':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  }

  getCardBadgeLabel(student: CourseStudent): string {
    switch (student.card_status) {
      case 'VALIDA':
        return 'Valida';
      case 'IN_SCADENZA':
        return student.days_to_expiry !== null && student.days_to_expiry !== undefined
          ? `In scadenza (${student.days_to_expiry} gg)`
          : 'In scadenza';
      case 'SCADUTA':
        return 'Scaduta';
      default:
        return 'Nessuna tessera';
    }
  }

  formatDate(dateStr?: string | null): string {
    if (!dateStr) return '—';
    const d = String(dateStr).slice(0, 10);
    const parts = d.split('-');
    if (parts.length !== 3) return d;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  private createEmptyForm(): StudentFormModel {
    return {
      nome: '',
      cognome: '',
      email: '',
      telefono: '',
      data_nascita: '',
      luogo_nascita: '',
      indirizzo_residenza: '',
      citta_residenza: '',
      possiede_tessera: false,
      data_scadenza_tessera: ''
    };
  }

  private showAlert(message: string, type: 'success' | 'warning' | 'error'): void {
    this.alertMessage.set(message);
    this.alertType.set(type);
  }
}
