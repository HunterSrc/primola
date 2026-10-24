import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { User, UserGroup, ProjectTeacher, AfterschoolAssignment } from '../../core/models';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="p-6 max-w-4xl mx-auto space-y-6">
      <!-- Breadcrumb & Title -->
      <div>
        <a routerLink="/users" class="text-xs text-[#3857F1] hover:underline flex items-center gap-1 mb-2">
          &larr; Torna alla lista utenti
        </a>
        <h1 class="text-2xl font-bold text-slate-800">
          {{ isEditMode() ? 'Modifica Profilo Utente' : 'Nuovo Utente' }}
        </h1>
        <p class="text-sm text-slate-500">
          {{ isEditMode() ? 'Aggiorna i dati anagrafici e le assegnazioni' : 'Compila i campi per creare un nuovo account' }}
        </p>
      </div>

      <!-- Main Form Card -->
      <form [formGroup]="userForm" (ngSubmit)="saveUser()" class="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 space-y-6">
        
        <!-- Dati Anagrafici -->
        <div>
          <h2 class="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Dati Anagrafici</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Nome</label>
              <input
                type="text"
                formControlName="first_name"
                class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#3857F1] focus:ring-1 focus:ring-[#3857F1]"
                placeholder="Nome"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Cognome</label>
              <input
                type="text"
                formControlName="last_name"
                class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#3857F1] focus:ring-1 focus:ring-[#3857F1]"
                placeholder="Cognome"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Email <span class="text-rose-500">*</span></label>
              <input
                type="email"
                formControlName="email"
                class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#3857F1] focus:ring-1 focus:ring-[#3857F1]"
                placeholder="nome.cognome@primola.it"
              />
              @if (userForm.get('email')?.touched && userForm.get('email')?.invalid) {
                <span class="text-xs text-rose-500 mt-1 block">Inserisci un indirizzo email valido.</span>
              }
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Telefono</label>
              <input
                type="tel"
                formControlName="phone"
                class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#3857F1] focus:ring-1 focus:ring-[#3857F1]"
                placeholder="+39 333 0000000"
              />
            </div>

            <div class="md:col-span-2">
              <label class="block text-xs font-semibold text-slate-600 mb-1">
                Password {{ isEditMode() ? '(lascia vuoto se non vuoi modificarla)' : '*' }}
              </label>
              <input
                type="password"
                formControlName="password"
                class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#3857F1] focus:ring-1 focus:ring-[#3857F1]"
                placeholder="••••••••••••"
              />
            </div>
          </div>
        </div>

        <!-- Sezione Ruoli / Gruppi (Multi-select) -->
        <!-- Visibile e modificabile solo per ADMIN -->
        @if (authService.isAdmin()) {
          <div class="border-t border-slate-100 pt-6">
            <h2 class="text-sm font-bold uppercase tracking-wider text-slate-400 mb-2">Gruppi e Ruoli di Sistema</h2>
            <p class="text-xs text-slate-500 mb-4">Seleziona uno o più gruppi a cui appartiene l'utente:</p>
            
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              @for (grp of availableGroups; track grp) {
                <label
                  class="flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all"
                  [ngClass]="{
                    'border-[#3857F1] bg-blue-50/50': isGroupSelected(grp),
                    'border-slate-200 hover:border-slate-300': !isGroupSelected(grp)
                  }"
                >
                  <input
                    type="checkbox"
                    [checked]="isGroupSelected(grp)"
                    (change)="toggleGroup(grp)"
                    class="rounded text-[#3857F1] focus:ring-[#3857F1] h-4 w-4"
                  />
                  <div>
                    <span class="block text-sm font-semibold text-slate-800">{{ grp }}</span>
                    <span class="block text-[11px] text-slate-500">
                      {{ getGroupDescription(grp) }}
                    </span>
                  </div>
                </label>
              }
            </div>
          </div>
        } @else if (isEditMode() && userGroups().length > 0) {
          <!-- Per utenti non-ADMIN: sola lettura dei gruppi -->
          <div class="border-t border-slate-100 pt-6">
            <h2 class="text-sm font-bold uppercase tracking-wider text-slate-400 mb-2">Gruppi Associati</h2>
            <div class="flex gap-2">
              @for (grp of userGroups(); track grp) {
                <span class="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700">
                  {{ grp }}
                </span>
              }
            </div>
          </div>
        }

        <!-- Error / Success Alert -->
        @if (errorMessage()) {
          <div class="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            {{ errorMessage() }}
          </div>
        }

        <!-- Actions -->
        <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <a
            routerLink="/users"
            class="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Annulla
          </a>
          <button
            type="submit"
            [disabled]="userForm.invalid || saving()"
            class="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#3857F1] hover:bg-blue-700 disabled:opacity-50 transition-all shadow-sm shadow-blue-500/20"
          >
            {{ saving() ? 'Salvataggio...' : 'Salva Modifiche' }}
          </button>
        </div>
      </form>

      <!-- SEZIONE COMMESSA SPECIALE DOPOSCUOLA -->
      <!-- Visibile e modificabile SOLO da ADMIN e OFFICE se l'utente ha ruolo TEACHER. Nascosta a TEACHER. -->
      @if (authService.canViewCompensation() && isEditMode() && userGroups().includes('TEACHER')) {
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 space-y-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="p-2 rounded-xl bg-amber-50 text-amber-600">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </span>
              <div>
                <h2 class="text-lg font-bold text-slate-800">Commessa Speciale Doposcuola</h2>
                <p class="text-xs text-slate-500">Assegnazione singola esclusiva per docente con tariffa oraria dedicata</p>
              </div>
            </div>

            @if (afterschoolAssignment()) {
              <span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                Assegnata
              </span>
            } @else {
              <span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                Non assegnata
              </span>
            }
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Tariffa Oraria (€/h)</label>
              <div class="relative">
                <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-sm">€</span>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  [value]="afterschoolRate()"
                  (input)="onRateChange($event)"
                  placeholder="0.00"
                  class="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#3857F1] focus:ring-1 focus:ring-[#3857F1]"
                />
              </div>
            </div>

            <div class="sm:col-span-2">
              <label class="block text-xs font-semibold text-slate-600 mb-1">Note / Dettagli attività</label>
              <input
                type="text"
                [value]="afterschoolNotes()"
                (input)="onNotesChange($event)"
                placeholder="Es. Sostegno compiti pomeridiano sede centrale"
                class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#3857F1] focus:ring-1 focus:ring-[#3857F1]"
              />
            </div>
          </div>

          @if (afterschoolMessage()) {
            <div
              class="p-3 rounded-xl text-xs"
              [ngClass]="{
                'bg-emerald-50 text-emerald-700 border border-emerald-200': afterschoolSuccess(),
                'bg-rose-50 text-rose-700 border border-rose-200': !afterschoolSuccess()
              }"
            >
              {{ afterschoolMessage() }}
            </div>
          }

          <div class="flex items-center justify-end gap-2 pt-2">
            @if (afterschoolAssignment()) {
              <button
                type="button"
                (click)="removeAfterschool()"
                [disabled]="afterschoolSaving()"
                class="px-4 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors"
              >
                Rimuovi Assegnazione
              </button>
            }
            <button
              type="button"
              (click)="saveAfterschool()"
              [disabled]="afterschoolSaving()"
              class="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              {{ afterschoolSaving() ? 'Salvataggio...' : (afterschoolAssignment() ? 'Aggiorna Doposcuola' : 'Assegna Doposcuola') }}
            </button>
          </div>
        </div>
      }

      <!-- SEZIONE COMMESSE ASSEGNATE -->
      <!-- Mostrata SOLO se l'utente connesso è ADMIN o OFFICE (completamente nascosta per TEACHER) -->
      @if (authService.canViewCompensation() && isEditMode()) {
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-lg font-bold text-slate-800">Commesse & Compensi Assegnati</h2>
              <p class="text-xs text-slate-500">Commesse a cui partecipa il docente con compenso orario e monte ore</p>
            </div>
          </div>

          @if (assignedProjects().length === 0) {
            <p class="text-sm text-slate-400 italic py-4">Nessuna commessa attualmente assegnata a questo utente.</p>
          } @else {
            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr class="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
                    <th class="py-2.5 px-3">Commessa</th>
                    <th class="py-2.5 px-3">Sede</th>
                    <th class="py-2.5 px-3">Costo Orario</th>
                    <th class="py-2.5 px-3">Ore Assegnate</th>
                    <th class="py-2.5 px-3 text-right">Totale Previsto</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 text-sm">
                  @for (p of assignedProjects(); track p.project_id) {
                    <tr>
                      <td class="py-2.5 px-3 font-semibold text-slate-800">{{ p.title }}</td>
                      <td class="py-2.5 px-3 text-slate-500">{{ p.location || '-' }}</td>
                      <td class="py-2.5 px-3 font-mono text-xs">
                        {{ p.hourly_rate != null ? '€ ' + p.hourly_rate : 'Non impostato' }}
                      </td>
                      <td class="py-2.5 px-3 font-mono text-xs">
                        {{ p.assigned_hours != null ? p.assigned_hours + ' h' : 'Non impostato' }}
                      </td>
                      <td class="py-2.5 px-3 font-mono text-xs text-right font-semibold text-emerald-600">
                        {{ (p.hourly_rate && p.assigned_hours) ? '€ ' + (p.hourly_rate * p.assigned_hours).toFixed(2) : '-' }}
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
export class UserFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private apiService = inject(ApiService);
  authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  isEditMode = signal(false);
  userId = signal<string | null>(null);
  userGroups = signal<UserGroup[]>(['TEACHER']);
  assignedProjects = signal<any[]>([]);
  saving = signal(false);
  errorMessage = signal<string | null>(null);

  // Commessa Speciale Doposcuola state
  afterschoolAssignment = signal<AfterschoolAssignment | null>(null);
  afterschoolRate = signal<number | string>('');
  afterschoolNotes = signal<string>('');
  afterschoolSaving = signal(false);
  afterschoolMessage = signal<string | null>(null);
  afterschoolSuccess = signal<boolean>(false);

  availableGroups: UserGroup[] = ['ADMIN', 'OFFICE', 'TEACHER'];

  userForm: FormGroup = this.fb.group({
    first_name: [''],
    last_name: [''],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    password: ['']
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'new') {
      this.isEditMode.set(true);
      this.userId.set(id);
      this.loadUserDetail(id);
    } else {
      // In creazione password obbligatoria
      this.userForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
      this.userForm.get('password')?.updateValueAndValidity();
    }
  }

  loadUserDetail(id: string): void {
    this.apiService.getUserById(id).subscribe({
      next: (user: any) => {
        this.userForm.patchValue({
          first_name: user.first_name || '',
          last_name: user.last_name || '',
          email: user.email || '',
          phone: user.phone || ''
        });

        if (user.groups && user.groups.length > 0) {
          this.userGroups.set(user.groups);
        }

        if (user.projects) {
          this.assignedProjects.set(user.projects);
        }

        if (user.afterschool_assignment) {
          this.afterschoolAssignment.set(user.afterschool_assignment);
          this.afterschoolRate.set(user.afterschool_assignment.hourly_rate ?? '');
          this.afterschoolNotes.set(user.afterschool_assignment.notes || '');
        } else {
          this.afterschoolAssignment.set(null);
          this.afterschoolRate.set('');
          this.afterschoolNotes.set('');
        }
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.error || 'Errore nel recupero dell\'utente.');
      }
    });
  }

  isGroupSelected(group: UserGroup): boolean {
    return this.userGroups().includes(group);
  }

  toggleGroup(group: UserGroup): void {
    const current = [...this.userGroups()];
    const index = current.indexOf(group);
    if (index > -1) {
      if (current.length > 1) { // mantieni almeno 1 gruppo
        current.splice(index, 1);
      }
    } else {
      current.push(group);
    }
    this.userGroups.set(current);
  }

  getGroupDescription(grp: UserGroup): string {
    switch (grp) {
      case 'ADMIN': return 'Accesso globale e gestione ruoli';
      case 'OFFICE': return 'Segreteria e rendicontazione';
      case 'TEACHER': return 'Docente con accesso ristretto';
    }
  }

  saveUser(): void {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);

    const val = this.userForm.value;
    const payload: any = {
      first_name: val.first_name,
      last_name: val.last_name,
      email: val.email,
      phone: val.phone
    };

    if (val.password) {
      payload.password = val.password;
    }

    if (this.authService.isAdmin()) {
      payload.groups = this.userGroups();
    }

    if (this.isEditMode()) {
      this.apiService.updateUser(this.userId()!, payload).subscribe({
        next: () => {
          this.saving.set(false);
          this.router.navigate(['/users']);
        },
        error: (err) => {
          this.saving.set(false);
          this.errorMessage.set(err?.error?.error || 'Errore durante l\'aggiornamento.');
        }
      });
    } else {
      this.apiService.createUser(payload).subscribe({
        next: () => {
          this.saving.set(false);
          this.router.navigate(['/users']);
        },
        error: (err) => {
          this.saving.set(false);
          this.errorMessage.set(err?.error?.error || 'Errore durante la creazione.');
        }
      });
    }
  }

  onRateChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.afterschoolRate.set(target.value);
  }

  onNotesChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.afterschoolNotes.set(target.value);
  }

  saveAfterschool(): void {
    const uid = this.userId();
    if (!uid) return;

    const rateVal = Number(this.afterschoolRate());
    if (isNaN(rateVal) || rateVal < 0) {
      this.afterschoolMessage.set('Inserisci una tariffa oraria valida (>= 0).');
      this.afterschoolSuccess.set(false);
      return;
    }

    this.afterschoolSaving.set(true);
    this.afterschoolMessage.set(null);

    this.apiService.assignAfterschool({
      user_id: uid,
      hourly_rate: rateVal,
      notes: this.afterschoolNotes() || null
    }).subscribe({
      next: (assignment) => {
        this.afterschoolSaving.set(false);
        this.afterschoolAssignment.set(assignment);
        this.afterschoolRate.set(assignment.hourly_rate);
        this.afterschoolNotes.set(assignment.notes || '');
        this.afterschoolMessage.set('Commessa speciale dopo scuola salvata con successo.');
        this.afterschoolSuccess.set(true);
      },
      error: (err) => {
        this.afterschoolSaving.set(false);
        this.afterschoolMessage.set(err?.error?.error || 'Errore nel salvataggio del doposcuola.');
        this.afterschoolSuccess.set(false);
      }
    });
  }

  removeAfterschool(): void {
    const uid = this.userId();
    if (!uid) return;

    if (!confirm('Confermi la rimozione della commessa dopo scuola per questo docente?')) {
      return;
    }

    this.afterschoolSaving.set(true);
    this.afterschoolMessage.set(null);

    this.apiService.removeAfterschoolAssignment(uid).subscribe({
      next: () => {
        this.afterschoolSaving.set(false);
        this.afterschoolAssignment.set(null);
        this.afterschoolRate.set('');
        this.afterschoolNotes.set('');
        this.afterschoolMessage.set('Commessa dopo scuola rimossa con successo.');
        this.afterschoolSuccess.set(true);
      },
      error: (err) => {
        this.afterschoolSaving.set(false);
        this.afterschoolMessage.set(err?.error?.error || 'Errore nella rimozione del doposcuola.');
        this.afterschoolSuccess.set(false);
      }
    });
  }
}
