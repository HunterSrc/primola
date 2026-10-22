import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="h-screen h-[100dvh] overflow-hidden bg-slate-50/70 flex flex-col md:flex-row">
      
      <!-- Top Bar Mobile (Visibile solo sotto i 768px) -->
      <header class="md:hidden bg-slate-900 text-white px-4 pt-safe pb-3 border-b border-slate-800 flex items-center justify-between z-30 shrink-0 shadow-sm">
        <div class="flex items-center space-x-2.5 pt-1">
          <div class="h-8 px-2 py-1 bg-white rounded-lg flex items-center justify-center shadow-sm">
            <img src="assets/images/logo-primola-tight.png" alt="Primola" class="h-5 w-auto object-contain" />
          </div>
          <span class="text-[10px] bg-[#3857F1]/20 text-blue-300 font-bold px-1.5 py-0.5 rounded border border-[#3857F1]/30">Doposcuola</span>
        </div>

        <div class="flex items-center space-x-2 pt-1">
          <div class="flex items-center space-x-2 bg-slate-800/80 px-2.5 py-1 rounded-xl border border-slate-700/60">
            <div class="w-6 h-6 rounded-lg bg-[#3857F1] flex items-center justify-center font-bold text-xs text-white">
              {{ authService.currentUser()?.name?.charAt(0) ?? 'U' }}
            </div>
            <span class="text-xs font-semibold text-slate-200 max-w-[80px] truncate">{{ authService.currentUser()?.name }}</span>
          </div>

          <button
            (click)="authService.logout()"
            title="Esci"
            class="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition-colors active:scale-90"
            aria-label="Logout"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </header>

      <!-- Sidebar Desktop / Tablet (Nascosta su mobile standard) -->
      <aside class="hidden md:flex w-72 h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white flex-col justify-between shrink-0 shadow-2xl border-r border-slate-800/80 z-20 overflow-y-auto">
        <div>
          <!-- Header Logo & Brand Primola -->
          <div class="p-5 border-b border-slate-800/60">
            <div class="bg-white/95 rounded-2xl p-3 shadow-md border border-white/10 flex items-center justify-center mb-2.5">
              <img src="assets/images/logo-primola-tight.png" alt="Primola Logo" class="h-10 w-auto object-contain" />
            </div>
            <div class="flex items-center justify-between px-1">
              <span class="text-[11px] font-semibold text-slate-400">Doposcuola & Presenze</span>
              <span class="text-[9px] bg-[#3857F1]/20 text-blue-400 font-bold px-1.5 py-0.5 rounded border border-[#3857F1]/30">v2.0</span>
            </div>
          </div>

          <!-- Section Label -->
          <div class="px-6 pt-5 pb-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Menu Principale
          </div>

          <!-- Nav Items -->
          <nav class="px-4 space-y-1.5">
            <a
              routerLink="/dashboard"
              routerLinkActive="bg-[#3857F1] text-white shadow-lg shadow-blue-600/30 font-semibold"
              [routerLinkActiveOptions]="{ exact: true }"
              class="flex items-center space-x-3.5 px-4 py-3 rounded-2xl text-slate-300 hover:bg-slate-800/80 hover:text-white transition-all group"
            >
              <div class="p-1.5 rounded-xl bg-slate-800/60 group-hover:bg-slate-700/60 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <span class="text-sm">Segna Presenze</span>
            </a>

            <a
              routerLink="/anagrafica"
              routerLinkActive="bg-[#3857F1] text-white shadow-lg shadow-blue-600/30 font-semibold"
              class="flex items-center space-x-3.5 px-4 py-3 rounded-2xl text-slate-300 hover:bg-slate-800/80 hover:text-white transition-all group"
            >
              <div class="p-1.5 rounded-xl bg-slate-800/60 group-hover:bg-slate-700/60 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-teal-400 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <span class="text-sm">Anagrafica Studenti</span>
            </a>

            @if (authService.isAdmin()) {
              <div class="pt-4 pb-2 px-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Amministrazione
              </div>

              <a
                routerLink="/admin/dashboard"
                routerLinkActive="bg-[#3857F1] text-white shadow-lg shadow-blue-600/30 font-semibold"
                class="flex items-center space-x-3.5 px-4 py-3 rounded-2xl text-slate-300 hover:bg-slate-800/80 hover:text-white transition-all group"
              >
                <div class="p-1.5 rounded-xl bg-slate-800/60 group-hover:bg-slate-700/60 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div class="flex items-center justify-between flex-1">
                  <span class="text-sm">Report & Admin</span>
                  <span class="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/30">ADMIN</span>
                </div>
              </a>
            }
          </nav>
        </div>

        <!-- Profilo Utente & Logout Footer -->
        <div class="p-4 m-3 rounded-2xl border border-slate-800/90 bg-slate-950/60 backdrop-blur-md">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3 overflow-hidden">
              <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#3857F1] to-[#2640C4] flex items-center justify-center font-bold text-white shadow-inner shrink-0">
                {{ authService.currentUser()?.name?.charAt(0) ?? 'U' }}
              </div>
              <div class="truncate">
                <p class="text-sm font-bold text-white truncate">{{ authService.currentUser()?.name }}</p>
                <div class="flex items-center space-x-1.5">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <p class="text-[11px] text-slate-400 font-medium capitalize">{{ authService.role() }}</p>
                </div>
              </div>
            </div>
            <button
              (click)="authService.logout()"
              title="Esci dall'applicazione"
              class="p-2.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 rounded-xl transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      <!-- Main Content Area -->
      <main class="flex-1 overflow-y-auto pb-mobile-nav md:pb-6">
        <router-outlet />
      </main>

      <!-- Mobile Bottom Navigation Bar (Fissa in basso per smartphone) -->
      <nav class="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800/90 px-3 py-2 z-40 pb-safe flex items-center justify-around">
        <!-- Tab Presenze -->
        <a
          routerLink="/dashboard"
          routerLinkActive="text-blue-400 font-bold"
          [routerLinkActiveOptions]="{ exact: true }"
          class="flex flex-col items-center justify-center py-1 px-3 text-slate-400 hover:text-slate-200 transition-colors min-w-[64px]"
        >
          <div class="p-1 rounded-xl">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <span class="text-[10px] mt-0.5">Presenze</span>
        </a>

        <!-- Tab Anagrafica -->
        <a
          routerLink="/anagrafica"
          routerLinkActive="text-blue-400 font-bold"
          class="flex flex-col items-center justify-center py-1 px-3 text-slate-400 hover:text-slate-200 transition-colors min-w-[64px]"
        >
          <div class="p-1 rounded-xl">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <span class="text-[10px] mt-0.5">Anagrafica</span>
        </a>

        <!-- Tab Admin / Report (se Admin) -->
        @if (authService.isAdmin()) {
          <a
            routerLink="/admin/dashboard"
            routerLinkActive="text-amber-400 font-bold"
            class="flex flex-col items-center justify-center py-1 px-3 text-slate-400 hover:text-slate-200 transition-colors min-w-[64px]"
          >
            <div class="p-1 rounded-xl relative">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span class="absolute top-0 right-0 w-2 h-2 rounded-full bg-amber-400"></span>
            </div>
            <span class="text-[10px] mt-0.5">Report</span>
          </a>
        }
      </nav>

    </div>
  `
})
export class MainLayoutComponent {
  readonly authService = inject(AuthService);
}
