import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models';

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
          <p class="text-sm text-slate-500">Amministrazione degli account di sistema e autorizzazioni</p>
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

      <!-- Filtro ricerca rapido -->
      <div class="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 flex items-center gap-3">
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
                  <th class="py-3.5 px-4">Ruoli / Gruppi</th>
                  <th class="py-3.5 px-4 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 text-sm">
                @for (user of filteredUsers(); track user.id) {
                  <tr class="hover:bg-slate-50/60 transition-colors">
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
                    <td class="py-3.5 px-4 text-right space-x-2">
                      <a
                        [routerLink]="['/users', user.id]"
                        class="inline-flex items-center px-3 py-1.5 text-xs font-medium text-[#3857F1] hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        Modifica
                      </a>
                      @if (authService.isAdmin() && user.id !== authService.currentUser()?.id) {
                        <button
                          type="button"
                          (click)="deleteUser(user)"
                          class="inline-flex items-center px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
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
  loading = signal(true);

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

  filteredUsers(): User[] {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) return this.users();

    return this.users().filter(u =>
      (u.first_name?.toLowerCase().includes(term)) ||
      (u.last_name?.toLowerCase().includes(term)) ||
      (u.email.toLowerCase().includes(term)) ||
      (u.phone?.toLowerCase().includes(term))
    );
  }

  deleteUser(user: User): void {
    if (!confirm(`Sei sicuro di voler eliminare l'utente ${user.email}?`)) {
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
