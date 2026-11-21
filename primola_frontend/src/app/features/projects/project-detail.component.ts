import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Project, ProjectTeacher, User, CourseStudent, CourseEnrollment, CardStatus } from '../../core/models';

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="p-6 max-w-5xl mx-auto space-y-6">
      <!-- Breadcrumb -->
      <div>
        <a routerLink="/projects" class="text-xs text-[#3857F1] hover:underline flex items-center gap-1 mb-2">
          &larr; Torna alle commesse
        </a>
        <h1 class="text-2xl font-bold text-slate-800">
          {{ isEditMode() ? 'Dettaglio Commessa' : 'Nuova Commessa' }}
        </h1>
      </div>

      <!-- Form Dati Corso / Commessa -->
      <form [formGroup]="projectForm" (ngSubmit)="saveProject()" class="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Titolo del Corso *</label>
            <input
              type="text"
              formControlName="title"
              placeholder="Es. Corso di Ceramica Livello Base"
              class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#3857F1]"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Tipo Attività</label>
            <select
              formControlName="type"
              class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#3857F1] bg-white"
            >
              <option value="CORSO">CORSO</option>
              <option value="LABORATORIO">LABORATORIO</option>
              <option value="WORKSHOP">WORKSHOP</option>
              <option value="DOPOSCUOLA">DOPOSCUOLA</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Costo Iscrizione (€ a persona)</label>
            <input
              type="number"
              step="0.01"
              formControlName="enrollment_fee"
              placeholder="Es. 120.00"
              class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#3857F1]"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Numero Iscritti Previsto / Massimo</label>
            <input
              type="number"
              step="1"
              formControlName="max_enrolled"
              placeholder="Es. 15"
              class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#3857F1]"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">
              Numero Iscritti Effettivi / Reali
              @if (isNonDoposcuolaEdit()) {
                <span class="ml-1 text-[10px] font-medium text-slate-400">(calcolato automaticamente)</span>
              }
            </label>
            <input
              type="number"
              step="1"
              formControlName="actual_enrolled"
              [readonly]="isNonDoposcuolaEdit()"
              placeholder="Es. 12"
              class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#3857F1]"
              [class.bg-slate-50]="isNonDoposcuolaEdit()"
              [class.text-slate-600]="isNonDoposcuolaEdit()"
              [class.cursor-not-allowed]="isNonDoposcuolaEdit()"
            />
            @if (isNonDoposcuolaEdit() && isAtOrOverCapacity()) {
              <div class="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>Tetto massimo raggiunto/superato - solo statistico</span>
              </div>
            }
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Data Inizio</label>
            <input
              type="date"
              formControlName="start_date"
              class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#3857F1]"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Data Fine</label>
            <input
              type="date"
              formControlName="end_date"
              class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#3857F1]"
            />
          </div>

          <div class="md:col-span-2">
            <label class="block text-xs font-semibold text-slate-600 mb-1">Sede / Ubicazione</label>
            <input
              type="text"
              formControlName="location"
              placeholder="Es. Sede Primola - Aula 3"
              class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#3857F1]"
            />
          </div>

          <div class="md:col-span-2">
            <label class="block text-xs font-semibold text-slate-600 mb-1">Descrizione del Corso</label>
            <textarea
              formControlName="description"
              rows="3"
              placeholder="Programma didattico, materiale necessario e note organizzative..."
              class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#3857F1]"
            ></textarea>
          </div>
        </div>

        <div class="flex justify-end pt-3">
          <button
            type="submit"
            [disabled]="projectForm.invalid || saving()"
            class="px-5 py-2.5 bg-[#3857F1] hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-colors shadow-sm disabled:opacity-50"
          >
            {{ saving() ? 'Salvataggio...' : (isEditMode() ? 'Salva Modifiche Commessa' : 'Crea Commessa') }}
          </button>
        </div>
      </form>

      <!-- Gestione Assegnazione Docenti (solo in modalità edit e se autorizzato) -->
      @if (isEditMode() && authService.canManageUsers()) {
        <div class="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-6">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 class="text-lg font-bold text-slate-800">Docenti Assegnati</h2>
              <p class="text-xs text-slate-500">Gestisci i docenti assegnati alla commessa con costo orario e ore previste</p>
            </div>
            
            <button
              type="button"
              (click)="toggleAssignForm()"
              class="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
            >
              {{ showAssignForm() ? 'Chiudi Assegnazione' : '+ Assegna Docente' }}
            </button>
          </div>

          <!-- Modale / Form Inclusione Docente -->
          @if (showAssignForm()) {
            <form [formGroup]="assignForm" (ngSubmit)="assignTeacher()" class="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
              <h3 class="text-xs font-bold text-slate-700 uppercase tracking-wider">Nuova Assegnazione Docente</h3>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-slate-600 mb-1">Seleziona Docente *</label>
                  <select
                    formControlName="user_id"
                    class="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#3857F1]"
                  >
                    <option value="">-- Seleziona un utente --</option>
                    @for (u of availableTeachers(); track u.id) {
                      <option [value]="u.id">
                        {{ u.first_name }} {{ u.last_name }} ({{ u.email }})
                      </option>
                    }
                  </select>
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-600 mb-1">Costo Orario (€/h)</label>
                  <input
                    type="number"
                    step="0.5"
                    formControlName="hourly_rate"
                    placeholder="Es. 22.50"
                    class="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#3857F1]"
                  />
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-600 mb-1">Ore Previste (h)</label>
                  <input
                    type="number"
                    step="1"
                    formControlName="assigned_hours"
                    placeholder="Es. 40"
                    class="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#3857F1]"
                  />
                </div>
              </div>

              <div class="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  (click)="toggleAssignForm()"
                  class="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  [disabled]="assignForm.invalid || assigning()"
                  class="px-4 py-1.5 bg-[#3857F1] text-white text-xs font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {{ assigning() ? 'Assegnazione...' : 'Conferma Assegnazione' }}
                </button>
              </div>
            </form>
          }

          <!-- Tabella Docenti Assegnati -->
          @if (assignedTeachers().length === 0) {
            <p class="text-xs text-slate-400 italic py-4">Nessun docente ancora associato a questa commessa.</p>
          } @else {
            <!-- Mobile Cards Iscritti -->
            <div class="block md:hidden space-y-2.5">
              @for (e of courseEnrollments(); track e.id) {
                <div class="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5">
                  <div class="flex items-start justify-between gap-2">
                    <div class="min-w-0">
                      <div class="font-bold text-slate-800 text-sm">{{ e.student_cognome }} {{ e.student_nome }}</div>
                      @if (e.student_email || e.student_telefono) {
                        <div class="text-[11px] text-slate-500 truncate">
                          {{ e.student_email || e.student_telefono }}
                        </div>
                      }
                    </div>
                    <span
                      class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0"
                      [ngClass]="getCardBadgeClass(e.student_card_status)"
                    >
                      {{ getCardLabel(e.student_card_status) }}
                    </span>
                  </div>

                  <div class="grid grid-cols-3 gap-2 text-center text-xs pt-2 border-t border-slate-200/70">
                    <div>
                      <div class="text-[10px] text-slate-400 uppercase font-semibold">Rate</div>
                      <div class="font-bold text-slate-700">{{ e.paid_installments_count ?? 0 }}/{{ e.installments_count }}</div>
                    </div>
                    <div>
                      <div class="text-[10px] text-slate-400 uppercase font-semibold">Incassato</div>
                      <div class="font-bold text-emerald-700">€ {{ e.paid_amount | number:'1.2-2' }}</div>
                    </div>
                    <div>
                      <div class="text-[10px] text-slate-400 uppercase font-semibold">Rimanenza</div>
                      <div class="font-bold" [ngClass]="e.remaining_amount > 0 ? 'text-amber-700' : 'text-emerald-700'">
                        € {{ e.remaining_amount | number:'1.2-2' }}
                      </div>
                    </div>
                  </div>

                  <div class="flex items-center justify-end gap-2 pt-1">
                    <a
                      routerLink="/course-payments"
                      class="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg"
                    >
                      Pagamenti
                    </a>
                    <button
                      type="button"
                      (click)="removeEnrollment(e)"
                      class="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg cursor-pointer"
                    >
                      Rimuovi
                    </button>
                  </div>
                </div>
              }
            </div>

            <!-- Desktop Table Iscritti -->
            <div class="hidden md:block overflow-x-auto">
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr class="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
                    <th class="py-2.5 px-3">Docente</th>
                    <th class="py-2.5 px-3">Email</th>
                    <th class="py-2.5 px-3">Costo Orario</th>
                    <th class="py-2.5 px-3">Ore Previste</th>
                    <th class="py-2.5 px-3">Totale Costo</th>
                    <th class="py-2.5 px-3 text-right">Azioni</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 text-sm">
                  @for (t of assignedTeachers(); track t.user_id) {
                    <tr>
                      <td class="py-2.5 px-3 font-semibold text-slate-800">
                        {{ t.first_name }} {{ t.last_name }}
                      </td>
                      <td class="py-2.5 px-3 text-slate-500 text-xs font-mono">
                        {{ t.email }}
                      </td>
                      <td class="py-2.5 px-3 font-mono text-xs">
                        {{ t.hourly_rate != null ? '€ ' + t.hourly_rate : '-' }}
                      </td>
                      <td class="py-2.5 px-3 font-mono text-xs">
                        {{ t.assigned_hours != null ? t.assigned_hours + ' h' : '-' }}
                      </td>
                      <td class="py-2.5 px-3 font-mono text-xs font-semibold text-emerald-600">
                        {{ (t.hourly_rate && t.assigned_hours) ? '€ ' + (t.hourly_rate * t.assigned_hours).toFixed(2) : '-' }}
                      </td>
                      <td class="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          (click)="removeTeacher(t.user_id)"
                          class="text-xs text-rose-500 hover:text-rose-700"
                        >
                          Rimuovi
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      }

      <!-- Studenti Iscritti al Corso (solo per corsi non DOPOSCUOLA in modalità edit) -->
      @if (isNonDoposcuolaEdit() && authService.canManageUsers()) {
        <div class="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-6">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <h2 class="text-lg font-bold text-slate-800">Studenti Iscritti al Corso</h2>
                <span class="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-[#3857F1] border border-blue-100">
                  {{ courseEnrollments().length }}{{ maxEnrolledValue() > 0 ? ' / ' + maxEnrolledValue() : '' }}
                </span>
                @if (isAtOrOverCapacity()) {
                  <span class="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                    Tetto massimo raggiunto/superato - solo statistico
                  </span>
                }
              </div>
              <p class="text-xs text-slate-500">Elenco studenti iscritti, stato tessera, avanzamento rate e gestione pagamenti</p>
            </div>

            <div class="flex items-center gap-2 shrink-0">
              <a
                routerLink="/course-payments"
                class="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold rounded-xl transition-colors"
              >
                Pagamenti Corsi &rarr;
              </a>
              <button
                type="button"
                (click)="toggleEnrollForm()"
                class="px-3.5 py-2 bg-[#3857F1] hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm"
              >
                {{ showEnrollForm() ? 'Chiudi Modulo' : '+ Iscrivi Studente' }}
              </button>
            </div>
          </div>

          <!-- Form Inline Iscrizione Studente -->
          @if (showEnrollForm()) {
            <form [formGroup]="enrollForm" (ngSubmit)="enrollStudent()" class="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
              <h3 class="text-xs font-bold text-slate-700 uppercase tracking-wider">Nuova Iscrizione al Corso</h3>

              @if (isAtOrOverCapacity()) {
                <div class="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>Il tetto massimo previsto ({{ maxEnrolledValue() }}) è già stato raggiunto/superato. L'iscrizione rimane consentita (dato solo statistico).</span>
                </div>
              }

              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div class="sm:col-span-2 lg:col-span-1">
                  <label class="block text-xs font-semibold text-slate-600 mb-1">Studente *</label>
                  <select
                    formControlName="course_student_id"
                    class="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#3857F1]"
                  >
                    <option value="">-- Seleziona studente --</option>
                    @for (s of enrollableStudents(); track s.id) {
                      <option [value]="s.id">
                        {{ s.cognome }} {{ s.nome }}{{ s.email ? ' (' + s.email + ')' : '' }}
                      </option>
                    }
                  </select>
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-600 mb-1">Quota Totale (€) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    formControlName="total_amount"
                    class="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#3857F1]"
                  />
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-600 mb-1">Numero Rate *</label>
                  <select
                    formControlName="installments_count"
                    class="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#3857F1]"
                  >
                    <option [ngValue]="1">1 rata (unica)</option>
                    <option [ngValue]="2">2 rate</option>
                    <option [ngValue]="3">3 rate</option>
                    <option [ngValue]="4">4 rate</option>
                  </select>
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-600 mb-1">Note</label>
                  <input
                    type="text"
                    formControlName="notes"
                    placeholder="Eventuali note..."
                    class="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#3857F1]"
                  />
                </div>
              </div>

              <div class="flex items-center justify-between pt-2">
                <a routerLink="/course-students" class="text-xs text-[#3857F1] hover:underline">
                  Non trovi lo studente? Gestisci Anagrafica Studenti Corsi &rarr;
                </a>
                <div class="flex gap-2">
                  <button
                    type="button"
                    (click)="toggleEnrollForm()"
                    class="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    [disabled]="enrollForm.invalid || enrolling()"
                    class="px-4 py-1.5 bg-[#3857F1] text-white text-xs font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {{ enrolling() ? 'Iscrizione...' : 'Conferma Iscrizione' }}
                  </button>
                </div>
              </div>
            </form>
          }

          <!-- Tabella Studenti Iscritti -->
          @if (loadingEnrollments()) {
            <p class="text-xs text-slate-400 italic py-4">Caricamento iscritti in corso...</p>
          } @else if (courseEnrollments().length === 0) {
            <p class="text-xs text-slate-400 italic py-4">Nessuno studente ancora iscritto a questo corso.</p>
          } @else {
            <!-- Mobile Cards Iscritti -->
            <div class="block md:hidden space-y-2.5">
              @for (e of courseEnrollments(); track e.id) {
                <div class="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5">
                  <div class="flex items-start justify-between gap-2">
                    <div class="min-w-0">
                      <div class="font-bold text-slate-800 text-sm">{{ e.student_cognome }} {{ e.student_nome }}</div>
                      @if (e.student_email || e.student_telefono) {
                        <div class="text-[11px] text-slate-500 truncate">
                          {{ e.student_email || e.student_telefono }}
                        </div>
                      }
                    </div>
                    <span
                      class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0"
                      [ngClass]="getCardBadgeClass(e.student_card_status)"
                    >
                      {{ getCardLabel(e.student_card_status) }}
                    </span>
                  </div>

                  <div class="grid grid-cols-3 gap-2 text-center text-xs pt-2 border-t border-slate-200/70">
                    <div>
                      <div class="text-[10px] text-slate-400 uppercase font-semibold">Rate</div>
                      <div class="font-bold text-slate-700">{{ e.paid_installments_count ?? 0 }}/{{ e.installments_count }}</div>
                    </div>
                    <div>
                      <div class="text-[10px] text-slate-400 uppercase font-semibold">Incassato</div>
                      <div class="font-bold text-emerald-700">€ {{ e.paid_amount | number:'1.2-2' }}</div>
                    </div>
                    <div>
                      <div class="text-[10px] text-slate-400 uppercase font-semibold">Rimanenza</div>
                      <div class="font-bold" [ngClass]="e.remaining_amount > 0 ? 'text-amber-700' : 'text-emerald-700'">
                        € {{ e.remaining_amount | number:'1.2-2' }}
                      </div>
                    </div>
                  </div>

                  <div class="flex items-center justify-end gap-2 pt-1">
                    <a
                      routerLink="/course-payments"
                      class="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg"
                    >
                      Pagamenti
                    </a>
                    <button
                      type="button"
                      (click)="removeEnrollment(e)"
                      class="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg cursor-pointer"
                    >
                      Rimuovi
                    </button>
                  </div>
                </div>
              }
            </div>

            <!-- Desktop Table Iscritti -->
            <div class="hidden md:block overflow-x-auto">
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr class="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
                    <th class="py-2.5 px-3">Studente</th>
                    <th class="py-2.5 px-3">Tessera</th>
                    <th class="py-2.5 px-3 text-center">Rate</th>
                    <th class="py-2.5 px-3 text-right">Incassato</th>
                    <th class="py-2.5 px-3 text-right">Rimanenza</th>
                    <th class="py-2.5 px-3 text-right">Azioni</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 text-sm">
                  @for (e of courseEnrollments(); track e.id) {
                    <tr class="hover:bg-slate-50/60">
                      <td class="py-2.5 px-3">
                        <div class="font-semibold text-slate-800">
                          {{ e.student_cognome }} {{ e.student_nome }}
                        </div>
                        @if (e.student_email || e.student_telefono) {
                          <div class="text-[11px] text-slate-400">
                            {{ e.student_email || '' }}{{ e.student_email && e.student_telefono ? ' • ' : '' }}{{ e.student_telefono || '' }}
                          </div>
                        }
                      </td>
                      <td class="py-2.5 px-3">
                        <span
                          class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border"
                          [ngClass]="getCardBadgeClass(e.student_card_status)"
                        >
                          {{ getCardLabel(e.student_card_status) }}
                        </span>
                      </td>
                      <td class="py-2.5 px-3 text-center font-mono text-xs text-slate-700">
                        {{ e.paid_installments_count ?? 0 }} / {{ e.installments_count }}
                      </td>
                      <td class="py-2.5 px-3 text-right font-mono text-xs font-semibold text-emerald-600">
                        € {{ (e.paid_amount || 0) | number:'1.2-2' }}
                      </td>
                      <td class="py-2.5 px-3 text-right font-mono text-xs font-semibold">
                        @if ((e.remaining_amount || 0) > 0) {
                          <span class="text-amber-700">€ {{ e.remaining_amount | number:'1.2-2' }}</span>
                        } @else {
                          <span class="text-emerald-600">Saldato</span>
                        }
                      </td>
                      <td class="py-2.5 px-3 text-right whitespace-nowrap">
                        <div class="inline-flex items-center gap-3">
                          <a
                            routerLink="/course-payments"
                            class="text-xs font-semibold text-[#3857F1] hover:underline"
                          >
                            Pagamenti
                          </a>
                          <button
                            type="button"
                            (click)="removeEnrollment(e)"
                            class="text-xs text-rose-500 hover:text-rose-700"
                          >
                            Rimuovi
                          </button>
                        </div>
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
  `
})
export class ProjectDetailComponent implements OnInit {
  private fb = inject(FormBuilder);
  private apiService = inject(ApiService);
  authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  isEditMode = signal(false);
  projectId = signal<string | null>(null);
  assignedTeachers = signal<ProjectTeacher[]>([]);
  availableTeachers = signal<User[]>([]);
  showAssignForm = signal(false);
  saving = signal(false);
  assigning = signal(false);

  // Course Students & Enrollments (non-DOPOSCUOLA courses)
  courseEnrollments = signal<CourseEnrollment[]>([]);
  allCourseStudents = signal<CourseStudent[]>([]);
  loadingEnrollments = signal(false);
  showEnrollForm = signal(false);
  enrolling = signal(false);

  enrollableStudents = computed(() => {
    const enrolledIds = new Set(this.courseEnrollments().map(e => e.course_student_id));
    return this.allCourseStudents().filter(s => !enrolledIds.has(s.id));
  });

  projectForm: FormGroup = this.fb.group({
    title: ['', Validators.required],
    type: ['CORSO'],
    enrollment_fee: [0],
    max_enrolled: [0],
    actual_enrolled: [0],
    start_date: [''],
    end_date: [''],
    location: [''],
    description: ['']
  });

  assignForm: FormGroup = this.fb.group({
    user_id: ['', Validators.required],
    hourly_rate: [null],
    assigned_hours: [null]
  });

  enrollForm: FormGroup = this.fb.group({
    course_student_id: ['', Validators.required],
    total_amount: [0, [Validators.required, Validators.min(0)]],
    installments_count: [1, [Validators.required, Validators.min(1), Validators.max(4)]],
    notes: ['']
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'new') {
      this.isEditMode.set(true);
      this.projectId.set(id);
      this.loadProject(id);
      this.loadUsers();
    }
  }

  isNonDoposcuolaEdit(): boolean {
    return this.isEditMode() && (this.projectForm.get('type')?.value || 'CORSO') !== 'DOPOSCUOLA';
  }

  maxEnrolledValue(): number {
    return Number(this.projectForm.get('max_enrolled')?.value || 0);
  }

  isAtOrOverCapacity(): boolean {
    const max = this.maxEnrolledValue();
    const actual = Number(this.projectForm.get('actual_enrolled')?.value || 0);
    return max > 0 && actual >= max;
  }

  private toDateInputValue(val: string | Date | null | undefined): string {
    if (!val) return '';
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
        return trimmed.slice(0, 10);
      }
      const parsed = new Date(trimmed);
      if (!isNaN(parsed.getTime())) {
        const y = parsed.getFullYear();
        const m = String(parsed.getMonth() + 1).padStart(2, '0');
        const d = String(parsed.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
      return '';
    }
    if (val instanceof Date && !isNaN(val.getTime())) {
      const y = val.getFullYear();
      const m = String(val.getMonth() + 1).padStart(2, '0');
      const d = String(val.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    return '';
  }

  loadProject(id: string): void {
    this.apiService.getProjectById(id).subscribe({
      next: (proj) => {
        this.projectForm.patchValue({
          title: proj.title,
          type: proj.type || 'CORSO',
          enrollment_fee: proj.enrollment_fee || 0,
          max_enrolled: proj.max_enrolled || 0,
          actual_enrolled: proj.actual_enrolled || 0,
          start_date: this.toDateInputValue(proj.start_date),
          end_date: this.toDateInputValue(proj.end_date),
          location: proj.location || '',
          description: proj.description || ''
        });
        if (proj.teachers) {
          this.assignedTeachers.set(proj.teachers);
        }
        if ((proj.type || 'CORSO') !== 'DOPOSCUOLA') {
          this.loadCourseEnrollments(id);
          this.loadCourseStudents();
        }
      },
      error: (err) => console.error('Errore nel caricamento commessa:', err)
    });
  }

  loadCourseEnrollments(projectId: string): void {
    this.loadingEnrollments.set(true);
    this.apiService.getCourseEnrollments({ project_id: projectId }).subscribe({
      next: (res: any) => {
        const list: CourseEnrollment[] = Array.isArray(res) ? res : (res?.enrollments ?? []);
        this.courseEnrollments.set(list);
        this.projectForm.patchValue({ actual_enrolled: list.length });
        this.loadingEnrollments.set(false);
      },
      error: (err) => {
        console.error('Errore caricamento iscritti al corso:', err);
        this.loadingEnrollments.set(false);
      }
    });
  }

  loadCourseStudents(): void {
    this.apiService.getCourseStudents().subscribe({
      next: (res: any) => {
        const list: CourseStudent[] = Array.isArray(res) ? res : (res?.students ?? []);
        this.allCourseStudents.set(list);
      },
      error: (err) => console.error('Errore caricamento studenti corsi:', err)
    });
  }

  toggleEnrollForm(): void {
    const nextState = !this.showEnrollForm();
    this.showEnrollForm.set(nextState);
    if (nextState) {
      this.enrollForm.reset({
        course_student_id: '',
        total_amount: Number(this.projectForm.get('enrollment_fee')?.value || 0),
        installments_count: 1,
        notes: ''
      });
    }
  }

  enrollStudent(): void {
    if (this.enrollForm.invalid || !this.projectId()) return;

    this.enrolling.set(true);
    const val = this.enrollForm.value;

    this.apiService.createCourseEnrollment({
      course_student_id: val.course_student_id,
      project_id: this.projectId()!,
      total_amount: Number(val.total_amount),
      installments_count: Number(val.installments_count),
      notes: val.notes || undefined
    }).subscribe({
      next: () => {
        this.enrolling.set(false);
        this.showEnrollForm.set(false);
        this.loadCourseEnrollments(this.projectId()!);
      },
      error: (err) => {
        this.enrolling.set(false);
        alert(err?.error?.error || 'Errore durante l\'iscrizione dello studente');
      }
    });
  }

  removeEnrollment(enrollment: CourseEnrollment): void {
    const studentName = `${enrollment.student_cognome || ''} ${enrollment.student_nome || ''}`.trim() || 'questo studente';
    if (!confirm(`Rimuovere l'iscrizione di ${studentName} da questo corso?`)) return;

    this.apiService.deleteCourseEnrollment(enrollment.id).subscribe({
      next: () => {
        this.loadCourseEnrollments(this.projectId()!);
      },
      error: (err) => {
        alert(err?.error?.error || 'Errore durante la rimozione dell\'iscrizione');
      }
    });
  }

  getCardBadgeClass(status?: CardStatus): string {
    switch (status) {
      case 'VALIDA':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'IN_SCADENZA':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'SCADUTA':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  }

  getCardLabel(status?: CardStatus): string {
    switch (status) {
      case 'VALIDA':
        return 'Tessera Valida';
      case 'IN_SCADENZA':
        return 'In Scadenza';
      case 'SCADUTA':
        return 'Tessera Scaduta';
      default:
        return 'Nessuna Tessera';
    }
  }

  loadUsers(): void {
    this.apiService.getUsers().subscribe({
      next: (users) => this.availableTeachers.set(users),
      error: (err) => console.error('Errore nel caricamento utenti:', err)
    });
  }

  toggleAssignForm(): void {
    this.showAssignForm.update(v => !v);
  }

  saveProject(): void {
    if (this.projectForm.invalid) return;

    this.saving.set(true);
    const val = this.projectForm.value;

    if (this.isEditMode()) {
      this.apiService.updateProject(this.projectId()!, val).subscribe({
        next: () => {
          this.saving.set(false);
          this.router.navigate(['/projects']);
        },
        error: (err) => {
          this.saving.set(false);
          alert(err?.error?.error || 'Errore salvataggio commessa');
        }
      });
    } else {
      this.apiService.createProject(val).subscribe({
        next: (created) => {
          this.saving.set(false);
          this.router.navigate(['/projects', created.id]);
        },
        error: (err) => {
          this.saving.set(false);
          alert(err?.error?.error || 'Errore creazione commessa');
        }
      });
    }
  }

  assignTeacher(): void {
    if (this.assignForm.invalid || !this.projectId()) return;

    this.assigning.set(true);
    const val = this.assignForm.value;

    this.apiService.assignTeacherToProject(this.projectId()!, val).subscribe({
      next: () => {
        this.assigning.set(false);
        this.assignForm.reset();
        this.showAssignForm.set(false);
        this.loadProject(this.projectId()!);
      },
      error: (err) => {
        this.assigning.set(false);
        alert(err?.error?.error || 'Errore durante l\'assegnazione del docente');
      }
    });
  }

  removeTeacher(userId: string): void {
    if (!confirm('Rimuovere il docente da questa commessa?')) return;

    this.apiService.removeTeacherFromProject(this.projectId()!, userId).subscribe({
      next: () => {
        this.assignedTeachers.update(list => list.filter(t => t.user_id !== userId));
      },
      error: (err) => {
        alert(err?.error?.error || 'Errore rimozione docente');
      }
    });
  }
}
