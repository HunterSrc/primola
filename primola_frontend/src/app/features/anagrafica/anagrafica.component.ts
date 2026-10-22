import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { Student, Tutor } from '../../core/models';

@Component({
  selector: 'app-anagrafica',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  template: `
    <div class="p-3 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-4 sm:space-y-6 pb-6 md:pb-0">
      
      <!-- Titolo & Tab Navigation -->
      <div class="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 class="text-xl sm:text-2xl font-bold text-slate-800">Anagrafica Studenti</h1>
          <p class="text-xs sm:text-sm text-slate-500">Gestisci iscrizioni, orari settimanali e contatti dei tutori</p>
        </div>

        <div class="flex items-center space-x-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200 w-full sm:w-auto">
          <button
            (click)="activeTab.set('NEW')"
            [class.bg-white]="activeTab() === 'NEW'"
            [class.shadow-sm]="activeTab() === 'NEW'"
            [class.text-emerald-700]="activeTab() === 'NEW'"
            [class.font-bold]="activeTab() === 'NEW'"
            class="flex-1 sm:flex-initial px-3 sm:px-4 py-2 text-xs md:text-sm rounded-lg text-slate-600 transition-all flex items-center justify-center space-x-1.5 sm:space-x-2 cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            <span>Nuovo Studente</span>
          </button>

          <button
            (click)="activeTab.set('LIST')"
            [class.bg-white]="activeTab() === 'LIST'"
            [class.shadow-sm]="activeTab() === 'LIST'"
            [class.text-emerald-700]="activeTab() === 'LIST'"
            [class.font-bold]="activeTab() === 'LIST'"
            class="flex-1 sm:flex-initial px-3 sm:px-4 py-2 text-xs md:text-sm rounded-lg text-slate-600 transition-all flex items-center justify-center space-x-1.5 sm:space-x-2 cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>Lista ({{ students().length }})</span>
          </button>
        </div>
      </div>

      <!-- Feedback Banner Salva -->
      @if (successMessage()) {
        <div class="p-3.5 sm:p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center justify-between shadow-sm text-xs sm:text-sm">
          <div class="flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <span class="font-medium">{{ successMessage() }}</span>
          </div>
          <button (click)="successMessage.set(null)" class="text-emerald-700 hover:text-emerald-900 font-bold p-1">&times;</button>
        </div>
      }

      <!-- TAB 1: FORM NUOVO STUDENTE -->
      @if (activeTab() === 'NEW') {
        <form [formGroup]="studentForm" (ngSubmit)="onSubmit()" class="space-y-4 sm:space-y-6">
          
          <!-- Sezione 1: Dati Anagrafici Studente -->
          <div class="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200/80 space-y-4">
            <h2 class="text-base sm:text-lg font-bold text-slate-800 flex items-center space-x-2">
              <span class="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">1</span>
              <span>Dati Principali dello Studente</span>
            </h2>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Nome *</label>
                <input
                  type="text"
                  formControlName="first_name"
                  placeholder="Es. Marco"
                  class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Cognome *</label>
                <input
                  type="text"
                  formControlName="last_name"
                  placeholder="Es. Rossi"
                  class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Scuola di Provenienza</label>
                <input
                  type="text"
                  formControlName="school"
                  placeholder="Es. I.C. Manzoni"
                  class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Data di Nascita</label>
                <input
                  type="date"
                  formControlName="birth_date"
                  class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <!-- Sezione 2: Giorni di Frequenza Settimanale -->
          <div class="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200/80 space-y-4">
            <h2 class="text-base sm:text-lg font-bold text-slate-800 flex items-center space-x-2">
              <span class="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">2</span>
              <span>Giorni di Frequenza Iscrizione</span>
            </h2>
            <p class="text-xs text-slate-500">I giorni selezionati determinano se lo studente compare automaticamente nella schermata presenze:</p>

            <div class="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3">
              <label class="flex items-center space-x-2.5 sm:space-x-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                <input type="checkbox" formControlName="sub_lun" class="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300" />
                <span class="text-xs sm:text-sm font-semibold text-slate-700">Lunedì</span>
              </label>

              <label class="flex items-center space-x-2.5 sm:space-x-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                <input type="checkbox" formControlName="sub_mar" class="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300" />
                <span class="text-xs sm:text-sm font-semibold text-slate-700">Martedì</span>
              </label>

              <label class="flex items-center space-x-2.5 sm:space-x-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                <input type="checkbox" formControlName="sub_mer" class="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300" />
                <span class="text-xs sm:text-sm font-semibold text-slate-700">Mercoledì</span>
              </label>

              <label class="flex items-center space-x-2.5 sm:space-x-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                <input type="checkbox" formControlName="sub_gio" class="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300" />
                <span class="text-xs sm:text-sm font-semibold text-slate-700">Giovedì</span>
              </label>

              <label class="flex items-center space-x-2.5 sm:space-x-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors col-span-2 sm:col-span-1">
                <input type="checkbox" formControlName="sub_ven" class="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300" />
                <span class="text-xs sm:text-sm font-semibold text-slate-700">Venerdì</span>
              </label>
            </div>
          </div>

          <!-- Sezione 3: Tutori e Contatti di Emergenza -->
          <div class="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200/80 space-y-4">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 class="text-base sm:text-lg font-bold text-slate-800 flex items-center space-x-2">
                <span class="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">3</span>
                <span>Tutori e Contatti di Riferimento</span>
              </h2>
              <button
                type="button"
                (click)="addTutor()"
                class="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 border border-slate-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                <span>Aggiungi Altro Tutore</span>
              </button>
            </div>

            <div formArrayName="tutors" class="space-y-4">
              @for (tutorGroup of tutors.controls; track $index; let idx = $index) {
                <div [formGroupName]="idx" class="p-4 bg-slate-50 rounded-xl border border-slate-200 relative">
                  <div class="flex items-center justify-between mb-3">
                    <span class="text-xs font-bold text-slate-600 uppercase">Tutore #{{ idx + 1 }}</span>
                    @if (tutors.length > 1) {
                      <button
                        type="button"
                        (click)="removeTutor(idx)"
                        class="text-rose-600 hover:text-rose-800 text-xs font-semibold flex items-center space-x-1"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span>Rimuovi</span>
                      </button>
                    }
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label class="block text-xs font-medium text-slate-500 mb-1">Nome *</label>
                      <input type="text" formControlName="first_name" placeholder="Nome" class="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm" />
                    </div>

                    <div>
                      <label class="block text-xs font-medium text-slate-500 mb-1">Cognome *</label>
                      <input type="text" formControlName="last_name" placeholder="Cognome" class="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm" />
                    </div>

                    <div>
                      <label class="block text-xs font-medium text-slate-500 mb-1">Telefono *</label>
                      <input type="tel" formControlName="phone" placeholder="+39 340..." class="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm" />
                    </div>

                    <div>
                      <label class="block text-xs font-medium text-slate-500 mb-1">Relazione</label>
                      <input type="text" formControlName="relationship" placeholder="Madre / Padre / Tutore" class="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm" />
                    </div>
                  </div>

                  <div class="mt-3 flex items-center space-x-2">
                    <input type="checkbox" formControlName="is_main" id="is_main_{{idx}}" class="w-4 h-4 rounded text-emerald-600 border-slate-300" />
                    <label [for]="'is_main_' + idx" class="text-xs font-semibold text-slate-700">Contatto principale per avvisi e presenze</label>
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Pulsante Salvataggio -->
          <div class="flex justify-end">
            <button
              type="submit"
              [disabled]="studentForm.invalid || isSubmitting()"
              class="w-full sm:w-auto px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center space-x-2 min-h-[48px]"
            >
              <span>Salva Studente in Anagrafica</span>
            </button>
          </div>

        </form>
      }

      <!-- TAB 2: LISTA ISCRITTI -->
      @if (activeTab() === 'LIST') {
        <div class="space-y-3">
          <!-- Search box -->
          <div class="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <input
              type="text"
              placeholder="Cerca studente per nome o cognome..."
              [(ngModel)]="searchQuery"
              class="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm w-full sm:w-80 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <!-- VISTA MOBILE: Elenco a Card (md:hidden) -->
          <div class="block md:hidden space-y-3">
            @for (student of filteredStudents(); track student.id) {
              <div
                (click)="editStudent(student.id)"
                class="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 hover:border-emerald-300 transition-all cursor-pointer active:bg-slate-50"
              >
                <div class="flex items-start justify-between">
                  <div>
                    <h3 class="text-sm font-bold text-slate-900">{{ student.last_name }} {{ student.first_name }}</h3>
                    <p class="text-xs text-slate-500">{{ student.school || 'Scuola non indicata' }}</p>
                  </div>

                  <span class="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 text-xs font-semibold">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    <span>Modifica</span>
                  </span>
                </div>

                <!-- Giorni Frequenza Pill -->
                <div class="mt-3 flex items-center justify-between pt-2.5 border-t border-slate-100">
                  <div class="flex space-x-1">
                    <span class="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold" [class]="student.sub_lun ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-300'">L</span>
                    <span class="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold" [class]="student.sub_mar ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-300'">M</span>
                    <span class="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold" [class]="student.sub_mer ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-300'">M</span>
                    <span class="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold" [class]="student.sub_gio ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-300'">G</span>
                    <span class="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold" [class]="student.sub_ven ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-300'">V</span>
                  </div>

                  <div class="text-right text-xs">
                    @if (student.main_tutor_phone || student.tutors?.[0]?.phone) {
                      <a
                        [href]="'tel:' + (student.main_tutor_phone || student.tutors?.[0]?.phone)"
                        (click)="$event.stopPropagation()"
                        class="text-emerald-700 font-mono font-medium hover:underline"
                      >
                        📞 {{ student.main_tutor_phone || student.tutors?.[0]?.phone }}
                      </a>
                    } @else {
                      <span class="text-slate-400">Nessun tel.</span>
                    }
                  </div>
                </div>
              </div>
            } @empty {
              <div class="p-8 bg-white rounded-2xl text-center text-slate-400 font-medium border border-slate-200">
                Nessuno studente trovato.
              </div>
            }
          </div>

          <!-- VISTA DESKTOP: Tabella Tradizionale (hidden md:block) -->
          <div class="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr class="bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                    <th class="py-3.5 px-6">Studente</th>
                    <th class="py-3.5 px-6">Scuola</th>
                    <th class="py-3.5 px-6">Giorni Frequenza</th>
                    <th class="py-3.5 px-6">Tutore Principale</th>
                    <th class="py-3.5 px-6 text-right">Azioni</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 text-sm">
                  @for (student of filteredStudents(); track student.id) {
                    <tr
                      (click)="editStudent(student.id)"
                      class="hover:bg-emerald-50/40 transition-colors cursor-pointer group"
                      title="Clicca sulla riga per modificare lo studente"
                    >
                      <td class="py-4 px-6 font-semibold text-slate-800 flex items-center space-x-2">
                        <span class="group-hover:text-emerald-700 transition-colors">{{ student.last_name }} {{ student.first_name }}</span>
                      </td>
                      <td class="py-4 px-6 text-slate-500 text-xs">
                        {{ student.school || 'Non specificata' }}
                      </td>
                      <td class="py-4 px-6">
                        <div class="flex space-x-1">
                          <span class="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold" [class]="student.sub_lun ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-300'">L</span>
                          <span class="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold" [class]="student.sub_mar ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-300'">M</span>
                          <span class="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold" [class]="student.sub_mer ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-300'">M</span>
                          <span class="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold" [class]="student.sub_gio ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-300'">G</span>
                          <span class="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold" [class]="student.sub_ven ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-300'">V</span>
                        </div>
                      </td>
                      <td class="py-4 px-6 text-xs text-slate-600">
                        <p class="font-medium text-slate-800">{{ student.main_tutor_name || student.tutors?.[0]?.first_name || 'Nessuno' }}</p>
                        <p class="text-slate-400">{{ student.main_tutor_phone || student.tutors?.[0]?.phone || '-' }}</p>
                      </td>
                      <td class="py-4 px-6 text-right" (click)="$event.stopPropagation()">
                        <button
                          (click)="editStudent(student.id)"
                          class="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 text-xs font-semibold shadow-xs transition-all cursor-pointer"
                          title="Modifica scheda studente"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                          <span>Modifica</span>
                        </button>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="5" class="py-12 text-center text-slate-400 font-medium">Nessuno studente trovato.</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      }

    </div>
  `
})
export class AnagraficaComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private router = inject(Router);

  readonly activeTab = signal<'NEW' | 'LIST'>('NEW');
  readonly students = signal<Student[]>([]);
  readonly isSubmitting = signal<boolean>(false);
  readonly successMessage = signal<string | null>(null);
  searchQuery = '';

  studentForm: FormGroup = this.fb.group({
    first_name: ['', Validators.required],
    last_name: ['', Validators.required],
    school: [''],
    birth_date: [''],
    sub_lun: [true],
    sub_mar: [true],
    sub_mer: [true],
    sub_gio: [true],
    sub_ven: [true],
    tutors: this.fb.array([])
  });

  get tutors(): FormArray {
    return this.studentForm.get('tutors') as FormArray;
  }

  ngOnInit(): void {
    this.addTutor(true); // Almeno un tutore di default
    this.loadStudents();
  }

  addTutor(isMain: boolean = false): void {
    const tutorGroup = this.fb.group({
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      phone: ['', Validators.required],
      relationship: ['Genitore'],
      is_main: [isMain]
    });
    this.tutors.push(tutorGroup);
  }

  removeTutor(index: number): void {
    this.tutors.removeAt(index);
  }

  loadStudents(): void {
    this.api.getStudents().subscribe(list => this.students.set(list));
  }

  editStudent(studentId: string | number): void {
    this.router.navigate(['/anagrafica', studentId, 'edit']);
  }

  filteredStudents(): Student[] {
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) return this.students();
    return this.students().filter(s =>
      s.first_name.toLowerCase().includes(q) ||
      s.last_name.toLowerCase().includes(q) ||
      (s.school && s.school.toLowerCase().includes(q))
    );
  }

  onSubmit(): void {
    if (this.studentForm.invalid) return;
    this.isSubmitting.set(true);
    const formValue = this.studentForm.value;

    this.api.createStudent(formValue).subscribe({
      next: created => {
        this.isSubmitting.set(false);
        this.successMessage.set(`Studente ${created.first_name} ${created.last_name} registrato con successo!`);
        this.studentForm.reset({
          sub_lun: true,
          sub_mar: true,
          sub_mer: true,
          sub_gio: true,
          sub_ven: true
        });
        this.tutors.clear();
        this.addTutor(true);
        this.loadStudents();
      },
      error: err => {
        this.isSubmitting.set(false);
        alert('Errore durante il salvataggio: ' + err.message);
      }
    });
  }
}
