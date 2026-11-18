import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { User, UserStatus } from '../../core/models';

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="p-6 max-w-7xl mx-auto space-y-6">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-slate-800">Gestione Utenti & Ruoli</h1>
          <p class="text-sm text-slate-500">Amministrazione degli account di sistema, approvazioni e autorizzazioni</p>
        </div>
        @if (authService.canManageUsers()) {
          <a
            routerLink="/users/new"
            class="inline-flex items-center justify-center px-4 py-2.5 bg-[#3857F1] hover:bg-blue-700 text-white font-medium rounded-xl shadow-sm shadow-blue-500/20 transition-all text-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Nuovo Utente
          </a>
        }
      </div>

      <!-- Banner Avviso Registrazioni in Attesa -->
      @if (authService.isAdmin() && pendingCount() > 0) {
        <div class="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div class="flex items-center space-x-3">
            <span class="p-2 bg-amber-100 text-amber-700 rounded-xl">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </span>
            <div>
              <h2 class="text-sm font-semibold text-amber-900">
                {{ pendingCount() === 1 ? '1 utente in attesa di autorizzazione' : pendingCount() + ' utenti in attesa di autorizzazione' }}
              </h2>
              <p class="text-xs text-amber-700">Verifica i dati e approva l'accesso per abilitare il login.</p>
            </div>
          </div>
          <button
            type="button"
            (click)="setStatusFilter('PENDING')"
            class="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm"
          >
            Visualizza richieste
          </button>
        </div>
      }

      <!-- Barra Filtri: Ricerca rapida e Filtri Stato -->
      <div class="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <!-- Input Ricerca -->
        <div class="flex items-center gap-3 flex-1">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            [value]="searchTerm()"
            (input)="updateSearch($event)"
            placeholder="Cerca per nome, cognome o email..."
            class="w-full bg-transparent text-sm focus:outline-none text-slate-700 placeholder:text-slate-400"
          />
        </div>

        <!-- Selettore Stato -->
        <div class="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            type="button"
            (click)="setStatusFilter('ALL')"
            class="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap"
            [ngClass]="{
              'bg-slate-800 text-white': statusFilter() === 'ALL',
              'bg-slate-100 text-slate-600 hover:bg-slate-200': statusFilter() !== 'ALL'
            }"
          >
            Tutti ({{ users().length }})
          </button>
          <button
            type="button"
            (click)="setStatusFilter('PENDING')"
            class="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center space-x-1.5"
            [ngClass]="{
              'bg-amber-600 text-white': statusFilter() === 'PENDING',
              'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200/60': statusFilter() !== 'PENDING'
            }"
          >
            <span>In attesa</span>
            @if (pendingCount() > 0) {
              <span class="px-1.5 py-0.2 rounded-full text-[10px] font-bold"
                    [ngClass]="statusFilter() === 'PENDING' ? 'bg-white text-amber-700' : 'bg-amber-200 text-amber-900'">
                {{ pendingCount() }}
              </span>
            }
          </button>
          <button
            type="button"
            (click)="setStatusFilter('APPROVED')"
            class="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap"
            [ngClass]="{
              'bg-emerald-600 text-white': statusFilter() === 'APPROVED',
              'bg-slate-100 text-slate-600 hover:bg-slate-200': statusFilter() !== 'APPROVED'
            }"
          >
            Attivi
          </button>
          <button
            type="button"
            (click)="setStatusFilter('REJECTED')"
            class="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap"
            [ngClass]="{
              'bg-rose-600 text-white': statusFilter() === 'REJECTED',
              'bg-slate-100 text-slate-600 hover:bg-slate-200': statusFilter() !== 'REJECTED'
            }"
          >
            Rifiutati
          </button>
        </div>
      </div>

      <!-- Lista / Tabella Utenti -->
      <div class="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        @if (loading()) {
          <div class="p-12 text-center text-slate-400 flex flex-col items-center">
            <svg class="animate-spin h-8 w-8 text-[#3857F1] mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
            </svg>
            Caricamento utenti in corso...
          </div>
        } @else if (filteredUsers().length === 0) {
          <div class="p-12 text-center text-slate-400">
            Nessun utente trovato corrispondente ai criteri di ricerca.
          </div>
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-slate-50/70 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th class="py-3.5 px-4">Utente</th>
                  <th class="py-3.5 px-4">Email</th>
                  <th class="py-3.5 px-4">Telefono</th>
                  <th class="py-3.5 px-4">Stato</th>
                  <th class="py-3.5 px-4">Ruoli / Gruppi</th>
                  <th class="py-3.5 px-4 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 text-sm">
                @for (user of filteredUsers(); track user.id) {
                  <tr class="hover:bg-slate-50/60 transition-colors" [ngClass]="{ 'bg-amber-50/30': (user.status || 'APPROVED') === 'PENDING' }">
                    <td class="py-3.5 px-4 font-medium text-slate-800">
                      {{ user.first_name || '' }} {{ user.last_name || '' }}
                      @if (!user.first_name && !user.last_name) {
                        <span class="text-slate-400 italic">Senza nome</span>
                      }
                    </td>
                    <td class="py-3.5 px-4 text-slate-600 font-mono text-xs">
                      {{ user.email }}
                    </td>
                    <td class="py-3.5 px-4 text-slate-500">
                      {{ user.phone || '-' }}
                    </td>
                    <td class="py-3.5 px-4">
                      <!-- Badge Stato Account -->
                      @switch (user.status || 'APPROVED') {
                        @case ('PENDING') {
                          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                            <span class="w-1.5 h-1.5 mr-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                            In attesa
                          </span>
                        }
                        @case ('REJECTED') {
                          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
                            <span class="w-1.5 h-1.5 mr-1.5 rounded-full bg-rose-500"></span>
                            Rifiutato
                          </span>
                        }
                        @default {
                          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <span class="w-1.5 h-1.5 mr-1.5 rounded-full bg-emerald-500"></span>
                            Attivo
                          </span>
                        }
                      }
                    </td>
                    <td class="py-3.5 px-4">
                      <div class="flex flex-wrap gap-1.5">
                        @for (group of user.groups || []; track group) {
                          <span
                            class="px-2 py-0.5 rounded-md text-xs font-semibold"
                            [ngClass]="{
                              'bg-purple-100 text-purple-700 border border-purple-200': group === 'ADMIN',
                              'bg-blue-100 text-blue-700 border border-blue-200': group === 'OFFICE',
                              'bg-emerald-100 text-emerald-700 border border-emerald-200': group === 'TEACHER'
                            }"
                          >
                            {{ group }}
                          </span>
                        }
                      </div>
                    </td>
                    <td class="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                      <!-- Azioni Rapide Approvazione per ADMIN -->
                      @if (authService.isAdmin() && user.id !== authService.currentUser()?.id) {
                        @if ((user.status || 'APPROVED') === 'PENDING') {
                          <button
                            type="button"
                            (click)="changeStatus(user, 'APPROVED')"
                            title="Approva registrazione"
                            class="inline-flex items-center px-2.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 mr-1 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                            </svg>
                            Approva
                          </button>
                          <button
                            type="button"
                            (click)="changeStatus(user, 'REJECTED')"
                            title="Rifiuta registrazione"
                            class="inline-flex items-center px-2.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-200"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 mr-1 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Rifiuta
                          </button>
                        } @else if ((user.status || 'APPROVED') === 'REJECTED') {
                          <button
                            type="button"
                            (click)="changeStatus(user, 'APPROVED')"
                            title="Riabilita utente"
                            class="inline-flex items-center px-2.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200"
                          >
                            Riabilita
                          </button>
                        }
                      }

                      <a
                        [routerLink]="['/users', user.id]"
                        class="inline-flex items-center px-2.5 py-1.5 text-xs font-medium text-[#3857F1] hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        Modifica
                      </a>

                      @if (authService.isAdmin() && user.id !== authService.currentUser()?.id) {
                        <button
                          type="button"
                          (click)="deleteUser(user)"
                          class="inline-flex items-center px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          Elimina
                        </button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>
  `
})
export class UsersListComponent implements OnInit {
  private apiService = inject(ApiService);
  authService = inject(AuthService);
  private router = inject(Router);

  users = signal<User[]>([]);
  searchTerm = signal('');
  statusFilter = signal<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  loading = signal(true);

  pendingCount = computed(() => {
    return this.users().filter(u => (u.status || 'APPROVED') === 'PENDING').length;
  });

  ngOnInit(): void {
    // Se l'utente è un docente puro (non ADMIN né OFFICE), reindirizza direttamente al proprio profilo
    if (!this.authService.isAdmin() && !this.authService.isOffice()) {
      const currentId = this.authService.currentUser()?.id;
      if (currentId) {
        this.router.navigate(['/users', currentId]);
        return;
      }
    }

    this.loadUsers();
  }

  loadUsers(): void {
    this.loading.set(true);
    this.apiService.getUsers().subscribe({
      next: (data) => {
        this.users.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Errore nel caricamento utenti:', err);
        this.loading.set(false);
      }
    });
  }

  updateSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
  }

  setStatusFilter(filter: 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'): void {
    this.statusFilter.set(filter);
  }

  filteredUsers(): User[] {
    const term = this.searchTerm().toLowerCase().trim();
    const filter = this.statusFilter();

    return this.users().filter(u => {
      // Filtro stato
      const userStatus = u.status || 'APPROVED';
      if (filter !== 'ALL' && userStatus !== filter) {
        return false;
      }

      // Filtro ricerca testo
      if (!term) return true;
      return (
        (u.first_name?.toLowerCase().includes(term)) ||
        (u.last_name?.toLowerCase().includes(term)) ||
        (u.email.toLowerCase().includes(term)) ||
        (u.phone?.toLowerCase().includes(term))
      );
    });
  }

  changeStatus(user: User, newStatus: UserStatus): void {
    const label = newStatus === 'APPROVED' ? 'approvare' : 'rifiutare';
    if (!confirm(`Sei sicuro di voler ${label} l'accesso per ${user.email}?`)) {
      return;
    }

    this.apiService.updateUserStatus(user.id, newStatus).subscribe({
      next: (updated) => {
        this.users.update(list =>
          list.map(u => u.id === user.id ? { ...u, status: updated.status || newStatus } : u)
        );
      },
      error: (err) => {
        alert(err?.error?.error || 'Errore durante l\'aggiornamento dello stato.');
      }
    });
  }

  deleteUser(user: User): void {
    if (!confirm(`Sei sicuro di voler eliminare definitivamente l'utente ${user.email}?`)) {
      return;
    }

    this.apiService.deleteUser(user.id).subscribe({
      next: () => {
        this.users.update(list => list.filter(u => u.id !== user.id));
      },
      error: (err) => {
        alert(err?.error?.error || 'Errore durante l\'eliminazione dell\'utente.');
      }
    });
  }
}
