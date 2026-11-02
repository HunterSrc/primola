import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { AfterschoolPackage, AfterschoolTariff } from '../../../core/models';
import { AppDatePipe } from '../../../shared/pipes/app-date.pipe';

@Component({
  selector: 'app-afterschool-packages-table',
  standalone: true,
  imports: [CommonModule, FormsModule, AppDatePipe],
  template: `
    <div class="space-y-6">
      <!-- Intestazione e Azioni -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h2 class="text-lg sm:text-xl font-bold text-slate-800 flex items-center gap-2">
            <span>📦</span>
            <span>Catalogo Pacchetti & Tariffe Doposcuola</span>
          </h2>
          <p class="text-xs sm:text-sm text-slate-500 mt-1">
            Gestisci i pacchetti disponibili, i giorni mensili inclusi e le tariffe storicizzate a validità temporale.
          </p>
        </div>

        <button
          (click)="openNewPackageModal()"
          class="inline-flex items-center justify-center px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-xl shadow-sm transition-all cursor-pointer whitespace-nowrap"
        >
          <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          Nuovo Pacchetto
        </button>
      </div>

      <!-- Feedback alert -->
      <div *ngIf="alertMessage()" class="p-4 rounded-xl border text-sm flex items-center justify-between transition-all"
           [ngClass]="alertType() === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'">
        <span>{{ alertMessage() }}</span>
        <button (click)="alertMessage.set(null)" class="text-slate-400 hover:text-slate-600 font-bold ml-4">✕</button>
      </div>

      <!-- Tabella Principale Pacchetti -->
      <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm text-slate-600">
            <thead class="bg-slate-50/75 border-b border-slate-200 text-xs font-semibold uppercase text-slate-500 tracking-wider">
              <tr>
                <th class="px-4 py-3.5">Nome Pacchetto</th>
                <th class="px-4 py-3.5 text-center">Giorni / Mese</th>
                <th class="px-4 py-3.5 text-center">Tariffa Attuale</th>
                <th class="px-4 py-3.5 text-center">Validità Inizio</th>
                <th class="px-4 py-3.5 text-center">Validità Fine</th>
                <th class="px-4 py-3.5 text-center">Stato</th>
                <th class="px-4 py-3.5 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr *ngIf="isLoading()" class="bg-slate-50/50">
                <td colspan="7" class="px-4 py-10 text-center text-slate-400">
                  <div class="inline-block animate-spin rounded-full h-6 w-6 border-2 border-emerald-600 border-t-transparent mr-2 align-middle"></div>
                  Caricamento pacchetti...
                </td>
              </tr>

              <tr *ngIf="!isLoading() && packages().length === 0">
                <td colspan="7" class="px-4 py-10 text-center text-slate-400">
                  Nessun pacchetto configurato. Crea il primo pacchetto cliccando su "Nuovo Pacchetto".
                </td>
              </tr>

              <tr *ngFor="let pkg of packages()" class="hover:bg-slate-50/80 transition-colors">
                <!-- Nome Pacchetto -->
                <td class="px-4 py-3.5 font-medium text-slate-900">
                  <div *ngIf="editingPackageId() !== pkg.id">
                    <span class="font-semibold text-slate-800">{{ pkg.name }}</span>
                    <span *ngIf="pkg.code" class="ml-2 text-xs font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                      {{ pkg.code }}
                    </span>
                  </div>
                  <div *ngIf="editingPackageId() === pkg.id" class="space-y-1">
                    <input
                      type="text"
                      [(ngModel)]="editFormData.name"
                      class="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 w-full focus:ring-1 focus:ring-emerald-500"
                      placeholder="Nome pacchetto"
                    />
                  </div>
                </td>

                <!-- Giorni Mensili -->
                <td class="px-4 py-3.5 text-center">
                  <div *ngIf="editingPackageId() !== pkg.id">
                    <span class="inline-flex items-center justify-center font-bold text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                      {{ pkg.monthly_days }} gg
                    </span>
                  </div>
                  <div *ngIf="editingPackageId() === pkg.id">
                    <input
                      type="number"
                      min="0"
                      [(ngModel)]="editFormData.monthly_days"
                      class="px-2 py-1 text-xs text-center rounded-lg border border-slate-300 w-20 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </td>

                <!-- Tariffa Attuale -->
                <td class="px-4 py-3.5 text-center font-bold text-emerald-700">
                  <span *ngIf="pkg.current_price !== undefined && pkg.current_price !== null">
                    {{ pkg.current_price | currency:'EUR':'symbol':'1.2-2' }}
                  </span>
                  <span *ngIf="pkg.current_price === undefined || pkg.current_price === null" class="text-slate-400 text-xs italic">
                    Nessuna tariffa
                  </span>
                </td>

                <!-- Validità Inizio -->
                <td class="px-4 py-3.5 text-center text-xs text-slate-600">
                  <span *ngIf="pkg.current_valid_from">{{ pkg.current_valid_from | appDate }}</span>
                  <span *ngIf="!pkg.current_valid_from" class="text-slate-400">-</span>
                </td>

                <!-- Validità Fine -->
                <td class="px-4 py-3.5 text-center text-xs">
                  <span *ngIf="pkg.current_valid_to && pkg.current_valid_to.includes('9999')" class="text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    In vigore
                  </span>
                  <span *ngIf="pkg.current_valid_to && !pkg.current_valid_to.includes('9999')" class="text-slate-600">
                    {{ pkg.current_valid_to | appDate }}
                  </span>
                  <span *ngIf="!pkg.current_valid_to" class="text-slate-400">-</span>
                </td>

                <!-- Stato -->
                <td class="px-4 py-3.5 text-center text-xs">
                  <button
                    (click)="togglePackageStatus(pkg)"
                    [title]="pkg.is_active ? 'Disattiva' : 'Attiva'"
                    class="cursor-pointer"
                  >
                    <span *ngIf="pkg.is_active" class="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-emerald-100 text-emerald-800">
                      Attivo
                    </span>
                    <span *ngIf="!pkg.is_active" class="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-slate-200 text-slate-600">
                      Inattivo
                    </span>
                  </button>
                </td>

                <!-- Azioni Riga -->
                <td class="px-4 py-3.5 text-right whitespace-nowrap space-x-1.5">
                  <!-- Modalità Edit Normale -->
                  <ng-container *ngIf="editingPackageId() !== pkg.id">
                    <button
                      (click)="startEditPackage(pkg)"
                      class="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                      title="Modifica pacchetto"
                    >
                      ✏️ Modifica
                    </button>

                    <button
                      (click)="openTransitionModal(pkg)"
                      class="px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 rounded-lg transition-colors cursor-pointer"
                      title="Rendi non valida la tariffa e attiva la nuova"
                    >
                      ⚡ Nuova Tariffa
                    </button>

                    <button
                      (click)="viewHistory(pkg)"
                      class="px-2 py-1 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="Visualizza storico tariffe"
                    >
                      🕒 Storico
                    </button>
                  </ng-container>

                  <!-- Modalità Salvataggio Inline -->
                  <ng-container *ngIf="editingPackageId() === pkg.id">
                    <button
                      (click)="savePackageEdit(pkg.id)"
                      class="px-2.5 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer"
                    >
                      Salva
                    </button>
                    <button
                      (click)="cancelPackageEdit()"
                      class="px-2 py-1 text-xs text-slate-600 hover:text-slate-800 bg-slate-200 hover:bg-slate-300 rounded-lg transition-colors cursor-pointer"
                    >
                      Annulla
                    </button>
                  </ng-container>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- MODALE TRANSIZIONE TARIFFA -->
      <div *ngIf="showTransitionModal()" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
        <div class="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg p-6 space-y-5">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 class="text-base font-bold text-slate-800">
              ⚡ Nuova Tariffa per: <span class="text-emerald-700">{{ selectedPackage()?.name }}</span>
            </h3>
            <button (click)="closeTransitionModal()" class="text-slate-400 hover:text-slate-600 font-bold text-lg">✕</button>
          </div>

          <div class="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200">
            La tariffa attualmente in vigore ({{ selectedPackage()?.current_price | currency:'EUR':'symbol':'1.2-2' }}) verrà conclusa alla data indicata.
            La nuova tariffa entrerà in vigore dalla data inizio scelta fino al <strong class="text-slate-700">01/01/9999</strong>.
          </div>

          <div class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">
                Data Fine Tariffa Corrente *
              </label>
              <input
                type="date"
                [(ngModel)]="transitionForm.oldTariffValidTo"
                class="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500"
              />
              <span class="text-[11px] text-slate-400">Ultimo giorno di validità della tariffa attuale</span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">
                  Nuovo Prezzo (€) *
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  [(ngModel)]="transitionForm.newPrice"
                  class="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500"
                  placeholder="es. 55.00"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">
                  Data Inizio Nuova Tariffa *
                </label>
                <input
                  type="date"
                  [(ngModel)]="transitionForm.newTariffValidFrom"
                  class="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">
                Data Fine Nuova Tariffa
              </label>
              <input
                type="text"
                disabled
                value="01/01/9999 (Massima di sistema)"
                class="w-full px-3 py-2 text-xs rounded-xl bg-slate-100 border border-slate-200 text-slate-500 font-mono"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">
                Note Opzionali
              </label>
              <textarea
                rows="2"
                [(ngModel)]="transitionForm.notes"
                class="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500"
                placeholder="es. Adeguamento tariffario anno 2026/2027"
              ></textarea>
            </div>
          </div>

          <div class="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              (click)="closeTransitionModal()"
              class="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Annulla
            </button>
            <button
              (click)="submitTransitionTariff()"
              [disabled]="isSubmitting()"
              class="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              {{ isSubmitting() ? 'Salvataggio...' : 'Conferma Nuova Tariffa' }}
            </button>
          </div>
        </div>
      </div>

      <!-- MODALE CREAZIONE NUOVO PACCHETTO -->
      <div *ngIf="showNewPackageModal()" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
        <div class="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg p-6 space-y-5">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 class="text-base font-bold text-slate-800">
              ➕ Crea Nuovo Pacchetto Doposcuola
            </h3>
            <button (click)="closeNewPackageModal()" class="text-slate-400 hover:text-slate-600 font-bold text-lg">✕</button>
          </div>

          <div class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">
                Nome Pacchetto *
              </label>
              <input
                type="text"
                [(ngModel)]="newPackageForm.name"
                class="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500"
                placeholder="es. 6 giorni a settimana / Pacchetto Personalizzato"
              />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">
                  Giorni Mensili Inclusi *
                </label>
                <input
                  type="number"
                  min="0"
                  [(ngModel)]="newPackageForm.monthly_days"
                  class="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500"
                  placeholder="es. 10"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">
                  Codice Univoco (opzionale)
                </label>
                <input
                  type="text"
                  [(ngModel)]="newPackageForm.code"
                  class="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500"
                  placeholder="es. CUSTOM_PKG"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">
                  Tariffa Iniziale (€) *
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  [(ngModel)]="newPackageForm.price"
                  class="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500"
                  placeholder="es. 75.00"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">
                  Valido Da *
                </label>
                <input
                  type="date"
                  [(ngModel)]="newPackageForm.valid_from"
                  class="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">
                Note Tariffa
              </label>
              <textarea
                rows="2"
                [(ngModel)]="newPackageForm.notes"
                class="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500"
                placeholder="Note descrittive..."
              ></textarea>
            </div>
          </div>

          <div class="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              (click)="closeNewPackageModal()"
              class="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Annulla
            </button>
            <button
              (click)="submitNewPackage()"
              [disabled]="isSubmitting()"
              class="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              {{ isSubmitting() ? 'Creazione...' : 'Crea Pacchetto' }}
            </button>
          </div>
        </div>
      </div>

      <!-- MODALE / DRAWER STORICO TARIFFE -->
      <div *ngIf="showHistoryModal()" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
        <div class="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl p-6 space-y-5">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 class="text-base font-bold text-slate-800">
                🕒 Storico Tariffe: <span class="text-emerald-700">{{ historyPackage()?.name }}</span>
              </h3>
              <p class="text-xs text-slate-500">Cronologia di tutte le tariffe e periodi di validità</p>
            </div>
            <button (click)="closeHistoryModal()" class="text-slate-400 hover:text-slate-600 font-bold text-lg">✕</button>
          </div>

          <div class="overflow-x-auto max-h-80 border border-slate-200 rounded-xl">
            <table class="w-full text-left text-xs text-slate-600">
              <thead class="bg-slate-50 border-b border-slate-200 font-semibold uppercase text-slate-500">
                <tr>
                  <th class="px-3 py-2.5">Prezzo</th>
                  <th class="px-3 py-2.5 text-center">Inizio Validità</th>
                  <th class="px-3 py-2.5 text-center">Fine Validità</th>
                  <th class="px-3 py-2.5">Note</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr *ngFor="let t of tariffHistory()" class="hover:bg-slate-50">
                  <td class="px-3 py-2.5 font-bold text-emerald-700">
                    {{ t.price | currency:'EUR':'symbol':'1.2-2' }}
                  </td>
                  <td class="px-3 py-2.5 text-center">{{ t.valid_from | appDate }}</td>
                  <td class="px-3 py-2.5 text-center">
                    <span *ngIf="t.valid_to && t.valid_to.includes('9999')" class="text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      In vigore (9999)
                    </span>
                    <span *ngIf="t.valid_to && !t.valid_to.includes('9999')">
                      {{ t.valid_to | appDate }}
                    </span>
                  </td>
                  <td class="px-3 py-2.5 text-slate-500">{{ t.notes || '-' }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="flex justify-end pt-3 border-t border-slate-100">
            <button
              (click)="closeHistoryModal()"
              class="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Chiudi
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class AfterschoolPackagesTableComponent implements OnInit {
  private api = inject(ApiService);

  packages = signal<AfterschoolPackage[]>([]);
  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  alertMessage = signal<string | null>(null);
  alertType = signal<'success' | 'error'>('success');

  // Inline editing
  editingPackageId = signal<string | null>(null);
  editFormData: { name: string; monthly_days: number } = { name: '', monthly_days: 4 };

  // Modale Transizione
  showTransitionModal = signal<boolean>(false);
  selectedPackage = signal<AfterschoolPackage | null>(null);
  transitionForm = {
    oldTariffValidTo: '',
    newPrice: 0,
    newTariffValidFrom: '',
    notes: ''
  };

  // Modale Nuovo Pacchetto
  showNewPackageModal = signal<boolean>(false);
  newPackageForm = {
    name: '',
    code: '',
    monthly_days: 4,
    price: 50,
    valid_from: new Date().toISOString().split('T')[0],
    notes: ''
  };

  // Modale Storico
  showHistoryModal = signal<boolean>(false);
  historyPackage = signal<AfterschoolPackage | null>(null);
  tariffHistory = signal<AfterschoolTariff[]>([]);

  ngOnInit(): void {
    this.loadPackages();
  }

  loadPackages(): void {
    this.isLoading.set(true);
    this.api.getAfterschoolPackages().subscribe({
      next: (data) => {
        this.packages.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.showAlert(err.error?.error || 'Errore nel caricamento dei pacchetti', 'error');
        this.isLoading.set(false);
      }
    });
  }

  showAlert(msg: string, type: 'success' | 'error'): void {
    this.alertMessage.set(msg);
    this.alertType.set(type);
    setTimeout(() => {
      if (this.alertMessage() === msg) {
        this.alertMessage.set(null);
      }
    }, 4000);
  }

  // Inline Edit Pacchetto
  startEditPackage(pkg: AfterschoolPackage): void {
    this.editingPackageId.set(pkg.id);
    this.editFormData = {
      name: pkg.name,
      monthly_days: pkg.monthly_days
    };
  }

  cancelPackageEdit(): void {
    this.editingPackageId.set(null);
  }

  savePackageEdit(id: string): void {
    if (!this.editFormData.name.trim()) {
      this.showAlert('Il nome del pacchetto non può essere vuoto', 'error');
      return;
    }

    this.api.updateAfterschoolPackage(id, {
      name: this.editFormData.name.trim(),
      monthly_days: Number(this.editFormData.monthly_days)
    }).subscribe({
      next: (updated) => {
        this.packages.update(pkgs => pkgs.map(p => p.id === id ? { ...p, ...updated } : p));
        this.editingPackageId.set(null);
        this.showAlert('Pacchetto aggiornato con successo', 'success');
      },
      error: (err) => {
        this.showAlert(err.error?.error || 'Errore durante il salvataggio del pacchetto', 'error');
      }
    });
  }

  togglePackageStatus(pkg: AfterschoolPackage): void {
    const nextStatus = !pkg.is_active;
    this.api.updateAfterschoolPackage(pkg.id, { is_active: nextStatus }).subscribe({
      next: (updated) => {
        this.packages.update(pkgs => pkgs.map(p => p.id === pkg.id ? { ...p, is_active: nextStatus } : p));
        this.showAlert(`Pacchetto ${nextStatus ? 'attivato' : 'disattivato'}`, 'success');
      },
      error: (err) => {
        this.showAlert(err.error?.error || 'Errore aggiornamento stato', 'error');
      }
    });
  }

  // Transizione Tariffa
  openTransitionModal(pkg: AfterschoolPackage): void {
    this.selectedPackage.set(pkg);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    this.transitionForm = {
      oldTariffValidTo: todayStr,
      newPrice: Number(pkg.current_price) || 0,
      newTariffValidFrom: tomorrowStr,
      notes: ''
    };
    this.showTransitionModal.set(true);
  }

  closeTransitionModal(): void {
    this.showTransitionModal.set(false);
    this.selectedPackage.set(null);
  }

  submitTransitionTariff(): void {
    const pkg = this.selectedPackage();
    if (!pkg) return;

    if (!this.transitionForm.oldTariffValidTo || !this.transitionForm.newTariffValidFrom) {
      this.showAlert('Le date di fine vecchia tariffa e inizio nuova tariffa sono obbligatorie', 'error');
      return;
    }

    if (this.transitionForm.oldTariffValidTo >= this.transitionForm.newTariffValidFrom) {
      this.showAlert('La data di fine tariffa deve essere antecedente alla data di inizio della nuova tariffa', 'error');
      return;
    }

    if (Number(this.transitionForm.newPrice) < 0) {
      this.showAlert('Il prezzo deve essere maggiore o uguale a 0', 'error');
      return;
    }

    this.isSubmitting.set(true);
    this.api.transitionAfterschoolTariff(pkg.id, {
      oldTariffId: pkg.current_tariff_id,
      oldTariffValidTo: this.transitionForm.oldTariffValidTo,
      newPrice: Number(this.transitionForm.newPrice),
      newTariffValidFrom: this.transitionForm.newTariffValidFrom,
      newTariffValidTo: '9999-01-01',
      notes: this.transitionForm.notes.trim() || null
    }).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeTransitionModal();
        this.showAlert('Nuova tariffa attivata con successo (valida fino al 01/01/9999)', 'success');
        this.loadPackages();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.showAlert(err.error?.error || 'Errore durante la transizione della tariffa', 'error');
      }
    });
  }

  // Nuovo Pacchetto
  openNewPackageModal(): void {
    this.newPackageForm = {
      name: '',
      code: '',
      monthly_days: 4,
      price: 50,
      valid_from: new Date().toISOString().split('T')[0],
      notes: ''
    };
    this.showNewPackageModal.set(true);
  }

  closeNewPackageModal(): void {
    this.showNewPackageModal.set(false);
  }

  submitNewPackage(): void {
    if (!this.newPackageForm.name.trim()) {
      this.showAlert('Il nome del pacchetto è obbligatorio', 'error');
      return;
    }

    if (Number(this.newPackageForm.monthly_days) < 0 || Number(this.newPackageForm.price) < 0) {
      this.showAlert('I valori numerici devono essere maggiori o uguali a 0', 'error');
      return;
    }

    if (!this.newPackageForm.valid_from) {
      this.showAlert('La data di inizio validità è obbligatoria', 'error');
      return;
    }

    this.isSubmitting.set(true);
    this.api.createAfterschoolPackage({
      name: this.newPackageForm.name.trim(),
      code: this.newPackageForm.code.trim() || null,
      monthly_days: Number(this.newPackageForm.monthly_days),
      price: Number(this.newPackageForm.price),
      valid_from: this.newPackageForm.valid_from,
      valid_to: '9999-01-01',
      notes: this.newPackageForm.notes.trim() || null
    }).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeNewPackageModal();
        this.showAlert('Nuovo pacchetto creato con successo', 'success');
        this.loadPackages();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.showAlert(err.error?.error || 'Errore nella creazione del pacchetto', 'error');
      }
    });
  }

  // Storico Tariffe
  viewHistory(pkg: AfterschoolPackage): void {
    this.historyPackage.set(pkg);
    this.api.getPackageTariffs(pkg.id).subscribe({
      next: (tariffs) => {
        this.tariffHistory.set(tariffs);
        this.showHistoryModal.set(true);
      },
      error: (err) => {
        this.showAlert(err.error?.error || 'Errore caricamento storico', 'error');
      }
    });
  }

  closeHistoryModal(): void {
    this.showHistoryModal.set(false);
    this.historyPackage.set(null);
  }
}
