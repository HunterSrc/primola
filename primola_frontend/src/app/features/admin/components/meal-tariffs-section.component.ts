import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { MealTariff } from '../../../core/models';
import { AppDatePipe } from '../../../shared/pipes/app-date.pipe';

@Component({
  selector: 'app-meal-tariffs-section',
  standalone: true,
  imports: [CommonModule, FormsModule, AppDatePipe],
  template: `
    <div class="space-y-4">
      <!-- Sezione Dedicata Tariffa Mensa -->
      <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div class="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100">
          <div>
            <h2 class="text-lg sm:text-xl font-bold text-slate-800 flex items-center gap-2">
              <span>🍽️</span>
              <span>Tariffa Mensa (Quota Pasto Studente)</span>
            </h2>
            <p class="text-xs sm:text-sm text-slate-500 mt-1">
              Gestisci la quota pasto addebitata allo studente con storico a validità temporale. Ogni pasto registrato usa la tariffa valida nella data della presenza.
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <button
              (click)="openHistoryModal()"
              class="inline-flex items-center justify-center px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs sm:text-sm rounded-xl transition-all cursor-pointer whitespace-nowrap"
            >
              <span>🕒 Storico ({{ history().length }})</span>
            </button>

            <button
              (click)="openTransitionModal()"
              class="inline-flex items-center justify-center px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-sm transition-all cursor-pointer whitespace-nowrap"
            >
              <span>📅 Cambia Tariffa</span>
            </button>
          </div>
        </div>

        <!-- Feedback alert -->
        <div *ngIf="alertMessage()" class="mx-4 sm:mx-6 mt-4 p-3.5 rounded-xl border text-xs sm:text-sm flex items-center justify-between"
             [ngClass]="alertType() === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'">
          <span>{{ alertMessage() }}</span>
          <button (click)="alertMessage.set(null)" class="text-slate-400 hover:text-slate-600 font-bold ml-4">✕</button>
        </div>

        <!-- Stato Tariffa Attuale -->
        <div class="p-4 sm:p-6">
          <div *ngIf="isLoading()" class="py-6 text-center text-slate-400 text-sm">
            <div class="inline-block animate-spin rounded-full h-5 w-5 border-2 border-amber-600 border-t-transparent mr-2 align-middle"></div>
            Caricamento tariffa mensa...
          </div>

          <div *ngIf="!isLoading() && activeTariff()" class="grid grid-cols-1 sm:grid-cols-4 gap-4 items-center bg-amber-50/50 border border-amber-200/70 rounded-xl p-4">
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Tariffa Attuale</p>
              <p class="text-2xl font-bold text-amber-700 mt-0.5">
                {{ activeTariff()!.price | currency:'EUR':'symbol':'1.2-2' }}
                <span class="text-xs font-normal text-slate-500">/ pasto</span>
              </p>
            </div>

            <div>
              <p class="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Validità Inizio</p>
              <p class="text-sm font-semibold text-slate-800 mt-0.5">{{ activeTariff()!.valid_from | appDate }}</p>
            </div>

            <div>
              <p class="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Validità Fine</p>
              <p class="text-sm font-semibold text-slate-800 mt-0.5">
                {{ activeTariff()!.valid_to === '9999-01-01' ? 'Illimitata' : (activeTariff()!.valid_to | appDate) }}
              </p>
            </div>

            <div>
              <p class="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Note</p>
              <p class="text-xs text-slate-600 mt-0.5">{{ activeTariff()!.notes || '—' }}</p>
            </div>
          </div>

          <div *ngIf="!isLoading() && !activeTariff()" class="p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-500 text-center">
            Nessuna tariffa mensa attiva per la data odierna. Clicca su "Cambia Tariffa" per impostarne una.
          </div>
        </div>
      </div>

      <!-- MODALE TRANSIZIONE TARIFFA MENSA -->
      <div *ngIf="showTransitionModal()" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
        <div class="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
          <div class="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 class="font-bold text-slate-800 text-base">Cambia Tariffa Mensa</h3>
            <button (click)="showTransitionModal.set(false)" class="text-slate-400 hover:text-slate-600 font-bold">✕</button>
          </div>

          <div class="p-4 sm:p-5 space-y-4 text-xs sm:text-sm">
            <div *ngIf="activeTariff()" class="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
              Tariffa attuale: <strong class="text-slate-800">{{ activeTariff()!.price | currency:'EUR':'symbol':'1.2-2' }}</strong>
              (dal {{ activeTariff()!.valid_from | appDate }}). Verrà chiusa automaticamente al giorno precedente la nuova data di inizio.
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block font-semibold text-slate-700 mb-1">Nuovo Prezzo (€) *</label>
                <input
                  type="number"
                  step="0.10"
                  min="0"
                  [(ngModel)]="transitionForm.new_price"
                  class="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
                />
              </div>
              <div>
                <label class="block font-semibold text-slate-700 mb-1">Valida dal *</label>
                <input
                  type="date"
                  [(ngModel)]="transitionForm.new_valid_from"
                  (ngModelChange)="onNewValidFromChange($event)"
                  class="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div *ngIf="activeTariff()">
              <label class="block font-semibold text-slate-700 mb-1">Chiusura vecchia tariffa al</label>
              <input
                type="date"
                [(ngModel)]="transitionForm.old_valid_to"
                class="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label class="block font-semibold text-slate-700 mb-1">Note</label>
              <input
                type="text"
                [(ngModel)]="transitionForm.notes"
                placeholder="Es. Adeguamento tariffa catering 2027"
                class="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div *ngIf="modalError()" class="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs">
              {{ modalError() }}
            </div>
          </div>

          <div class="p-4 border-t border-slate-100 flex justify-end gap-2">
            <button
              (click)="showTransitionModal.set(false)"
              class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
            >
              Annulla
            </button>
            <button
              [disabled]="isSubmitting()"
              (click)="submitTransition()"
              class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm disabled:opacity-50"
            >
              {{ isSubmitting() ? 'Salvataggio...' : 'Conferma Transizione' }}
            </button>
          </div>
        </div>
      </div>

      <!-- MODALE STORICO TARIFFE MENSA -->
      <div *ngIf="showHistoryModal()" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
        <div class="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden max-h-[85vh] flex flex-col">
          <div class="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 class="font-bold text-slate-800 text-base">Storico Tariffa Mensa</h3>
            <button (click)="showHistoryModal.set(false)" class="text-slate-400 hover:text-slate-600 font-bold">✕</button>
          </div>

          <div class="p-4 sm:p-5 overflow-y-auto space-y-3">
            <div *ngIf="modalError()" class="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs">
              {{ modalError() }}
            </div>

            <table class="w-full text-left text-xs sm:text-sm text-slate-600">
              <thead class="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase text-slate-500">
                <tr>
                  <th class="px-3 py-2.5">Prezzo</th>
                  <th class="px-3 py-2.5">Dal</th>
                  <th class="px-3 py-2.5">Al</th>
                  <th class="px-3 py-2.5">Note</th>
                  <th class="px-3 py-2.5 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr *ngFor="let item of history()" class="hover:bg-slate-50">
                  <td class="px-3 py-2.5 font-bold text-slate-800">
                    <span *ngIf="editingTariffId() !== item.id">{{ item.price | currency:'EUR':'symbol':'1.2-2' }}</span>
                    <input *ngIf="editingTariffId() === item.id" type="number" step="0.10" min="0" [(ngModel)]="editTariffForm.price" class="w-20 px-2 py-1 border border-slate-300 rounded-lg text-xs" />
                  </td>
                  <td class="px-3 py-2.5">
                    <span *ngIf="editingTariffId() !== item.id">{{ item.valid_from | appDate }}</span>
                    <input *ngIf="editingTariffId() === item.id" type="date" [(ngModel)]="editTariffForm.valid_from" class="px-2 py-1 border border-slate-300 rounded-lg text-xs" />
                  </td>
                  <td class="px-3 py-2.5">
                    <span *ngIf="editingTariffId() !== item.id">{{ item.valid_to === '9999-01-01' ? 'Illimitata' : (item.valid_to | appDate) }}</span>
                    <input *ngIf="editingTariffId() === item.id" type="date" [(ngModel)]="editTariffForm.valid_to" class="px-2 py-1 border border-slate-300 rounded-lg text-xs" />
                  </td>
                  <td class="px-3 py-2.5 text-xs">
                    <span *ngIf="editingTariffId() !== item.id">{{ item.notes || '—' }}</span>
                    <input *ngIf="editingTariffId() === item.id" type="text" [(ngModel)]="editTariffForm.notes" class="w-full px-2 py-1 border border-slate-300 rounded-lg text-xs" />
                  </td>
                  <td class="px-3 py-2.5 text-right whitespace-nowrap">
                    <button *ngIf="editingTariffId() !== item.id" (click)="startEditTariff(item)" class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold">
                      Modifica
                    </button>
                    <div *ngIf="editingTariffId() === item.id" class="inline-flex gap-1">
                      <button (click)="saveEditTariff(item.id)" class="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-semibold">Salva</button>
                      <button (click)="editingTariffId.set(null)" class="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold">Annulla</button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="p-4 border-t border-slate-100 flex justify-end">
            <button (click)="showHistoryModal.set(false)" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold">
              Chiudi
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class MealTariffsSectionComponent implements OnInit {
  private api = inject(ApiService);

  activeTariff = signal<MealTariff | null>(null);
  history = signal<MealTariff[]>([]);
  isLoading = signal<boolean>(true);
  isSubmitting = signal<boolean>(false);

  alertMessage = signal<string | null>(null);
  alertType = signal<'success' | 'error'>('success');
  modalError = signal<string | null>(null);

  showTransitionModal = signal<boolean>(false);
  showHistoryModal = signal<boolean>(false);
  editingTariffId = signal<string | null>(null);

  transitionForm = {
    new_price: 5.50,
    new_valid_from: new Date().toISOString().split('T')[0],
    old_valid_to: '',
    notes: ''
  };

  editTariffForm = {
    price: 5.50,
    valid_from: '',
    valid_to: '',
    notes: ''
  };

  ngOnInit(): void {
    this.loadMealTariffs();
  }

  loadMealTariffs(): void {
    this.isLoading.set(true);
    this.api.getMealTariffs().subscribe({
      next: (res) => {
        this.activeTariff.set(res.active);
        this.history.set(res.history || []);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.showAlert('Errore nel caricamento della tariffa mensa.', 'error');
      }
    });
  }

  openTransitionModal(): void {
    const today = new Date().toISOString().split('T')[0];
    this.transitionForm = {
      new_price: this.activeTariff()?.price ?? 5.50,
      new_valid_from: today,
      old_valid_to: this.subtractOneDay(today),
      notes: ''
    };
    this.modalError.set(null);
    this.showTransitionModal.set(true);
  }

  onNewValidFromChange(newDate: string): void {
    if (newDate) {
      this.transitionForm.old_valid_to = this.subtractOneDay(newDate);
    }
  }

  private subtractOneDay(dateStr: string): string {
    const d = new Date(`${dateStr}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().split('T')[0];
  }

  submitTransition(): void {
    if (this.transitionForm.new_price < 0 || !this.transitionForm.new_valid_from) {
      this.modalError.set('Inserisci un prezzo valido e una data di inizio.');
      return;
    }

    const active = this.activeTariff();
    if (active && this.transitionForm.old_valid_to >= this.transitionForm.new_valid_from) {
      this.modalError.set('La data di chiusura della vecchia tariffa deve precedere la nuova data di inizio.');
      return;
    }

    this.isSubmitting.set(true);
    this.modalError.set(null);

    this.api.transitionMealTariff({
      old_tariff_id: active?.id ?? null,
      old_valid_to: active ? this.transitionForm.old_valid_to : undefined,
      new_price: Number(this.transitionForm.new_price),
      new_valid_from: this.transitionForm.new_valid_from,
      notes: this.transitionForm.notes || null
    }).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.showTransitionModal.set(false);
        this.showAlert('Nuova tariffa mensa salvata nello storico.', 'success');
        this.loadMealTariffs();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.modalError.set(err?.error?.message || 'Errore durante la transizione della tariffa mensa.');
      }
    });
  }

  openHistoryModal(): void {
    this.editingTariffId.set(null);
    this.modalError.set(null);
    this.showHistoryModal.set(true);
  }

  startEditTariff(item: MealTariff): void {
    this.editingTariffId.set(item.id);
    this.editTariffForm = {
      price: Number(item.price),
      valid_from: item.valid_from,
      valid_to: item.valid_to,
      notes: item.notes || ''
    };
  }

  saveEditTariff(tariffId: string): void {
    if (this.editTariffForm.price < 0 || !this.editTariffForm.valid_from || !this.editTariffForm.valid_to) {
      this.modalError.set('Prezzo e date di validità sono obbligatori.');
      return;
    }
    if (this.editTariffForm.valid_from > this.editTariffForm.valid_to) {
      this.modalError.set('La data di inizio non può essere successiva alla data di fine.');
      return;
    }

    this.api.updateMealTariff(tariffId, {
      price: Number(this.editTariffForm.price),
      valid_from: this.editTariffForm.valid_from,
      valid_to: this.editTariffForm.valid_to,
      notes: this.editTariffForm.notes || null
    }).subscribe({
      next: () => {
        this.editingTariffId.set(null);
        this.modalError.set(null);
        this.loadMealTariffs();
      },
      error: (err) => {
        this.modalError.set(err?.error?.message || 'Errore durante il salvataggio.');
      }
    });
  }

  private showAlert(msg: string, type: 'success' | 'error'): void {
    this.alertMessage.set(msg);
    this.alertType.set(type);
  }
}
