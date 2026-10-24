import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Project, ProjectTeacher, User } from '../../core/models';

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
            <div class="overflow-x-auto">
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

  projectForm: FormGroup = this.fb.group({
    title: ['', Validators.required],
    type: ['CORSO'],
    enrollment_fee: [0],
    max_enrolled: [0],
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

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'new') {
      this.isEditMode.set(true);
      this.projectId.set(id);
      this.loadProject(id);
      this.loadUsers();
    }
  }

  loadProject(id: string): void {
    this.apiService.getProjectById(id).subscribe({
      next: (proj) => {
        this.projectForm.patchValue({
          title: proj.title,
          type: proj.type || 'CORSO',
          enrollment_fee: proj.enrollment_fee || 0,
          max_enrolled: proj.max_enrolled || 0,
          start_date: proj.start_date || '',
          end_date: proj.end_date || '',
          location: proj.location || '',
          description: proj.description || ''
        });
        if (proj.teachers) {
          this.assignedTeachers.set(proj.teachers);
        }
      },
      error: (err) => console.error('Errore nel caricamento commessa:', err)
    });
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
