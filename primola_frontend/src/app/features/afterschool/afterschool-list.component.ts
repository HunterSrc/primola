import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { AfterschoolAssignment, User } from '../../core/models';

@Component({
  selector: 'app-afterschool-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="p-6 max-w-7xl mx-auto space-y-6">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <span class="p-2 rounded-xl bg-amber-100 text-amber-700">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </span>
            <h1 class="text-2xl font-bold text-slate-800">Commessa Speciale Dopo Scuola</h1>
          </div>
          <p class="text-sm text-slate-500 mt-1">
            Gestione centralizzata e tariffe orarie della commessa dopo scuola per i docenti abilitati
          </p>
        </div>

        @if (authService.canManageUsers()) {
          <button
            type="button"
            (click)="openAssignModal()"
            class="inline-flex items-center justify-center px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-xl shadow-sm shadow-amber-500/20 transition-all text-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Assegna Docente
          </button>
        }
      </div>

      <!-- Overview Stats Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Docenti Assegnati</span>
            <span class="text-2xl font-extrabold text-slate-800 mt-1 block">{{ assignments().length }}</span>
          </div>
          <div class="p-3 bg-blue-50 text-[#3857F1] rounded-2xl">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        </div>

        <div class="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Tariffa Media Oraria</span>
            <span class="text-2xl font-extrabold text-emerald-600 mt-1 block">€ {{ averageHourlyRate().toFixed(2) }}</span>
          </div>
          <div class="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        <div class="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Regola Assegnazione</span>
            <span class="text-sm font-semibold text-slate-700 mt-1 block">1 per Docente (Esclusiva)</span>
          </div>
          <div class="p-3 bg-amber-50 text-amber-600 rounded-2xl">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
        </div>
      </div>

      <!-- Elenco Docenti con Commessa Dopo Scuola -->
      @if (loading()) {
        <div class="p-12 text-center text-slate-400">Caricamento assegnazioni dopo scuola...</div>
      } @else if (assignments().length === 0) {
        <div class="bg-white rounded-2xl p-12 text-center text-slate-400 border border-slate-200/80">
          Nessun docente ha attualmente una commessa dopo scuola assegnata. Clicca su "Assegna Docente" per cominciare.
        </div>
      } @else {
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                  <th class="py-3 px-4">Docente</th>
                  <th class="py-3 px-4">Email & Recapiti</th>
                  <th class="py-3 px-4">Tariffa Oraria</th>
                  <th class="py-3 px-4">Note / Dettagli</th>
                  <th class="py-3 px-4 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 text-sm">
                @for (item of assignments(); track item.id) {
                  <tr class="hover:bg-slate-50/50 transition-colors">
                    <td class="py-3 px-4">
                      <div class="font-bold text-slate-800">
                        {{ item.last_name || '' }} {{ item.first_name || '' }}
                      </div>
                      <span class="text-[10px] uppercase font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                        Dopo Scuola
                      </span>
                    </td>
                    <td class="py-3 px-4 text-slate-600">
                      <div>{{ item.email }}</div>
                      @if (item.phone) {
                        <div class="text-xs text-slate-400">{{ item.phone }}</div>
                      }
                    </td>
                    <td class="py-3 px-4 font-mono font-semibold text-emerald-600">
                      € {{ item.hourly_rate != null ? Number(item.hourly_rate).toFixed(2) : '0.00' }} /h
                    </td>
                    <td class="py-3 px-4 text-slate-500 max-w-xs truncate">
                      {{ item.notes || '-' }}
                    </td>
                    <td class="py-3 px-4 text-right space-x-2">
                      <a
                        [routerLink]="['/users', item.user_id]"
                        class="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 inline-block transition-colors"
                      >
                        Scheda Docente
                      </a>
                      @if (authService.canManageUsers()) {
                        <button
                          type="button"
                          (click)="editAssignment(item)"
                          class="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-amber-700 hover:bg-amber-50 border border-amber-200 transition-colors"
                        >
                          Modifica
                        </button>
                        <button
                          type="button"
                          (click)="removeAssignment(item)"
                          class="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors"
                        >
                          Rimuovi
                        </button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <!-- Modale di Assegnazione / Modifica Doposcuola -->
      @if (showModal()) {
        <div class="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-scale-up">
            <div class="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 class="font-bold text-slate-800 text-lg">
                {{ editingId() ? 'Modifica Tariffa Doposcuola' : 'Assegna Commessa Doposcuola' }}
              </h3>
              <button
                type="button"
                (click)="closeModal()"
                class="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                ✕
              </button>
            </div>

            @if (modalError()) {
              <div class="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
                {{ modalError() }}
              </div>
            }

            <div class="space-y-4">
              @if (!editingId()) {
                <div>
                  <label class="block text-xs font-semibold text-slate-600 mb-1">Seleziona Docente (TEACHER)</label>
                  <select
                    [(ngModel)]="selectedUserId"
                    class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#3857F1]"
                  >
                    <option value="">-- Seleziona un docente --</option>
                    @for (t of availableTeachers(); track t.id) {
                      <option [value]="t.id">
                        {{ t.last_name }} {{ t.first_name }} ({{ t.email }})
                      </option>
                    }
                  </select>
                  @if (availableTeachers().length === 0) {
                    <span class="text-[11px] text-amber-600 mt-1 block">
                      Tutti i docenti hanno già una commessa dopo scuola assegnata oppure non ci sono docenti registrati.
                    </span>
                  }
                </div>
              } @else {
                <div>
                  <label class="block text-xs font-semibold text-slate-400 mb-1">Docente Selezionato</label>
                  <div class="font-semibold text-slate-800 text-sm p-2 bg-slate-50 rounded-xl">
                    {{ editingTeacherName() }}
                  </div>
                </div>
              }

              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1">Tariffa Oraria (€/h)</label>
                <div class="relative">
                  <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-sm">€</span>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    [(ngModel)]="modalRate"
                    placeholder="0.00"
                    class="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#3857F1]"
                  />
                </div>
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1">Note (opzionale)</label>
                <input
                  type="text"
                  [(ngModel)]="modalNotes"
                  placeholder="Es. Orario pomeridiano / sede"
                  class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#3857F1]"
                />
              </div>
            </div>

            <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                (click)="closeModal()"
                class="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                Annulla
              </button>
              <button
                type="button"
                (click)="submitModal()"
                [disabled]="modalSaving() || (!editingId() && !selectedUserId)"
                class="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 shadow-sm"
              >
                {{ modalSaving() ? 'Salvataggio...' : 'Conferma Assegnazione' }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class AfterschoolListComponent implements OnInit {
  private apiService = inject(ApiService);
  authService = inject(AuthService);

  assignments = signal<AfterschoolAssignment[]>([]);
  allUsers = signal<User[]>([]);
  loading = signal(false);

  // Modal State
  showModal = signal(false);
  editingId = signal<string | null>(null);
  editingTeacherName = signal<string>('');
  selectedUserId = '';
  modalRate = 0;
  modalNotes = '';
  modalSaving = signal(false);
  modalError = signal<string | null>(null);

  Number = Number;

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.apiService.getAfterschoolAssignments().subscribe({
      next: (data) => {
        this.assignments.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Errore caricamento dopo scuola:', err);
        this.loading.set(false);
      }
    });

    this.apiService.getUsers().subscribe({
      next: (users) => {
        this.allUsers.set(users);
      },
      error: (err) => {
        console.error('Errore caricamento utenti:', err);
      }
    });
  }

  // Docenti TEACHER che non hanno ancora una commessa dopo scuola assegnata
  availableTeachers(): User[] {
    const assignedUserIds = new Set(this.assignments().map(a => a.user_id));
    return this.allUsers().filter(u => {
      const isTeacher = u.groups ? u.groups.includes('TEACHER') : u.role === 'TEACHER';
      return isTeacher && !assignedUserIds.has(String(u.id));
    });
  }

  averageHourlyRate(): number {
    const list = this.assignments();
    if (list.length === 0) return 0;
    const sum = list.reduce((acc, curr) => acc + (Number(curr.hourly_rate) || 0), 0);
    return sum / list.length;
  }

  openAssignModal(): void {
    this.editingId.set(null);
    this.editingTeacherName.set('');
    this.selectedUserId = '';
    this.modalRate = 0;
    this.modalNotes = '';
    this.modalError.set(null);
    this.showModal.set(true);
  }

  editAssignment(item: AfterschoolAssignment): void {
    this.editingId.set(item.id || item.user_id);
    this.editingTeacherName.set(`${item.last_name || ''} ${item.first_name || ''} (${item.email})`);
    this.selectedUserId = item.user_id;
    this.modalRate = Number(item.hourly_rate) || 0;
    this.modalNotes = item.notes || '';
    this.modalError.set(null);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  submitModal(): void {
    const uid = this.selectedUserId;
    if (!uid) {
      this.modalError.set('Seleziona un docente.');
      return;
    }

    if (this.modalRate == null || this.modalRate < 0 || isNaN(Number(this.modalRate))) {
      this.modalError.set('Inserisci una tariffa oraria valida (>= 0).');
      return;
    }

    this.modalSaving.set(true);
    this.modalError.set(null);

    this.apiService.assignAfterschool({
      user_id: uid,
      hourly_rate: Number(this.modalRate),
      notes: this.modalNotes || null
    }).subscribe({
      next: () => {
        this.modalSaving.set(false);
        this.closeModal();
        this.loadData();
      },
      error: (err) => {
        this.modalSaving.set(false);
        this.modalError.set(err?.error?.error || 'Errore durante l\'assegnazione.');
      }
    });
  }

  removeAssignment(item: AfterschoolAssignment): void {
    const name = `${item.last_name || ''} ${item.first_name || ''}`;
    if (!confirm(`Sei sicuro di voler rimuovere la commessa dopo scuola per il docente ${name}?`)) {
      return;
    }

    this.apiService.removeAfterschoolAssignment(item.user_id).subscribe({
      next: () => {
        this.loadData();
      },
      error: (err) => {
        alert(err?.error?.error || 'Errore nella rimozione della commessa.');
      }
    });
  }
}
