import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AfterschoolPackagesTableComponent } from './components/afterschool-packages-table.component';

@Component({
  selector: 'app-afterschool-packages-page',
  standalone: true,
  imports: [CommonModule, AfterschoolPackagesTableComponent],
  template: `
    <div class="p-3 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-4 sm:space-y-6 pb-6 md:pb-0">
      <!-- Breadcrumb & Header Pagina -->
      <div class="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center space-x-2">
            <h1 class="text-xl sm:text-2xl font-bold text-slate-800">Tariffe & Pacchetti Doposcuola</h1>
            <span class="text-[10px] sm:text-xs bg-amber-500/10 text-amber-600 font-bold px-2 py-0.5 rounded-full border border-amber-500/20">ADMIN</span>
          </div>
          <p class="text-xs sm:text-sm text-slate-500 mt-1">
            Configurazione del catalogo pacchetti, giorni mensili inclusi e transizioni tariffarie a validità temporale
          </p>
        </div>
      </div>

      <!-- Tabella Gestione Pacchetti -->
      <app-afterschool-packages-table />
    </div>
  `
})
export class AfterschoolPackagesPageComponent {}
