import { Component, inject, signal } from '@angular/core';
import { Router, NavigationEnd, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { AuthService } from '../core/services/auth.service';

export type AccordionSection = 'doposcuola' | 'corsi' | 'admin' | null;

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="h-screen h-[100dvh] overflow-hidden bg-slate-50/70 flex flex-col md:flex-row relative">
      
      <!-- Top Bar Mobile (Visibile solo sotto i 768px) -->
      <header class="md:hidden bg-slate-900 text-white px-3.5 pt-safe pb-3 border-b border-slate-800 flex items-center justify-between z-30 shrink-0 shadow-sm">
        
        <!-- Hamburger Menu Button + Logo -->
        <div class="flex items-center space-x-2.5 pt-1">
          <button
            type="button"
            (click)="toggleMobileMenu()"
            class="p-2 -ml-1 text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-xl transition-colors active:scale-90"
            aria-label="Apri menu di navigazione"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div class="h-8 px-2 py-1 bg-white rounded-lg flex items-center justify-center shadow-sm">
            <img src="assets/images/logo-primola-tight.png" alt="Primola" class="h-5 w-auto object-contain" />
          </div>
          <span class="text-[10px] bg-[#3857F1]/20 text-blue-300 font-bold px-1.5 py-0.5 rounded border border-[#3857F1]/30">Doposcuola</span>
        </div>

        <!-- Solo Icona Logout sulla destra in Top Bar Mobile -->
        <div class="flex items-center pt-1">
          <button
            type="button"
            (click)="authService.logout()"
            title="Esci dall'applicazione"
            class="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 rounded-xl transition-colors active:scale-90 flex items-center space-x-1"
            aria-label="Logout"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </header>

      <!-- Backdrop per Mobile Sidebar Drawer (visibile solo quando il menu è aperto) -->
      @if (mobileMenuOpen()) {
        <div
          (click)="closeMobileMenu()"
          class="md:hidden fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-40 animate-fade-in transition-opacity"
        ></div>
      }

      <!-- Sidebar Unificata: Desktop collassabile a sinistra / Mobile Drawer off-canvas -->
      <aside
        class="fixed md:static inset-y-0 left-0 w-72 h-full md:h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white flex flex-col justify-between shrink-0 shadow-2xl border-r border-slate-800/80 z-50 overflow-y-auto transition-all duration-300 ease-in-out"
        [class.-translate-x-full]="!mobileMenuOpen()"
        [class.translate-x-0]="mobileMenuOpen()"
        [class.md:translate-x-0]="!desktopSidebarCollapsed()"
        [class.md:w-72]="!desktopSidebarCollapsed()"
        [class.md:w-0]="desktopSidebarCollapsed()"
        [class.md:overflow-hidden]="desktopSidebarCollapsed()"
        [class.md:border-r-0]="desktopSidebarCollapsed()"
        [class.md:opacity-0]="desktopSidebarCollapsed()"
        [class.md:pointer-events-none]="desktopSidebarCollapsed()"
      >
        <div>
          <!-- Header Logo & Brand Primola -->
          <div class="p-5 border-b border-slate-800/60 pt-safe flex flex-col">
            <div class="flex items-center justify-between mb-3 md:hidden">
              <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Navigazione</span>
              <button
                type="button"
                (click)="closeMobileMenu()"
                class="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
                aria-label="Chiudi menu"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div class="hidden md:flex items-center justify-between mb-2.5">
              <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Navigazione</span>
              <button
                type="button"
                (click)="toggleDesktopSidebar()"
                title="Comprimi barra laterale"
                aria-label="Comprimi barra laterale"
                class="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>
            </div>

            <div class="bg-white/95 rounded-2xl p-3 shadow-md border border-white/10 flex items-center justify-center mb-2.5">
              <img src="assets/images/logo-primola-tight.png" alt="Primola Logo" class="h-10 w-auto object-contain" />
            </div>
            <div class="flex items-center justify-between px-1">
              <span class="text-[11px] font-semibold text-slate-400">Doposcuola & Presenze</span>
              <span class="text-[9px] bg-[#3857F1]/20 text-blue-400 font-bold px-1.5 py-0.5 rounded border border-[#3857F1]/30">v3.1.0</span>
            </div>
          </div>

          <!-- Nav Items: Accordion Sections as Elevated Boxes -->
          <nav class="px-3.5 py-4 space-y-3">
            
            <!-- Box 1: Doposcuola -->
            <div
              class="rounded-2xl border transition-all duration-300 overflow-hidden shadow-md"
              [class.bg-slate-900/80]="openSection() !== 'doposcuola'"
              [class.border-slate-800/80]="openSection() !== 'doposcuola'"
              [class.shadow-black/20]="openSection() !== 'doposcuola'"
              [class.bg-slate-900/95]="openSection() === 'doposcuola'"
              [class.border-amber-500/40]="openSection() === 'doposcuola'"
              [class.shadow-lg]="openSection() === 'doposcuola'"
              [class.shadow-amber-500/5]="openSection() === 'doposcuola'"
            >
              <!-- Accordion Header -->
              <button
                type="button"
                (click)="toggleSection('doposcuola')"
                class="w-full px-3.5 py-3 flex items-center justify-between text-left transition-colors group cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-400"
                [attr.aria-expanded]="openSection() === 'doposcuola'"
              >
                <div class="flex items-center space-x-2.5 min-w-0">
                  <div class="p-1.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:bg-amber-500/20 transition-colors shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <div class="flex items-center space-x-2 truncate">
                    <span class="text-xs font-bold uppercase tracking-wider text-amber-400/90 group-hover:text-amber-300 transition-colors">Doposcuola</span>
                    @if (openSection() !== 'doposcuola' && isSectionActive('doposcuola')) {
                      <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" title="Sezione attiva"></span>
                    }
                  </div>
                </div>

                <div
                  class="text-slate-400 group-hover:text-slate-200 transition-transform duration-300"
                  [class.rotate-180]="openSection() === 'doposcuola'"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              <!-- Animated Content -->
              <div
                class="grid transition-[grid-template-rows] duration-300 ease-in-out"
                [class.grid-rows-[1fr]]="openSection() === 'doposcuola'"
                [class.grid-rows-[0fr]]="openSection() !== 'doposcuola'"
              >
                <div class="overflow-hidden">
                  <div class="px-2 pt-1 pb-2 space-y-1 border-t border-slate-800/50">
                    <a
                      routerLink="/dashboard"
                      (click)="closeMobileMenu()"
                      routerLinkActive="bg-[#3857F1] text-white shadow-lg shadow-blue-600/30 font-semibold"
                      [routerLinkActiveOptions]="{ exact: true }"
                      class="flex items-center space-x-3 px-3 py-2 rounded-xl text-slate-300 hover:bg-slate-800/80 hover:text-white transition-all group/item"
                    >
                      <div class="p-1.5 rounded-lg bg-slate-800/60 group-hover/item:bg-slate-700/60 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-blue-400 group-hover/item:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                      </div>
                      <span class="text-sm">Segna Presenze</span>
                    </a>

                    <a
                      routerLink="/afterschool-calendar"
                      (click)="closeMobileMenu()"
                      routerLinkActive="bg-[#3857F1] text-white shadow-lg shadow-blue-600/30 font-semibold"
                      class="flex items-center space-x-3 px-3 py-2 rounded-xl text-slate-300 hover:bg-slate-800/80 hover:text-white transition-all group/item"
                    >
                      <div class="p-1.5 rounded-lg bg-slate-800/60 group-hover/item:bg-slate-700/60 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-amber-400 group-hover/item:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <span class="text-sm">Calendario Doposcuola</span>
                    </a>

                    @if (authService.canManageStudents()) {
                      <a
                        routerLink="/anagrafica"
                        (click)="closeMobileMenu()"
                        routerLinkActive="bg-[#3857F1] text-white shadow-lg shadow-blue-600/30 font-semibold"
                        class="flex items-center space-x-3 px-3 py-2 rounded-xl text-slate-300 hover:bg-slate-800/80 hover:text-white transition-all group/item"
                      >
                        <div class="p-1.5 rounded-lg bg-slate-800/60 group-hover/item:bg-slate-700/60 transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-teal-400 group-hover/item:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                        </div>
                        <span class="text-sm">Anagrafica Studenti</span>
                      </a>
                    }

                    @if (authService.canManageUsers()) {
                      <a
                        routerLink="/payments"
                        (click)="closeMobileMenu()"
                        routerLinkActive="bg-[#3857F1] text-white shadow-lg shadow-blue-600/30 font-semibold"
                        class="flex items-center space-x-3 px-3 py-2 rounded-xl text-slate-300 hover:bg-slate-800/80 hover:text-white transition-all group/item"
                      >
                        <div class="p-1.5 rounded-lg bg-slate-800/60 group-hover/item:bg-slate-700/60 transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-emerald-400 group-hover/item:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <span class="text-sm">Gestione Pagamenti Doposcuola</span>
                      </a>

                      <a
                        routerLink="/afterschool"
                        (click)="closeMobileMenu()"
                        routerLinkActive="bg-[#3857F1] text-white shadow-lg shadow-blue-600/30 font-semibold"
                        class="flex items-center space-x-3 px-3 py-2 rounded-xl text-slate-300 hover:bg-slate-800/80 hover:text-white transition-all group/item"
                      >
                        <div class="p-1.5 rounded-lg bg-slate-800/60 group-hover/item:bg-slate-700/60 transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-yellow-400 group-hover/item:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                        </div>
                        <span class="text-sm">Tariffe Docenti Doposcuola</span>
                      </a>
                    }
                  </div>
                </div>
              </div>
            </div>

            <!-- Box 2: Corsi & Attività -->
            @if (authService.canManageUsers()) {
              <div
                class="rounded-2xl border transition-all duration-300 overflow-hidden shadow-md"
                [class.bg-slate-900/80]="openSection() !== 'corsi'"
                [class.border-slate-800/80]="openSection() !== 'corsi'"
                [class.shadow-black/20]="openSection() !== 'corsi'"
                [class.bg-slate-900/95]="openSection() === 'corsi'"
                [class.border-blue-500/40]="openSection() === 'corsi'"
                [class.shadow-lg]="openSection() === 'corsi'"
                [class.shadow-blue-500/5]="openSection() === 'corsi'"
              >
                <!-- Accordion Header -->
                <button
                  type="button"
                  (click)="toggleSection('corsi')"
                  class="w-full px-3.5 py-3 flex items-center justify-between text-left transition-colors group cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-400"
                  [attr.aria-expanded]="openSection() === 'corsi'"
                >
                  <div class="flex items-center space-x-2.5 min-w-0">
                    <div class="p-1.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 group-hover:bg-blue-500/20 transition-colors shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <div class="flex items-center space-x-2 truncate">
                      <span class="text-xs font-bold uppercase tracking-wider text-blue-400/90 group-hover:text-blue-300 transition-colors">Corsi & Attività</span>
                      @if (openSection() !== 'corsi' && isSectionActive('corsi')) {
                        <span class="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" title="Sezione attiva"></span>
                      }
                    </div>
                  </div>

                  <div
                    class="text-slate-400 group-hover:text-slate-200 transition-transform duration-300"
                    [class.rotate-180]="openSection() === 'corsi'"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                <!-- Animated Content -->
                <div
                  class="grid transition-[grid-template-rows] duration-300 ease-in-out"
                  [class.grid-rows-[1fr]]="openSection() === 'corsi'"
                  [class.grid-rows-[0fr]]="openSection() !== 'corsi'"
                >
                  <div class="overflow-hidden">
                    <div class="px-2 pt-1 pb-2 space-y-1 border-t border-slate-800/50">
                      <a
                        routerLink="/projects"
                        (click)="closeMobileMenu()"
                        routerLinkActive="bg-[#3857F1] text-white shadow-lg shadow-blue-600/30 font-semibold"
                        class="flex items-center space-x-3 px-3 py-2 rounded-xl text-slate-300 hover:bg-slate-800/80 hover:text-white transition-all group/item"
                      >
                        <div class="p-1.5 rounded-lg bg-slate-800/60 group-hover/item:bg-slate-700/60 transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-amber-400 group-hover/item:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                        </div>
                        <span class="text-sm">Elenco Corsi</span>
                      </a>

                      <a
                        routerLink="/course-students"
                        (click)="closeMobileMenu()"
                        routerLinkActive="bg-[#3857F1] text-white shadow-lg shadow-blue-600/30 font-semibold"
                        class="flex items-center space-x-3 px-3 py-2 rounded-xl text-slate-300 hover:bg-slate-800/80 hover:text-white transition-all group/item"
                      >
                        <div class="p-1.5 rounded-lg bg-slate-800/60 group-hover/item:bg-slate-700/60 transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-cyan-400 group-hover/item:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                        </div>
                        <span class="text-sm">Studenti Corsi</span>
                      </a>

                      <a
                        routerLink="/course-payments"
                        (click)="closeMobileMenu()"
                        routerLinkActive="bg-[#3857F1] text-white shadow-lg shadow-blue-600/30 font-semibold"
                        class="flex items-center space-x-3 px-3 py-2 rounded-xl text-slate-300 hover:bg-slate-800/80 hover:text-white transition-all group/item"
                      >
                        <div class="p-1.5 rounded-lg bg-slate-800/60 group-hover/item:bg-slate-700/60 transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-emerald-400 group-hover/item:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                        <span class="text-sm">Pagamenti Corsi</span>
                      </a>

                      <a
                        routerLink="/reports"
                        (click)="closeMobileMenu()"
                        routerLinkActive="bg-[#3857F1] text-white shadow-lg shadow-blue-600/30 font-semibold"
                        class="flex items-center space-x-3 px-3 py-2 rounded-xl text-slate-300 hover:bg-slate-800/80 hover:text-white transition-all group/item"
                      >
                        <div class="p-1.5 rounded-lg bg-slate-800/60 group-hover/item:bg-slate-700/60 transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-emerald-400 group-hover/item:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <span class="text-sm">Rendicontazione Operativa</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            }

            <!-- Box 3: Amministrazione & Utenti / Account -->
            <div
              class="rounded-2xl border transition-all duration-300 overflow-hidden shadow-md"
              [class.bg-slate-900/80]="openSection() !== 'admin'"
              [class.border-slate-800/80]="openSection() !== 'admin'"
              [class.shadow-black/20]="openSection() !== 'admin'"
              [class.bg-slate-900/95]="openSection() === 'admin'"
              [class.border-indigo-500/40]="openSection() === 'admin'"
              [class.shadow-lg]="openSection() === 'admin'"
              [class.shadow-indigo-500/5]="openSection() === 'admin'"
            >
              <!-- Accordion Header -->
              <button
                type="button"
                (click)="toggleSection('admin')"
                class="w-full px-3.5 py-3 flex items-center justify-between text-left transition-colors group cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400"
                [attr.aria-expanded]="openSection() === 'admin'"
              >
                <div class="flex items-center space-x-2.5 min-w-0">
                  <div class="p-1.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 group-hover:bg-indigo-500/20 transition-colors shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div class="flex items-center space-x-2 truncate">
                    <span class="text-xs font-bold uppercase tracking-wider text-slate-300 group-hover:text-white transition-colors">
                      {{ authService.canManageUsers() ? 'Amministrazione & Utenti' : 'Account' }}
                    </span>
                    @if (openSection() !== 'admin' && isSectionActive('admin')) {
                      <span class="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" title="Sezione attiva"></span>
                    }
                  </div>
                </div>

                <div
                  class="text-slate-400 group-hover:text-slate-200 transition-transform duration-300"
                  [class.rotate-180]="openSection() === 'admin'"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              <!-- Animated Content -->
              <div
                class="grid transition-[grid-template-rows] duration-300 ease-in-out"
                [class.grid-rows-[1fr]]="openSection() === 'admin'"
                [class.grid-rows-[0fr]]="openSection() !== 'admin'"
              >
                <div class="overflow-hidden">
                  <div class="px-2 pt-1 pb-2 space-y-1 border-t border-slate-800/50">
                    <a
                      routerLink="/users"
                      (click)="closeMobileMenu()"
                      routerLinkActive="bg-[#3857F1] text-white shadow-lg shadow-blue-600/30 font-semibold"
                      class="flex items-center space-x-3 px-3 py-2 rounded-xl text-slate-300 hover:bg-slate-800/80 hover:text-white transition-all group/item"
                    >
                      <div class="p-1.5 rounded-lg bg-slate-800/60 group-hover/item:bg-slate-700/60 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-indigo-400 group-hover/item:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <span class="text-sm">{{ authService.canManageUsers() ? 'Gestione Utenti' : 'Il Mio Profilo' }}</span>
                    </a>

                    @if (authService.canManageUsers()) {
                      <a
                        routerLink="/afterschool-expenses"
                        (click)="closeMobileMenu()"
                        routerLinkActive="bg-[#3857F1] text-white shadow-lg shadow-blue-600/30 font-semibold"
                        class="flex items-center space-x-3 px-3 py-2 rounded-xl text-slate-300 hover:bg-slate-800/80 hover:text-white transition-all group/item"
                      >
                        <div class="p-1.5 rounded-lg bg-slate-800/60 group-hover/item:bg-slate-700/60 transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-rose-400 group-hover/item:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                          </svg>
                        </div>
                        <span class="text-sm">Gestione Mensa & Spese</span>
                      </a>
                    }

                    @if (authService.isAdmin()) {
                      <a
                        routerLink="/admin/afterschool-packages"
                        (click)="closeMobileMenu()"
                        routerLinkActive="bg-[#3857F1] text-white shadow-lg shadow-blue-600/30 font-semibold"
                        class="flex items-center space-x-3 px-3 py-2 rounded-xl text-slate-300 hover:bg-slate-800/80 hover:text-white transition-all group/item"
                      >
                        <div class="p-1.5 rounded-lg bg-slate-800/60 group-hover/item:bg-slate-700/60 transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-amber-400 group-hover/item:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        </div>
                        <div class="flex items-center justify-between flex-1">
                          <span class="text-sm">Tariffe Doposcuola</span>
                          <span class="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/30">ADMIN</span>
                        </div>
                      </a>

                      <a
                        routerLink="/admin/dashboard"
                        (click)="closeMobileMenu()"
                        routerLinkActive="bg-[#3857F1] text-white shadow-lg shadow-blue-600/30 font-semibold"
                        class="flex items-center space-x-3 px-3 py-2 rounded-xl text-slate-300 hover:bg-slate-800/80 hover:text-white transition-all group/item"
                      >
                        <div class="p-1.5 rounded-lg bg-slate-800/60 group-hover/item:bg-slate-700/60 transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-amber-400 group-hover/item:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        </div>
                        <div class="flex items-center justify-between flex-1">
                          <span class="text-sm">Riepiloghi & Bilancio Admin</span>
                          <span class="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/30">ADMIN</span>
                        </div>
                      </a>
                    }
                  </div>
                </div>
              </div>
            </div>

          </nav>
        </div>

        <!-- Profilo Utente & Logout Footer (Sempre presente nella sidebar sia Desktop che Mobile) -->
        <div class="p-4 m-3 rounded-2xl border border-slate-800/90 bg-slate-950/60 backdrop-blur-md pb-safe">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3 overflow-hidden">
              <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#3857F1] to-blue-600 flex items-center justify-center font-bold text-white shadow-inner shrink-0">
                {{ authService.currentUser()?.name?.charAt(0) ?? 'U' }}
              </div>
              <div class="truncate">
                <p class="text-sm font-bold text-white truncate">{{ authService.currentUser()?.name }}</p>
                <div class="flex items-center space-x-1.5">
                  <span class="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
                  <p class="text-[11px] text-slate-400 font-medium capitalize">{{ authService.role() }}</p>
                </div>
              </div>
            </div>
            <button
              (click)="authService.logout()"
              title="Esci dall'applicazione"
              class="p-2.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 rounded-xl transition-all"
              aria-label="Logout"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      <!-- Main Content Area: Senza interferenza di barre fisse in basso -->
      <main class="flex-1 overflow-y-auto pb-safe md:pb-6 min-w-0">
        @if (desktopSidebarCollapsed()) {
          <div class="hidden md:flex items-center px-4 pt-3 -mb-2">
            <button
              type="button"
              (click)="toggleDesktopSidebar()"
              title="Espandi barra laterale"
              aria-label="Espandi barra laterale"
              class="inline-flex items-center space-x-2 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-sm transition-all cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
              <span>Mostra Menu</span>
            </button>
          </div>
        }
        <router-outlet />
      </main>

    </div>
  `
})
export class MainLayoutComponent {
  readonly authService = inject(AuthService);
  readonly router = inject(Router, { optional: true });
  readonly mobileMenuOpen = signal<boolean>(false);
  readonly desktopSidebarCollapsed = signal<boolean>(this.readInitialSidebarState());
  readonly openSection = signal<AccordionSection>('doposcuola');

  private readInitialSidebarState(): boolean {
    try {
      return typeof localStorage !== 'undefined' && localStorage.getItem('primola_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  }

  toggleDesktopSidebar(): void {
    this.desktopSidebarCollapsed.update(v => {
      const next = !v;
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('primola_sidebar_collapsed', String(next));
        }
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  }

  constructor() {
    if (this.router) {
      this.syncSectionWithUrl(this.router.url);

      this.router.events.pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed()
      ).subscribe(e => {
        this.syncSectionWithUrl(e.urlAfterRedirects || e.url);
      });
    }
  }

  syncSectionWithUrl(url: string | undefined): void {
    if (!url) return;
    const detected = this.detectSectionFromUrl(url);
    if (detected) {
      this.openSection.set(detected);
    }
  }

  detectSectionFromUrl(url: string): AccordionSection {
    if (
      url.includes('/projects') ||
      url.includes('/course-students') ||
      url.includes('/course-payments') ||
      url.includes('/reports')
    ) {
      return 'corsi';
    }
    if (url.includes('/users') || url.includes('/admin') || url.includes('/afterschool-expenses')) {
      return 'admin';
    }
    if (url.includes('/dashboard') || url.includes('/afterschool-calendar') || url.includes('/payments') || url.includes('/anagrafica') || url.includes('/afterschool')) {
      return 'doposcuola';
    }
    return 'doposcuola';
  }

  isSectionActive(section: AccordionSection): boolean {
    const url = this.router?.url || '';
    return this.detectSectionFromUrl(url) === section;
  }

  toggleSection(section: AccordionSection): void {
    this.openSection.update(current => (current === section ? null : section));
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update(v => !v);
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }
}
