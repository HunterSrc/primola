import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { Student } from '../../core/models';

@Component({
  selector: 'app-student-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="p-3 sm:p-6 md:p-8 max-w-5xl mx-auto space-y-4 sm:space-y-6">
      
      <!-- Top Navigation & Breadcrumb -->
      <div class="flex items-center justify-between">
        <button
          (click)="goBack()"
          class="inline-flex items-center space-x-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-emerald-700 bg-white px-3.5 py-2 sm:px-4 sm:py-2 rounded-xl border border-slate-200 shadow-sm transition-all hover:bg-slate-50 cursor-pointer min-h-[40px]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Torna alla Lista</span>
        </button>

        <span class="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
          ID: {{ studentId() }}
        </span>
      </div>

      <!-- Main Edit Card -->
      <div class="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        
        <!-- Header -->
        <div class="p-4 sm:p-6 border-b border-slate-200/80 bg-gradient-to-r from-slate-50 via-white to-emerald-50/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 class="text-xl sm:text-2xl font-bold text-slate-800">
              Modifica Studente
            </h1>
            <p class="text-xs sm:text-sm text-slate-500 mt-0.5">Aggiorna dati anagrafici, giorni di abbonamento e contatti tutori</p>
          </div>

          @if (savedNotification()) {
            <div class="flex items-center space-x-2 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium animate-fade-in">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-emerald-600 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
              <span>{{ savedNotification() }}</span>
            </div>
          }
        </div>

        @if (isLoading()) {
          <div class="p-12 text-center text-slate-500 flex flex-col items-center justify-center space-y-3">
            <svg class="animate-spin h-8 w-8 text-emerald-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p class="text-sm font-medium">Caricamento scheda studente...</p>
          </div>
        } @else {
          <form [formGroup]="editForm" (ngSubmit)="onSubmit()" class="p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8">
            
            <!-- Sezione Dati Studente -->
            <div class="space-y-4">
              <h2 class="text-sm sm:text-base font-bold text-slate-700 flex items-center space-x-2 border-b pb-2">
                <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Anagrafica Studente</span>
              </h2>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-5">
                <div>
                  <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Nome *</label>
                  <input
                    type="text"
                    formControlName="first_name"
                    class="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50 text-sm"
                  />
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Cognome *</label>
                  <input
                    type="text"
                    formControlName="last_name"
                    class="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50 text-sm"
                  />
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Scuola Frequentata</label>
                  <input
                    type="text"
                    formControlName="school"
                    class="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50 text-sm"
                  />
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Data di Nascita</label>
                  <input
                    type="date"
                    formControlName="birth_date"
                    class="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50 text-sm"
                  />
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Luogo di Nascita</label>
                  <input
                    type="text"
                    formControlName="birth_place"
                    class="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50 text-sm"
                  />
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Residenza</label>
                  <input
                    type="text"
                    formControlName="residence"
                    class="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50 text-sm"
                  />
                </div>
              </div>
            </div>

            <!-- Sezione Frequenza Settimanale -->
            <div class="space-y-4">
              <h2 class="text-sm sm:text-base font-bold text-slate-700 flex items-center space-x-2 border-b pb-2">
                <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Giorni Frequenza Abbonamento</span>
              </h2>

              <div class="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3">
                <label class="flex items-center space-x-2.5 sm:space-x-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer hover:bg-emerald-50/40">
                  <input type="checkbox" formControlName="sub_lun" class="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500" />
                  <span class="text-xs sm:text-sm font-semibold text-slate-700">Lunedì</span>
                </label>
                <label class="flex items-center space-x-2.5 sm:space-x-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer hover:bg-emerald-50/40">
                  <input type="checkbox" formControlName="sub_mar" class="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500" />
                  <span class="text-xs sm:text-sm font-semibold text-slate-700">Martedì</span>
                </label>
                <label class="flex items-center space-x-2.5 sm:space-x-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer hover:bg-emerald-50/40">
                  <input type="checkbox" formControlName="sub_mer" class="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500" />
                  <span class="text-xs sm:text-sm font-semibold text-slate-700">Mercoledì</span>
                </label>
                <label class="flex items-center space-x-2.5 sm:space-x-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer hover:bg-emerald-50/40">
                  <input type="checkbox" formControlName="sub_gio" class="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500" />
                  <span class="text-xs sm:text-sm font-semibold text-slate-700">Giovedì</span>
                </label>
                <label class="flex items-center space-x-2.5 sm:space-x-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer hover:bg-emerald-50/40 col-span-2 sm:col-span-1">
                  <input type="checkbox" formControlName="sub_ven" class="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500" />
                  <span class="text-xs sm:text-sm font-semibold text-slate-700">Venerdì</span>
                </label>
              </div>
            </div>

            <!-- Sezione Tutori / Contatti -->
            <div class="space-y-4">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-2 gap-2">
                <h2 class="text-sm sm:text-base font-bold text-slate-700 flex items-center space-x-2">
                  <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>Contatti Tutori / Genitori ({{ tutors.length }})</span>
                </h2>
                <button
                  type="button"
                  (click)="addTutor()"
                  class="text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg flex items-center justify-center space-x-1 cursor-pointer w-full sm:w-auto"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
                  </svg>
                  <span>Aggiungi Tutore</span>
                </button>
              </div>

              <div formArrayName="tutors" class="space-y-4">
                @for (tutorGroup of tutors.controls; track $index) {
                  <div [formGroupName]="$index" class="p-3.5 sm:p-4 bg-slate-50/70 border border-slate-200 rounded-xl relative space-y-3">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center space-x-2">
                        <span class="text-xs font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700">#{{ $index + 1 }}</span>
                        <label class="inline-flex items-center space-x-2 text-xs font-semibold text-slate-700 cursor-pointer">
                          <input type="checkbox" formControlName="is_main" (change)="setMainTutor($index)" class="w-4 h-4 text-emerald-600 rounded" />
                          <span>Principale Emergenze</span>
                        </label>
                      </div>

                      @if (tutors.length > 1) {
                        <button
                          type="button"
                          (click)="removeTutor($index)"
                          class="text-red-500 hover:text-red-700 text-xs font-medium cursor-pointer p-1"
                        >
                          Rimuovi
                        </button>
                      }
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <label class="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Nome *</label>
                        <input
                          type="text"
                          formControlName="first_name"
                          class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label class="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Cognome *</label>
                        <input
                          type="text"
                          formControlName="last_name"
                          class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label class="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Telefono *</label>
                        <input
                          type="tel"
                          formControlName="phone"
                          class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label class="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Relazione</label>
                        <select
                          formControlName="relationship"
                          class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        >
                          <option value="Genitore">Genitore</option>
                          <option value="Madre">Madre</option>
                          <option value="Padre">Padre</option>
                          <option value="Nonno/a">Nonno/a</option>
                          <option value="Altro">Altro referente</option>
                        </select>
                      </div>
                    </div>
                  </div>
                }
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="pt-4 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-center justify-end gap-2 sm:gap-3">
              <button
                type="button"
                (click)="goBack()"
                class="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50 text-sm cursor-pointer min-h-[44px] flex items-center justify-center"
              >
                Annulla
              </button>

              <button
                type="submit"
                [disabled]="editForm.invalid || isSaving()"
                class="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-sm shadow-sm transition-all flex items-center justify-center space-x-2 cursor-pointer min-h-[44px]"
              >
                @if (isSaving()) {
                  <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Salvataggio in corso...</span>
                } @else {
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Salva Modifiche</span>
                }
              </button>
            </div>

          </form>
        }

      </div>
    </div>
  `
})
export class StudentEditComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private api = inject(ApiService);

  readonly studentId = signal<string>('');
  readonly isLoading = signal<boolean>(true);
  readonly isSaving = signal<boolean>(false);
  readonly savedNotification = signal<string | null>(null);

  editForm: FormGroup = this.fb.group({
    first_name: ['', Validators.required],
    last_name: ['', Validators.required],
    school: [''],
    birth_date: [''],
    birth_place: [''],
    residence: [''],
    sub_lun: [true],
    sub_mar: [true],
    sub_mer: [true],
    sub_gio: [true],
    sub_ven: [true],
    tutors: this.fb.array([])
  });

  get tutors(): FormArray {
    return this.editForm.get('tutors') as FormArray;
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.studentId.set(id);
      this.loadStudent(id);
    } else {
      this.router.navigate(['/anagrafica']);
    }
  }

  loadStudent(id: string): void {
    this.isLoading.set(true);
    this.api.getStudentById(id).subscribe({
      next: (student) => {
        this.isLoading.set(false);
        if (student) {
          this.populateForm(student);
        }
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  populateForm(student: Student): void {
    this.editForm.patchValue({
      first_name: student.first_name,
      last_name: student.last_name,
      school: student.school || '',
      birth_date: student.birth_date || '',
      birth_place: student.birth_place || '',
      residence: student.residence || '',
      sub_lun: student.sub_lun ?? true,
      sub_mar: student.sub_mar ?? true,
      sub_mer: student.sub_mer ?? true,
      sub_gio: student.sub_gio ?? true,
      sub_ven: student.sub_ven ?? true
    });

    this.tutors.clear();
    if (student.tutors && student.tutors.length > 0) {
      student.tutors.forEach(t => this.addTutorGroup(t.first_name, t.last_name, t.phone, t.is_main, t.relationship));
    } else {
      this.addTutorGroup('', '', '', true, 'Genitore');
    }
  }

  addTutorGroup(firstName = '', lastName = '', phone = '', isMain = false, rel = 'Genitore'): void {
    const group = this.fb.group({
      first_name: [firstName, Validators.required],
      last_name: [lastName, Validators.required],
      phone: [phone, Validators.required],
      relationship: [rel],
      is_main: [isMain]
    });
    this.tutors.push(group);
  }

  addTutor(): void {
    this.addTutorGroup('', '', '', false, 'Genitore');
  }

  removeTutor(index: number): void {
    this.tutors.removeAt(index);
  }

  setMainTutor(selectedIndex: number): void {
    this.tutors.controls.forEach((ctrl, idx) => {
      ctrl.patchValue({ is_main: idx === selectedIndex });
    });
  }

  onSubmit(): void {
    if (this.editForm.invalid) return;

    this.isSaving.set(true);
    const formVal = this.editForm.value;

    this.api.updateStudent(this.studentId(), formVal).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.savedNotification.set('Modifiche salvate con successo!');
        setTimeout(() => this.savedNotification.set(null), 3000);
      },
      error: (err) => {
        this.isSaving.set(false);
        alert('Errore durante il salvataggio: ' + err.message);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/anagrafica']);
  }
}
