import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-[#1e2a5e] flex items-center justify-center p-4">
      <div class="max-w-md w-full bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl p-8 border border-white/20">
        
        <!-- Logo Primola Ufficiale & Titolo -->
        <div class="text-center mb-8 flex flex-col items-center">
          <div class="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 mb-3 flex items-center justify-center">
            <img 
              src="assets/images/logo-primola-tight.png" 
              alt="Logo Primola" 
              class="h-14 w-auto object-contain"
            />
          </div>
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#3857F1]/10 text-[#3857F1] border border-[#3857F1]/20 mt-1">
            Doposcuola & Presenze
          </span>
          <p class="text-slate-500 text-xs mt-2">Accesso sicuro al Gestionale</p>
        </div>

        <!-- Messaggio di errore -->
        @if (errorMessage()) {
          <div class="mb-5 p-3.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 flex-shrink-0 text-red-500" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
            <span>{{ errorMessage() }}</span>
          </div>
        }

        <!-- Form di Autenticazione -->
        <form (ngSubmit)="onSubmit()" class="space-y-4">
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">Email</label>
            <div class="relative">
              <input
                type="email"
                [(ngModel)]="email"
                name="email"
                required
                placeholder="admin@primola.it"
                class="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#3857F1] focus:border-transparent transition text-sm"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">Password</label>
            <div class="relative">
              <input
                type="password"
                [(ngModel)]="password"
                name="password"
                required
                placeholder="••••••••••••"
                class="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#3857F1] focus:border-transparent transition text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            [disabled]="isLoading() || !email || !password"
            class="w-full mt-2 py-3.5 px-6 bg-gradient-to-r from-[#3857F1] to-[#2640C4] hover:from-[#2e4be0] hover:to-[#1d33a6] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-lg shadow-blue-600/25 flex items-center justify-center space-x-2 transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            @if (isLoading()) {
              <svg class="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
              <span>Accesso in corso...</span>
            } @else {
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              <span>Accedi al Portale</span>
            }
          </button>
        </form>

        <!-- Dev / Test Quick Fill -->
        <div class="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            (click)="prefillAdmin()"
            class="text-xs text-[#3857F1] hover:text-blue-700 font-medium hover:underline flex items-center space-x-1"
          >
            <span>⚡ Precompila credenziali Admin</span>
          </button>
          <span class="text-xs text-slate-400">JWT 60m • Auto-refresh</span>
        </div>

      </div>
    </div>
  `
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  email = 'admin@primola.it';
  password = 'AdminPrimola2026!';
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  prefillAdmin() {
    this.email = 'admin@primola.it';
    this.password = 'AdminPrimola2026!';
    this.errorMessage.set(null);
  }

  onSubmit() {
    if (!this.email || !this.password) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.authService.loginWithCredentials({
      email: this.email,
      password: this.password
    }).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.success) {
          this.router.navigate(['/dashboard']);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.error || 'Errore durante il login. Verifica le credenziali.');
      }
    });
  }
}
