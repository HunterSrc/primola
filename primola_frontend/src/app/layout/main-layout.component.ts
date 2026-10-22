import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="h-screen overflow-hidden bg-slate-50/70 flex flex-col md:flex-row">
      
      <!-- Top Bar Mobile (Visibile solo sotto i 768px) -->
      <header class="md:hidden bg-slate-900 text-white px-4 py-3 border-b border-slate-800 flex items-center justify-between z-30 shrink-0 pt-safe">
        <div class="flex items-center space-x-2.5">
          <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-md shadow-emerald-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <span class="font-bold text-base tracking-tight font-['Outfit']">Primola</span>
          <span class="text-[9px] bg-emerald-500/20 text-emerald-400 font-bold px-1.5 py-0.5 rounded border border-emerald-500/30">v2.0</span>
        </div>

        <div class="flex items-center space-x-2">
          <div class="flex items-center space-x-2 bg-slate-800/80 px-2.5 py-1 rounded-xl border border-slate-700/60">
            <div class="w-6 h-6 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-xs text-white">
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
          <!-- Header Logo & Brand -->
          <div class="p-6 border-b border-slate-800/60 flex items-center space-x-3.5">
            <div class="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 via-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-400/20">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <div class="flex items-center space-x-1.5">
                <h1 class="text-xl font-extrabold tracking-tight text-white font-['Outfit']">Primola</h1>
                <span class="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-1.5 py-0.5 rounded border border-emerald-500/30">v2.0</span>
              </div>
              <p class="text-xs text-slate-400 font-medium">Gestione Presenze & Mensa</p>
            </div>
          </div>

          <!-- Section Label -->
          <div class="px-6 pt-6 pb-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Menu Principale
          </div>

          <!-- Nav Items -->
          <nav class="px-4 space-y-1.5">
            <a
              routerLink="/dashboard"
              routerLinkActive="bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 font-semibold"
              [routerLinkActiveOptions]="{ exact: true }"
              class="flex items-center space-x-3.5 px-4 py-3 rounded-2xl text-slate-300 hover:bg-slate-800/80 hover:text-white transition-all group"
            >
              <div class="p-1.5 rounded-xl bg-slate-800/60 group-hover:bg-slate-700/60 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <span class="text-sm">Segna Presenze</span>
            </a>

            <a
              routerLink="/anagrafica"
              routerLinkActive="bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 font-semibold"
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
                routerLinkActive="bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 font-semibold"
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
              <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-700 to-slate-600 flex items-center justify-center font-bold text-white shadow-inner shrink-0">
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
          routerLinkActive="text-emerald-400 font-bold"
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
          routerLinkActive="text-emerald-400 font-bold"
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
