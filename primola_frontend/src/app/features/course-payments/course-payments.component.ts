import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import {
  CardStatus,
  CourseEnrollment,
  CourseEnrollmentsSummary,
  CourseInstallment,
  CourseStudent,
  Project
} from '../../core/models';

const PAYMENT_METHODS = ['Bonifico', 'Contanti', 'POS / Carta'];

@Component({
  selector: 'app-course-payments',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="p-3 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-5 pb-12">
      <!-- Header -->
      <div class="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center space-x-2">
            <h1 class="text-xl sm:text-2xl font-bold text-slate-800">Pagamenti Corsi</h1>
            <span class="text-[10px] sm:text-xs bg-indigo-500/10 text-indigo-700 font-bold px-2.5 py-0.5 rounded-full border border-indigo-500/20">
              RATE 1–4
            </span>
          </div>
          <p class="text-xs sm:text-sm text-slate-500 mt-1">
            Gestione iscrizioni ai corsi, rateizzazioni, incassi, storni e rimanenze da saldare
          </p>
        </div>

        <button
          type="button"
          (click)="openNewEnrollmentModal()"
          class="min-h-[44px] px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors flex items-center justify-center space-x-2 cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>Nuova Iscrizione</span>
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

      <!-- KPI Cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div class="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm">
          <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Iscrizioni Totali</p>
          <p class="text-xl sm:text-2xl font-black text-slate-900 mt-1">{{ summary().total_enrollments }}</p>
          <p class="text-[11px] text-slate-400 mt-0.5">Corsi &amp; laboratori filtrati</p>
        </div>

        <div class="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm">
          <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Totale Dovuto</p>
          <p class="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            {{ summary().total_amount | currency:'EUR':'symbol':'1.2-2' }}
          </p>
          <p class="text-[11px] text-slate-400 mt-0.5">Somma quote iscrizione</p>
        </div>

        <div class="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm">
          <p class="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Totale Incassato</p>
          <p class="text-xl sm:text-2xl font-black text-emerald-700 mt-1">
            {{ summary().total_paid | currency:'EUR':'symbol':'1.2-2' }}
          </p>
          <p class="text-[11px] text-slate-400 mt-0.5">Rate effettivamente saldate</p>
        </div>

        <div class="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm">
          <p class="text-xs font-semibold text-amber-600 uppercase tracking-wider">Rimanenze da Pagare</p>
          <p class="text-xl sm:text-2xl font-black text-amber-600 mt-1">
            {{ summary().total_remaining | currency:'EUR':'symbol':'1.2-2' }}
          </p>
          <p class="text-[11px] text-slate-400 mt-0.5">Quote residue ancora aperte</p>
        </div>
      </div>

      <!-- Filter Bar -->
      <div class="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
          <select
            [ngModel]="selectedProjectId()"
            (ngModelChange)="onProjectFilterChange($event)"
            class="px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 font-medium"
          >
            <option value="">Tutti i corsi</option>
            @for (course of courses(); track course.id) {
              <option [value]="course.id">{{ course.title }}</option>
            }
          </select>

          <select
            [ngModel]="selectedStatus()"
            (ngModelChange)="onStatusFilterChange($event)"
            class="px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 font-medium"
          >
            <option value="">Tutti gli stati</option>
            <option value="PENDING">Da saldare</option>
            <option value="PAID">Saldato</option>
          </select>

          <input
            type="text"
            [ngModel]="searchQuery()"
            (ngModelChange)="onSearchChange($event)"
            placeholder="Cerca studente..."
            class="px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
          />
        </div>

        @if (selectedProjectId() || selectedStatus() || searchQuery()) {
          <button
            type="button"
            (click)="resetFilters()"
            class="text-xs font-semibold text-slate-500 hover:text-slate-800 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer self-start md:self-auto"
          >
            Azzera filtri
          </button>
        }
      </div>

      <!-- Enrollments List (Responsive Cards + Desktop Table) -->
      @if (isLoading()) {
        <div class="bg-white rounded-2xl border border-slate-200/80 p-10 text-center text-slate-400 text-sm">
          <div class="inline-block animate-spin rounded-full h-6 w-6 border-2 border-emerald-600 border-t-transparent mr-2 align-middle"></div>
          Caricamento iscrizioni e pagamenti...
        </div>
      } @else if (enrollments().length === 0) {
        <div class="bg-white rounded-2xl border border-slate-200/80 p-10 text-center text-slate-400 text-sm">
          Nessuna iscrizione trovata per i criteri selezionati.
        </div>
      } @else {
        <!-- Mobile Cards -->
        <div class="block lg:hidden space-y-3">
          @for (enr of enrollments(); track enr.id) {
            <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div class="p-4 space-y-3">
                <div class="flex items-start justify-between gap-2">
                  <div>
                    <div class="font-bold text-slate-900 text-sm">
                      {{ enr.student_cognome }} {{ enr.student_nome }}
                    </div>
                    <div class="text-xs font-semibold text-indigo-700 mt-0.5">{{ enr.project_title || 'Corso' }}</div>
                  </div>
                  <span
                    class="px-2.5 py-0.5 rounded-full text-[11px] font-bold border shrink-0"
                    [ngClass]="enr.payment_status === 'PAID'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'"
                  >
                    {{ enr.payment_status === 'PAID' ? 'Saldato' : 'Da saldare' }}
                  </span>
                </div>

                <div class="grid grid-cols-3 gap-2 text-center text-xs pt-2 border-t border-slate-100">
                  <div class="p-2 rounded-xl bg-slate-50">
                    <div class="text-[10px] text-slate-400 font-semibold uppercase">Totale</div>
                    <div class="font-bold text-slate-900">{{ enr.total_amount | currency:'EUR':'symbol':'1.2-2' }}</div>
                  </div>
                  <div class="p-2 rounded-xl bg-slate-50">
                    <div class="text-[10px] text-slate-400 font-semibold uppercase">Incassato</div>
                    <div class="font-bold text-emerald-700">{{ enr.paid_amount | currency:'EUR':'symbol':'1.2-2' }}</div>
                  </div>
                  <div class="p-2 rounded-xl bg-slate-50">
                    <div class="text-[10px] text-slate-400 font-semibold uppercase">Rimanenza</div>
                    <div class="font-bold" [ngClass]="enr.remaining_amount > 0 ? 'text-amber-700' : 'text-emerald-700'">
                      {{ enr.remaining_amount | currency:'EUR':'symbol':'1.2-2' }}
                    </div>
                  </div>
                </div>

                <div class="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    (click)="toggleExpand(enr.id)"
                    class="flex-1 min-h-[40px] px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                  >
                    {{ isExpanded(enr.id) ? 'Nascondi Rate' : 'Rate (' + getPaidCount(enr) + '/' + enr.installments_count + ')' }}
                  </button>

                  @if (enr.remaining_amount > 0) {
                    <button
                      type="button"
                      (click)="openSettleModal(enr)"
                      class="min-h-[40px] px-3 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors cursor-pointer"
                    >
                      Salda Tutto
                    </button>
                  }

                  <button
                    type="button"
                    (click)="deleteEnrollment(enr)"
                    class="min-h-[40px] px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors cursor-pointer"
                  >
                    Elimina
                  </button>
                </div>
              </div>

              @if (isExpanded(enr.id)) {
                <div class="border-t border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5">
                  @for (inst of enr.installments; track inst.id) {
                    <div class="bg-white rounded-xl border border-slate-200 p-3 space-y-2">
                      <div class="flex items-center justify-between gap-2">
                        <span class="text-xs font-bold text-slate-800">
                          Rata {{ inst.installment_number }}/{{ enr.installments_count }}
                        </span>
                        <span
                          class="px-2 py-0.5 rounded-full text-[10px] font-bold border"
                          [ngClass]="inst.status === 'PAID'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'"
                        >
                          {{ inst.status === 'PAID' ? 'Pagata' : 'Da pagare' }}
                        </span>
                      </div>

                      @if (editingInstallmentId() === inst.id) {
                        <div class="flex items-center gap-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            [(ngModel)]="inlineAmount"
                            class="w-28 px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                          />
                          <button
                            type="button"
                            (click)="saveInlineInstallment(inst.id)"
                            class="px-2.5 py-1.5 text-xs font-bold text-white bg-emerald-600 rounded-lg cursor-pointer"
                          >
                            Salva
                          </button>
                          <button
                            type="button"
                            (click)="cancelInlineEdit()"
                            class="px-2 py-1.5 text-xs text-slate-500 cursor-pointer"
                          >
                            Annulla
                          </button>
                        </div>
                      } @else {
                        <div class="flex items-center justify-between text-xs">
                          <span class="font-black text-slate-900 text-sm">{{ inst.amount | currency:'EUR':'symbol':'1.2-2' }}</span>
                          @if (inst.status === 'PAID') {
                            <span class="text-slate-500">
                              {{ formatDate(inst.paid_at) }} · {{ inst.payment_method || 'N/D' }}
                            </span>
                          }
                        </div>
                      }

                      @if (inst.notes) {
                        <p class="text-[11px] text-slate-500 italic">{{ inst.notes }}</p>
                      }

                      <div class="flex items-center justify-end gap-2 pt-1">
                        @if (inst.status === 'PENDING') {
                          <button
                            type="button"
                            (click)="startInlineEdit(inst)"
                            class="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                          >
                            Modifica Importo
                          </button>
                          <button
                            type="button"
                            (click)="openPayInstallmentModal(enr, inst)"
                            class="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer"
                          >
                            Paga Rata
                          </button>
                        } @else {
                          <button
                            type="button"
                            (click)="unpayInstallment(inst)"
                            class="px-2.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg cursor-pointer"
                          >
                            Storna
                          </button>
                        }
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          }
        </div>

        <!-- Desktop Table -->
        <div class="hidden lg:block bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm text-slate-600">
              <thead class="bg-slate-50/75 border-b border-slate-200 text-[11px] font-semibold uppercase text-slate-500 tracking-wider">
                <tr>
                  <th class="px-3 py-3">Studente</th>
                  <th class="px-3 py-3">Corso</th>
                  <th class="px-3 py-3 text-center whitespace-nowrap">Rate</th>
                  <th class="px-3 py-3 text-right whitespace-nowrap">Totale</th>
                  <th class="px-3 py-3 text-right whitespace-nowrap">Incassato</th>
                  <th class="px-3 py-3 text-right whitespace-nowrap">Rimanenza</th>
                  <th class="px-3 py-3 text-center whitespace-nowrap">Stato</th>
                  <th class="px-3 py-3 text-right whitespace-nowrap">Azioni</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                @for (enr of enrollments(); track enr.id) {
                  <tr class="hover:bg-slate-50/70 transition-colors">
                    <td class="px-3 py-3">
                      <div class="font-bold text-slate-900 text-xs">{{ enr.student_cognome }} {{ enr.student_nome }}</div>
                      <div class="flex flex-wrap items-center gap-1.5 mt-0.5">
                        @if (enr.student_card_status) {
                          <span
                            class="px-1.5 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap"
                            [ngClass]="getCardBadgeClass(enr.student_card_status)"
                          >
                            {{ getCardShortLabel(enr.student_card_status) }}
                          </span>
                        }
                      </div>
                    </td>

                    <td class="px-3 py-3 max-w-[180px]">
                      <div class="font-semibold text-slate-800 text-xs leading-snug">{{ enr.project_title || 'Corso' }}</div>
                      <div class="text-[10px] text-slate-400 whitespace-nowrap">{{ formatDate(enr.enrolled_at) }}</div>
                    </td>

                    <td class="px-3 py-3 text-center whitespace-nowrap">
                      <div class="text-xs font-bold text-slate-800">
                        {{ getPaidCount(enr) }}/{{ enr.installments_count }}
                      </div>
                      <div class="w-14 h-1.5 bg-slate-200 rounded-full overflow-hidden mx-auto mt-1">
                        <div
                          class="h-full rounded-full transition-all"
                          [ngClass]="enr.payment_status === 'PAID' ? 'bg-emerald-500' : 'bg-indigo-500'"
                          [style.width.%]="getProgressPercent(enr)"
                        ></div>
                      </div>
                    </td>

                    <td class="px-3 py-3 text-right font-semibold text-slate-800 text-xs whitespace-nowrap">
                      {{ enr.total_amount | currency:'EUR':'symbol':'1.2-2' }}
                    </td>

                    <td class="px-3 py-3 text-right font-bold text-emerald-700 text-xs whitespace-nowrap">
                      {{ enr.paid_amount | currency:'EUR':'symbol':'1.2-2' }}
                    </td>

                    <td class="px-3 py-3 text-right font-bold text-xs whitespace-nowrap">
                      <span [ngClass]="enr.remaining_amount > 0 ? 'text-amber-700' : 'text-emerald-700'">
                        {{ enr.remaining_amount | currency:'EUR':'symbol':'1.2-2' }}
                      </span>
                    </td>

                    <td class="px-3 py-3 text-center whitespace-nowrap">
                      <span
                        class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border whitespace-nowrap"
                        [ngClass]="enr.payment_status === 'PAID'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'"
                      >
                        {{ enr.payment_status === 'PAID' ? 'Saldato' : 'Da saldare' }}
                      </span>
                    </td>

                    <td class="px-3 py-3 text-right whitespace-nowrap">
                      <div class="inline-flex items-center justify-end gap-1">
                        @if (enr.remaining_amount > 0) {
                          <button
                            type="button"
                            (click)="openSettleModal(enr)"
                            class="px-2 py-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                          >
                            Salda
                          </button>
                        }
                        <button
                          type="button"
                          (click)="toggleExpand(enr.id)"
                          class="px-2 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                        >
                          {{ isExpanded(enr.id) ? 'Chiudi' : 'Rate' }}
                        </button>
                        <button
                          type="button"
                          (click)="deleteEnrollment(enr)"
                          class="px-2 py-1 text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                        >
                          Elimina
                        </button>
                      </div>
                    </td>
                  </tr>

                  <!-- Expanded Installments Row -->
                  @if (isExpanded(enr.id)) {
                    <tr class="bg-slate-50/80">
                      <td colspan="8" class="px-6 py-4">
                        <div class="rounded-xl border border-slate-200 bg-white overflow-hidden">
                          <div class="px-4 py-2.5 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between">
                            <span class="text-xs font-bold uppercase tracking-wider text-slate-600">
                              Piano Rateale — {{ enr.student_cognome }} {{ enr.student_nome }} ({{ enr.project_title }})
                            </span>
                            @if (enr.notes) {
                              <span class="text-xs text-slate-500">Note iscrizione: {{ enr.notes }}</span>
                            }
                          </div>

                          <table class="w-full text-left text-xs text-slate-600">
                            <thead class="bg-slate-50 border-b border-slate-100 text-[11px] font-semibold uppercase text-slate-400">
                              <tr>
                                <th class="px-4 py-2.5">Rata</th>
                                <th class="px-4 py-2.5 text-right">Importo</th>
                                <th class="px-4 py-2.5 text-center">Stato</th>
                                <th class="px-4 py-2.5">Data Pagamento</th>
                                <th class="px-4 py-2.5">Metodo</th>
                                <th class="px-4 py-2.5">Note</th>
                                <th class="px-4 py-2.5 text-right">Azioni</th>
                              </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100">
                              @for (inst of enr.installments; track inst.id) {
                                <tr class="hover:bg-slate-50/60">
                                  <td class="px-4 py-3 font-bold text-slate-800">
                                    Rata {{ inst.installment_number }}/{{ enr.installments_count }}
                                  </td>

                                  <td class="px-4 py-3 text-right">
                                    @if (editingInstallmentId() === inst.id) {
                                      <div class="inline-flex items-center gap-1.5">
                                        <input
                                          type="number"
                                          step="0.01"
                                          min="0"
                                          [(ngModel)]="inlineAmount"
                                          class="w-24 px-2 py-1 text-right text-xs bg-white border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                        <button
                                          type="button"
                                          (click)="saveInlineInstallment(inst.id)"
                                          [disabled]="isSubmitting()"
                                          class="px-2 py-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md cursor-pointer"
                                        >
                                          OK
                                        </button>
                                        <button
                                          type="button"
                                          (click)="cancelInlineEdit()"
                                          class="px-1.5 py-1 text-[11px] text-slate-500 hover:text-slate-800 cursor-pointer"
                                        >
                                          &times;
                                        </button>
                                      </div>
                                    } @else {
                                      <span class="font-bold text-slate-900">
                                        {{ inst.amount | currency:'EUR':'symbol':'1.2-2' }}
                                      </span>
                                    }
                                  </td>

                                  <td class="px-4 py-3 text-center">
                                    <span
                                      class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border"
                                      [ngClass]="inst.status === 'PAID'
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : 'bg-amber-50 text-amber-800 border-amber-200'"
                                    >
                                      {{ inst.status === 'PAID' ? 'Pagata' : 'Da pagare' }}
                                    </span>
                                  </td>

                                  <td class="px-4 py-3 text-slate-700">
                                    {{ inst.paid_at ? formatDate(inst.paid_at) : '—' }}
                                  </td>

                                  <td class="px-4 py-3 text-slate-700">
                                    {{ inst.payment_method || '—' }}
                                  </td>

                                  <td class="px-4 py-3 text-slate-500">
                                    {{ inst.notes || '—' }}
                                  </td>

                                  <td class="px-4 py-3 text-right">
                                    <div class="inline-flex items-center justify-end gap-1.5">
                                      @if (inst.status === 'PENDING') {
                                        <button
                                          type="button"
                                          (click)="startInlineEdit(inst)"
                                          class="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                                        >
                                          Modifica Importo
                                        </button>
                                        <button
                                          type="button"
                                          (click)="openPayInstallmentModal(enr, inst)"
                                          class="px-3 py-1 text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer"
                                        >
                                          Paga Rata
                                        </button>
                                      } @else {
                                        <button
                                          type="button"
                                          (click)="unpayInstallment(inst)"
                                          class="px-2.5 py-1 text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg cursor-pointer"
                                        >
                                          Storna
                                        </button>
                                      }
                                    </div>
                                  </td>
                                </tr>
                              }
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  }
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </div>

    <!-- MODAL: NUOVA ISCRIZIONE -->
    @if (showNewEnrollmentModal()) {
      <div class="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 class="text-lg font-bold text-slate-800">Nuova Iscrizione Corso</h2>
              <p class="text-xs text-slate-500">Seleziona studente, corso e piano rateale (1–4 rate)</p>
            </div>
            <button type="button" (click)="closeNewEnrollmentModal()" class="text-slate-400 hover:text-slate-700 text-xl font-bold px-2 cursor-pointer">&times;</button>
          </div>

          <form (ngSubmit)="submitNewEnrollment()" class="p-6 space-y-4">
            @if (modalError()) {
              <div class="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {{ modalError() }}
              </div>
            }

            <div>
              <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Studente Corso *</label>
              <select
                name="course_student_id"
                [(ngModel)]="newEnrollForm.course_student_id"
                required
                class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="">Seleziona uno studente...</option>
                @for (stu of students(); track stu.id) {
                  <option [value]="stu.id">{{ stu.cognome }} {{ stu.nome }}</option>
                }
              </select>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Corso *</label>
              <select
                name="project_id"
                [(ngModel)]="newEnrollForm.project_id"
                (ngModelChange)="onNewEnrollCourseChange($event)"
                required
                class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="">Seleziona un corso...</option>
                @for (course of courses(); track course.id) {
                  <option [value]="course.id">
                    {{ course.title }}
                    @if (course.enrollment_fee) { — €{{ course.enrollment_fee }} }
                    @if (course.max_enrolled) { ({{ course.actual_enrolled ?? 0 }}/{{ course.max_enrolled }}) }
                  </option>
                }
              </select>
            </div>

            @if (getSelectedCourseForNewEnroll(); as selectedCourse) {
              @if (isCourseAtOrOverCapacity(selectedCourse)) {
                <div class="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs">
                  <strong>Avviso statistico:</strong> il corso ha gi&agrave; raggiunto/superato il tetto di
                  <strong>{{ selectedCourse.max_enrolled }}</strong> iscritti
                  (attuali: {{ selectedCourse.actual_enrolled ?? 0 }}). Puoi comunque procedere.
                </div>
              }
            }

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Importo Totale (&euro;) *</label>
                <input
                  type="number"
                  name="total_amount"
                  step="0.01"
                  min="0"
                  [(ngModel)]="newEnrollForm.total_amount"
                  required
                  class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Numero Rate (1–4) *</label>
                <select
                  name="installments_count"
                  [(ngModel)]="newEnrollForm.installments_count"
                  class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option [ngValue]="1">1 rata (unica soluzione)</option>
                  <option [ngValue]="2">2 rate</option>
                  <option [ngValue]="3">3 rate</option>
                  <option [ngValue]="4">4 rate</option>
                </select>
              </div>
            </div>

            @if (newEnrollForm.total_amount > 0 && newEnrollForm.installments_count > 1) {
              <p class="text-xs text-slate-500">
                Suddivisione stimata: <strong>{{ (newEnrollForm.total_amount / newEnrollForm.installments_count) | currency:'EUR':'symbol':'1.2-2' }}</strong> per rata.
              </p>
            }

            <div>
              <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Note</label>
              <input
                type="text"
                name="notes"
                [(ngModel)]="newEnrollForm.notes"
                placeholder="Note opzionali..."
                class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div class="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                (click)="closeNewEnrollmentModal()"
                class="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Annulla
              </button>
              <button
                type="submit"
                [disabled]="isSubmitting() || !newEnrollForm.course_student_id || !newEnrollForm.project_id"
                class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-sm font-bold rounded-xl shadow-sm cursor-pointer"
              >
                {{ isSubmitting() ? 'Salvataggio...' : 'Crea Iscrizione' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }

    <!-- MODAL: PAGA SINGOLA RATA -->
    @if (showPayModal() && activeInstallment() && activeEnrollment()) {
      <div class="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md">
          <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 class="text-lg font-bold text-slate-800">
                Paga Rata {{ activeInstallment()!.installment_number }}/{{ activeEnrollment()!.installments_count }}
              </h2>
              <p class="text-xs text-slate-500">
                {{ activeEnrollment()!.student_cognome }} {{ activeEnrollment()!.student_nome }} · {{ activeEnrollment()!.project_title }}
              </p>
            </div>
            <button type="button" (click)="closePayModal()" class="text-slate-400 hover:text-slate-700 text-xl font-bold px-2 cursor-pointer">&times;</button>
          </div>

          <form (ngSubmit)="submitPayInstallment()" class="p-6 space-y-4">
            @if (modalError()) {
              <div class="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {{ modalError() }}
              </div>
            }

            <div>
              <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Importo (&euro;) *</label>
              <input
                type="number"
                name="pay_amount"
                step="0.01"
                min="0"
                [(ngModel)]="payForm.amount"
                required
                class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Metodo di Pagamento *</label>
              <select
                name="pay_method"
                [(ngModel)]="payForm.payment_method"
                required
                class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                @for (m of paymentMethods; track m) {
                  <option [value]="m">{{ m }}</option>
                }
              </select>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Data Pagamento *</label>
              <input
                type="date"
                name="pay_date"
                [(ngModel)]="payForm.paid_at"
                required
                class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Note</label>
              <input
                type="text"
                name="pay_notes"
                [(ngModel)]="payForm.notes"
                placeholder="Riferimento bonifico, ricevuta..."
                class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div class="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                (click)="closePayModal()"
                class="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Annulla
              </button>
              <button
                type="submit"
                [disabled]="isSubmitting()"
                class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-sm font-bold rounded-xl shadow-sm cursor-pointer"
              >
                {{ isSubmitting() ? 'Registrazione...' : 'Conferma Pagamento' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }

    <!-- MODAL: SALDA TUTTO -->
    @if (showSettleModal() && activeEnrollment()) {
      <div class="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md">
          <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 class="text-lg font-bold text-slate-800">Salda Tutte le Rate</h2>
              <p class="text-xs text-slate-500">
                {{ activeEnrollment()!.student_cognome }} {{ activeEnrollment()!.student_nome }} · {{ activeEnrollment()!.project_title }}
              </p>
            </div>
            <button type="button" (click)="closeSettleModal()" class="text-slate-400 hover:text-slate-700 text-xl font-bold px-2 cursor-pointer">&times;</button>
          </div>

          <form (ngSubmit)="submitSettleEnrollment()" class="p-6 space-y-4">
            @if (modalError()) {
              <div class="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {{ modalError() }}
              </div>
            }

            <div class="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
              <span class="text-xs font-semibold text-emerald-800">Importo residuo da saldare</span>
              <span class="text-lg font-black text-emerald-700">
                {{ activeEnrollment()!.remaining_amount | currency:'EUR':'symbol':'1.2-2' }}
              </span>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Metodo di Pagamento *</label>
              <select
                name="settle_method"
                [(ngModel)]="settleForm.payment_method"
                required
                class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                @for (m of paymentMethods; track m) {
                  <option [value]="m">{{ m }}</option>
                }
              </select>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Data Pagamento *</label>
              <input
                type="date"
                name="settle_date"
                [(ngModel)]="settleForm.paid_at"
                required
                class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Note</label>
              <input
                type="text"
                name="settle_notes"
                [(ngModel)]="settleForm.notes"
                placeholder="Note saldo completo..."
                class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div class="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                (click)="closeSettleModal()"
                class="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Annulla
              </button>
              <button
                type="submit"
                [disabled]="isSubmitting()"
                class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-sm font-bold rounded-xl shadow-sm cursor-pointer"
              >
                {{ isSubmitting() ? 'Salvataggio...' : 'Conferma Saldo Totale' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `
})
export class CoursePaymentsComponent implements OnInit {
  private api = inject(ApiService);

  readonly paymentMethods = PAYMENT_METHODS;

  enrollments = signal<CourseEnrollment[]>([]);
  summary = signal<CourseEnrollmentsSummary>({
    total_enrollments: 0,
    total_amount: 0,
    total_paid: 0,
    total_remaining: 0
  });
  courses = signal<Project[]>([]);
  students = signal<CourseStudent[]>([]);

  isLoading = signal(false);
  isSubmitting = signal(false);

  selectedProjectId = signal('');
  selectedStatus = signal('');
  searchQuery = signal('');

  expandedIds = signal<Set<string>>(new Set());

  alertMessage = signal<string | null>(null);
  alertType = signal<'success' | 'warning' | 'error'>('success');
  modalError = signal<string | null>(null);

  // New Enrollment Modal
  showNewEnrollmentModal = signal(false);
  newEnrollForm = {
    course_student_id: '',
    project_id: '',
    total_amount: 0,
    installments_count: 1,
    notes: ''
  };

  // Pay Single Installment Modal
  showPayModal = signal(false);
  activeEnrollment = signal<CourseEnrollment | null>(null);
  activeInstallment = signal<CourseInstallment | null>(null);
  payForm = {
    amount: 0,
    payment_method: 'Bonifico',
    paid_at: this.getTodayIso(),
    notes: ''
  };

  // Settle All Modal
  showSettleModal = signal(false);
  settleForm = {
    payment_method: 'Bonifico',
    paid_at: this.getTodayIso(),
    notes: ''
  };

  // Inline Edit Installment Amount
  editingInstallmentId = signal<string | null>(null);
  inlineAmount = 0;

  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.loadEnrollments();
    this.loadCourses();
    this.loadStudents();
  }

  loadEnrollments(): void {
    this.isLoading.set(true);
    this.api.getCourseEnrollments({
      project_id: this.selectedProjectId() || undefined,
      payment_status: this.selectedStatus() || undefined,
      search: this.searchQuery().trim() || undefined
    }).subscribe({
      next: res => {
        this.enrollments.set(res.enrollments || []);
        if (res.summary) {
          this.summary.set(res.summary);
        }
        this.isLoading.set(false);
      },
      error: err => {
        console.error('Errore caricamento pagamenti corsi', err);
        this.showAlert('Errore durante il caricamento dei pagamenti corsi.', 'error');
        this.isLoading.set(false);
      }
    });
  }

  loadCourses(): void {
    this.api.getProjects().subscribe({
      next: projects => {
        this.courses.set((projects || []).filter(p => p.type !== 'DOPOSCUOLA'));
      },
      error: err => console.error('Errore caricamento corsi', err)
    });
  }

  loadStudents(): void {
    this.api.getCourseStudents().subscribe({
      next: res => {
        this.students.set(res.students || []);
      },
      error: err => console.error('Errore caricamento studenti corsi', err)
    });
  }

  onProjectFilterChange(projectId: string): void {
    this.selectedProjectId.set(projectId);
    this.loadEnrollments();
  }

  onStatusFilterChange(status: string): void {
    this.selectedStatus.set(status);
    this.loadEnrollments();
  }

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    this.searchTimeout = setTimeout(() => {
      this.loadEnrollments();
    }, 250);
  }

  resetFilters(): void {
    this.selectedProjectId.set('');
    this.selectedStatus.set('');
    this.searchQuery.set('');
    this.loadEnrollments();
  }

  // ---- Expand / Collapse ----
  toggleExpand(id: string): void {
    const next = new Set(this.expandedIds());
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.expandedIds.set(next);
  }

  isExpanded(id: string): boolean {
    return this.expandedIds().has(id);
  }

  // ---- New Enrollment Modal ----
  openNewEnrollmentModal(): void {
    this.modalError.set(null);
    this.newEnrollForm = {
      course_student_id: '',
      project_id: this.selectedProjectId() || '',
      total_amount: 0,
      installments_count: 1,
      notes: ''
    };
    if (this.newEnrollForm.project_id) {
      this.onNewEnrollCourseChange(this.newEnrollForm.project_id);
    }
    this.showNewEnrollmentModal.set(true);
  }

  closeNewEnrollmentModal(): void {
    this.showNewEnrollmentModal.set(false);
    this.modalError.set(null);
  }

  onNewEnrollCourseChange(projectId: string): void {
    const course = this.courses().find(c => c.id === projectId);
    this.newEnrollForm.total_amount = course ? Number(course.enrollment_fee ?? 0) : 0;
  }

  getSelectedCourseForNewEnroll(): Project | null {
    if (!this.newEnrollForm.project_id) return null;
    return this.courses().find(c => c.id === this.newEnrollForm.project_id) || null;
  }

  isCourseAtOrOverCapacity(course: Project): boolean {
    const max = Number(course.max_enrolled ?? 0);
    const actual = Number(course.actual_enrolled ?? 0);
    return max > 0 && actual >= max;
  }

  submitNewEnrollment(): void {
    if (!this.newEnrollForm.course_student_id || !this.newEnrollForm.project_id) return;

    this.isSubmitting.set(true);
    this.modalError.set(null);

    this.api.createCourseEnrollment({
      course_student_id: this.newEnrollForm.course_student_id,
      project_id: this.newEnrollForm.project_id,
      total_amount: Number(this.newEnrollForm.total_amount),
      installments_count: Number(this.newEnrollForm.installments_count),
      notes: this.newEnrollForm.notes.trim() || undefined
    }).subscribe({
      next: res => {
        this.isSubmitting.set(false);
        this.closeNewEnrollmentModal();
        if (res?.over_capacity) {
          this.showAlert(
            `Iscrizione creata. Avviso statistico: il corso ha superato la capienza massima (${res.actual_enrolled}/${res.max_enrolled}).`,
            'warning'
          );
        } else {
          this.showAlert('Nuova iscrizione al corso creata correttamente.', 'success');
        }
        if (res?.enrollment?.id) {
          const next = new Set(this.expandedIds());
          next.add(res.enrollment.id);
          this.expandedIds.set(next);
        }
        this.loadEnrollments();
        this.loadCourses();
      },
      error: err => {
        this.isSubmitting.set(false);
        this.modalError.set(err?.error?.error || 'Errore durante la creazione dell\'iscrizione.');
      }
    });
  }

  deleteEnrollment(enr: CourseEnrollment): void {
    if (!confirm(`Eliminare l'iscrizione di ${enr.student_cognome} ${enr.student_nome} al corso "${enr.project_title}"?`)) {
      return;
    }
    this.api.deleteCourseEnrollment(enr.id).subscribe({
      next: () => {
        this.showAlert('Iscrizione eliminata.', 'success');
        this.loadEnrollments();
        this.loadCourses();
      },
      error: err => {
        this.showAlert(err?.error?.error || 'Errore durante l\'eliminazione dell\'iscrizione.', 'error');
      }
    });
  }

  // ---- Pay Installment Modal ----
  openPayInstallmentModal(enrollment: CourseEnrollment, installment: CourseInstallment): void {
    this.activeEnrollment.set(enrollment);
    this.activeInstallment.set(installment);
    this.modalError.set(null);
    this.payForm = {
      amount: Number(installment.amount),
      payment_method: 'Bonifico',
      paid_at: this.getTodayIso(),
      notes: installment.notes || ''
    };
    this.showPayModal.set(true);
  }

  closePayModal(): void {
    this.showPayModal.set(false);
    this.activeEnrollment.set(null);
    this.activeInstallment.set(null);
    this.modalError.set(null);
  }

  submitPayInstallment(): void {
    const inst = this.activeInstallment();
    if (!inst) return;

    this.isSubmitting.set(true);
    this.modalError.set(null);

    this.api.payCourseInstallment(inst.id, {
      amount: Number(this.payForm.amount),
      payment_method: this.payForm.payment_method,
      paid_at: this.payForm.paid_at,
      notes: this.payForm.notes.trim() || undefined
    }).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closePayModal();
        this.showAlert(`Rata ${inst.installment_number} registrata come pagata.`, 'success');
        this.loadEnrollments();
      },
      error: err => {
        this.isSubmitting.set(false);
        this.modalError.set(err?.error?.error || 'Errore durante la registrazione del pagamento.');
      }
    });
  }

  // ---- Inline Edit Installment Amount ----
  startInlineEdit(inst: CourseInstallment): void {
    this.editingInstallmentId.set(inst.id);
    this.inlineAmount = Number(inst.amount);
  }

  cancelInlineEdit(): void {
    this.editingInstallmentId.set(null);
  }

  saveInlineInstallment(installmentId: string): void {
    const parsedAmount = Number(this.inlineAmount);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      this.showAlert('Inserisci un importo valido (>= 0).', 'error');
      return;
    }

    this.isSubmitting.set(true);
    this.api.updateCourseInstallment(installmentId, { amount: parsedAmount }).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.editingInstallmentId.set(null);
        this.showAlert('Importo della rata aggiornato.', 'success');
        this.loadEnrollments();
      },
      error: err => {
        this.isSubmitting.set(false);
        this.showAlert(err?.error?.error || 'Errore durante l\'aggiornamento dell\'importo.', 'error');
      }
    });
  }

  // ---- Unpay (Storna) Installment ----
  unpayInstallment(inst: CourseInstallment): void {
    if (!confirm(`Stornare il pagamento della Rata ${inst.installment_number}?`)) {
      return;
    }
    this.api.unpayCourseInstallment(inst.id).subscribe({
      next: () => {
        this.showAlert(`Pagamento Rata ${inst.installment_number} stornato.`, 'success');
        this.loadEnrollments();
      },
      error: err => {
        this.showAlert(err?.error?.error || 'Errore durante lo storno della rata.', 'error');
      }
    });
  }

  // ---- Settle All Modal ----
  openSettleModal(enrollment: CourseEnrollment): void {
    this.activeEnrollment.set(enrollment);
    this.modalError.set(null);
    this.settleForm = {
      payment_method: 'Bonifico',
      paid_at: this.getTodayIso(),
      notes: ''
    };
    this.showSettleModal.set(true);
  }

  closeSettleModal(): void {
    this.showSettleModal.set(false);
    this.activeEnrollment.set(null);
    this.modalError.set(null);
  }

  submitSettleEnrollment(): void {
    const enr = this.activeEnrollment();
    if (!enr) return;

    this.isSubmitting.set(true);
    this.modalError.set(null);

    this.api.settleCourseEnrollment(enr.id, {
      payment_method: this.settleForm.payment_method,
      paid_at: this.settleForm.paid_at,
      notes: this.settleForm.notes.trim() || undefined
    }).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeSettleModal();
        this.showAlert('Tutte le rate residue sono state saldate.', 'success');
        this.loadEnrollments();
      },
      error: err => {
        this.isSubmitting.set(false);
        this.modalError.set(err?.error?.error || 'Errore durante il saldo completo.');
      }
    });
  }

  // ---- Helpers ----
  getPaidCount(enr: CourseEnrollment): number {
    if (enr.paid_installments_count !== undefined && enr.paid_installments_count !== null) {
      return enr.paid_installments_count;
    }
    return (enr.installments || []).filter(i => i.status === 'PAID').length;
  }

  getProgressPercent(enr: CourseEnrollment): number {
    if (!enr.installments_count) return 0;
    return Math.min(100, Math.round((this.getPaidCount(enr) / enr.installments_count) * 100));
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

  getCardShortLabel(status?: CardStatus): string {
    switch (status) {
      case 'VALIDA':
        return 'Tessera OK';
      case 'IN_SCADENZA':
        return 'Tessera in scad.';
      case 'SCADUTA':
        return 'Tessera scaduta';
      default:
        return 'No tessera';
    }
  }

  formatDate(dateStr?: string | null): string {
    if (!dateStr) return '—';
    const d = String(dateStr).slice(0, 10);
    const parts = d.split('-');
    if (parts.length !== 3) return d;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  private getTodayIso(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private showAlert(message: string, type: 'success' | 'warning' | 'error'): void {
    this.alertMessage.set(message);
    this.alertType.set(type);
  }
}
