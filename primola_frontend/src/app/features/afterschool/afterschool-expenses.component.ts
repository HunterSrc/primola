import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import {
  AfterschoolExpense,
  AfterschoolExpenseCategory,
  AfterschoolExpensesSummary,
  MensaReport
} from '../../core/models';
import { AppDatePipe } from '../../shared/pipes/app-date.pipe';

@Component({
  selector: 'app-afterschool-expenses',
  standalone: true,
  imports: [CommonModule, FormsModule, AppDatePipe],
  template: `
    <div class="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">

      <!-- Header & Selettore Mese/Anno -->
      <div class="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center space-x-2">
            <span class="p-2 rounded-xl bg-amber-100 text-amber-700">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
              </svg>
            </span>
            <div>
              <div class="flex items-center space-x-2">
                <h1 class="text-xl sm:text-2xl font-bold text-slate-800">Gestione Mensa & Note Spese</h1>
                <span class="text-[10px] sm:text-xs bg-amber-500/10 text-amber-700 font-bold px-2.5 py-0.5 rounded-full border border-amber-500/20">
                  ADMIN & OFFICE
                </span>
              </div>
              <p class="text-xs sm:text-sm text-slate-500">
                Caricamento note spese doposcuola (Mensa e Altro) e rendicontazione pasti consumati nel mese
              </p>
            </div>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2.5">
          <select
            [(ngModel)]="selectedMonth"
            (ngModelChange)="loadAll()"
            class="px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            @for (m of monthsList; track m.value) {
              <option [value]="m.value">{{ m.name }}</option>
            }
          </select>

          <select
            [(ngModel)]="selectedYear"
            (ngModelChange)="loadAll()"
            class="px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            @for (y of yearsList; track y) {
              <option [value]="y">{{ y }}</option>
            }
          </select>

          <button
            type="button"
            (click)="openNewExpenseModal()"
            class="inline-flex items-center space-x-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all cursor-pointer"
          >
            <span>+ Carica Nota Spesa</span>
          </button>
        </div>
      </div>

      <!-- KPI Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs border-l-4 border-l-amber-500">
          <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Spese Mensa (Mese)</span>
          <p class="text-2xl sm:text-3xl font-extrabold text-amber-600 mt-1">
            € {{ summary().total_mensa | number:'1.2-2' }}
          </p>
          <p class="text-[11px] text-slate-400 mt-0.5">
            Fatture e forniture mensa caricate
          </p>
        </div>

        <div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs border-l-4 border-l-purple-500">
          <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Spese Altro (Mese)</span>
          <p class="text-2xl sm:text-3xl font-extrabold text-purple-600 mt-1">
            € {{ summary().total_altro | number:'1.2-2' }}
          </p>
          <p class="text-[11px] text-slate-400 mt-0.5">
            Materiali, cancelleria e costi extra
          </p>
        </div>

        <div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs border-l-4 border-l-rose-500">
          <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Totale Note Spese</span>
          <p class="text-2xl sm:text-3xl font-extrabold text-rose-600 mt-1">
            € {{ summary().total_expenses | number:'1.2-2' }}
          </p>
          <p class="text-[11px] text-slate-400 mt-0.5">
            {{ summary().count }} note spese registrate nel mese
          </p>
        </div>

        <div class="bg-gradient-to-r from-amber-500 to-orange-500 p-4 sm:p-5 rounded-2xl text-white shadow-md shadow-orange-500/15">
          <span class="text-xs font-semibold text-amber-100 uppercase tracking-wider block">Pasti Erogati Mese</span>
          <p class="text-2xl sm:text-3xl font-extrabold mt-1">
            {{ mensaReport()?.total_meals ?? 0 }} pasti
          </p>
          <p class="text-[11px] text-amber-100 mt-0.5">
            Previsti da abbonamento: {{ mensaReport()?.expected_meals ?? 0 }} pasti
          </p>
        </div>
      </div>

      <!-- SEZIONE 1: ELENCO E GESTIONE NOTE SPESE DOPOSCUOLA (MENSA & ALTRO) -->
      <div class="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden p-4 sm:p-6 space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <div class="flex items-center space-x-2">
              <span class="w-3 h-3 rounded-full bg-rose-500"></span>
              <h2 class="font-bold text-base sm:text-lg text-slate-800">
                Registro Note Spese Doposcuola ({{ filteredExpenses().length }})
              </h2>
            </div>
            <p class="text-xs text-slate-500 mt-0.5">
              Il totale delle spese "Mensa" e "Altro" qui inserite viene riportato automaticamente nelle Uscite del Bilancio Admin
            </p>
          </div>

          <div class="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs self-start sm:self-auto">
            <button
              type="button"
              (click)="categoryFilter.set('ALL')"
              [class.bg-white]="categoryFilter() === 'ALL'"
              [class.shadow-2xs]="categoryFilter() === 'ALL'"
              [class.font-bold]="categoryFilter() === 'ALL'"
              [class.text-slate-800]="categoryFilter() === 'ALL'"
              class="px-3 py-1.5 rounded-lg text-slate-600 transition-all cursor-pointer"
            >
              Tutte ({{ expenses().length }})
            </button>
            <button
              type="button"
              (click)="categoryFilter.set('MENSA')"
              [class.bg-white]="categoryFilter() === 'MENSA'"
              [class.shadow-2xs]="categoryFilter() === 'MENSA'"
              [class.font-bold]="categoryFilter() === 'MENSA'"
              [class.text-amber-700]="categoryFilter() === 'MENSA'"
              class="px-3 py-1.5 rounded-lg text-slate-600 transition-all cursor-pointer"
            >
              🍽️ Solo Mensa
            </button>
            <button
              type="button"
              (click)="categoryFilter.set('ALTRO')"
              [class.bg-white]="categoryFilter() === 'ALTRO'"
              [class.shadow-2xs]="categoryFilter() === 'ALTRO'"
              [class.font-bold]="categoryFilter() === 'ALTRO'"
              [class.text-purple-700]="categoryFilter() === 'ALTRO'"
              class="px-3 py-1.5 rounded-lg text-slate-600 transition-all cursor-pointer"
            >
              📦 Solo Altro
            </button>
          </div>
        </div>

        @if (loadingExpenses()) {
          <div class="p-8 text-center text-slate-400 text-sm">Caricamento note spese...</div>
        } @else {
          <div class="overflow-x-auto border border-slate-200 rounded-xl">
            <table class="w-full text-left border-collapse text-xs sm:text-sm min-w-[560px]">
              <thead>
                <tr class="bg-slate-50 text-slate-600 font-semibold uppercase text-[11px] border-b border-slate-200">
                  <th class="py-3 px-4 w-32">Data Spesa</th>
                  <th class="py-3 px-4 w-32">Tipologia</th>
                  <th class="py-3 px-4">Descrizione / Causale</th>
                  <th class="py-3 px-4 w-40">Inserita da</th>
                  <th class="py-3 px-4 text-right w-32">Valore (€)</th>
                  <th class="py-3 px-4 text-right w-36">Azioni</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                @for (exp of filteredExpenses(); track exp.id) {
                  <tr class="hover:bg-slate-50/60 transition-colors">
                    <td class="py-3 px-4 font-mono font-semibold text-slate-800">
                      {{ exp.expense_date | appDate }}
                    </td>
                    <td class="py-3 px-4">
                      @if (exp.category === 'MENSA') {
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          🍽️ Mensa
                        </span>
                      } @else {
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                          📦 Altro
                        </span>
                      }
                    </td>
                    <td class="py-3 px-4 text-slate-700">
                      {{ exp.description || 'Nessuna descrizione specificata' }}
                    </td>
                    <td class="py-3 px-4 text-xs text-slate-400">
                      {{ exp.created_by_name || 'Sistema' }}
                    </td>
                    <td class="py-3 px-4 text-right font-mono font-extrabold text-rose-600">
                      € {{ exp.amount | number:'1.2-2' }}
                    </td>
                    <td class="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        type="button"
                        (click)="openEditExpenseModal(exp)"
                        class="px-2.5 py-1 rounded-lg text-xs font-semibold text-indigo-700 hover:bg-indigo-50 border border-indigo-200 transition-colors cursor-pointer"
                      >
                        Modifica
                      </button>
                      <button
                        type="button"
                        (click)="deleteExpense(exp)"
                        class="px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
                      >
                        Elimina
                      </button>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="6" class="py-8 text-center text-slate-400">
                      Nessuna nota spesa registrata per questo mese. Clicca su "+ Carica Nota Spesa" in alto a destra.
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>

      <!-- SEZIONE 2: RIEPILOGO PASTI CONSUMATI PER ALUNNO NEL MESE -->
      @if (mensaReport(); as mensa) {
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden space-y-3 p-4 sm:p-6">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div class="flex items-center space-x-2">
              <span class="w-3 h-3 rounded-full bg-amber-500"></span>
              <h2 class="font-bold text-base sm:text-lg text-slate-800">
                Dettaglio Pasti Mensa per Alunno ({{ filteredStudentsMensa().length }})
              </h2>
            </div>

            <input
              type="text"
              [(ngModel)]="searchStudentQuery"
              placeholder="Cerca alunno o scuola..."
              class="px-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 w-full sm:w-64"
            />
          </div>

          <div class="overflow-x-auto border border-slate-200 rounded-xl">
            <table class="w-full text-left border-collapse text-xs sm:text-sm min-w-[500px]">
              <thead>
                <tr class="bg-slate-50 text-slate-600 font-semibold uppercase text-[11px] border-b border-slate-200">
                  <th class="py-3 px-4">Alunno</th>
                  <th class="py-3 px-4">Scuola</th>
                  <th class="py-3 px-4 text-center">Diritto Sett.</th>
                  <th class="py-3 px-4 text-center">Previsti Mese</th>
                  <th class="py-3 px-4 text-center">Pasti Consumati</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                @for (s of filteredStudentsMensa(); track s.student_id) {
                  <tr class="hover:bg-slate-50/60 transition-colors">
                    <td class="py-3 px-4 font-semibold text-slate-800">{{ s.last_name }} {{ s.first_name }}</td>
                    <td class="py-3 px-4 text-slate-500 text-xs">{{ s.school || 'Non specificata' }}</td>
                    <td class="py-3 px-4 text-center text-slate-500">{{ s.weekly_meals }} / sett.</td>
                    <td class="py-3 px-4 text-center text-indigo-700 font-semibold">{{ s.expected_meals }}</td>
                    <td class="py-3 px-4 text-center">
                      <span
                        class="inline-block px-3 py-1 rounded-full text-xs font-bold"
                        [class.bg-amber-100]="s.delivered_total > 0"
                        [class.text-amber-800]="s.delivered_total > 0"
                        [class.bg-slate-100]="s.delivered_total === 0"
                        [class.text-slate-400]="s.delivered_total === 0"
                      >
                        🍽️ {{ s.delivered_total }} pasti
                      </span>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="5" class="py-8 text-center text-slate-400">Nessun alunno trovato.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <!-- MODALE CREAZIONE / MODIFICA NOTA SPESA DOPOSCUOLA -->
      @if (showExpenseModal()) {
        <div class="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div class="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 class="font-bold text-slate-800 text-lg">
                {{ editingExpenseId() ? 'Modifica Nota Spesa' : 'Carica Nota Spesa Doposcuola' }}
              </h3>
              <button
                type="button"
                (click)="closeExpenseModal()"
                class="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            @if (expenseModalError()) {
              <div class="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
                {{ expenseModalError() }}
              </div>
            }

            <div class="space-y-4">
              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1.5">Tipologia Spesa</label>
                <div class="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    (click)="expenseForm.category = 'MENSA'"
                    [class.bg-amber-50]="expenseForm.category === 'MENSA'"
                    [class.border-amber-500]="expenseForm.category === 'MENSA'"
                    [class.text-amber-800]="expenseForm.category === 'MENSA'"
                    [class.ring-2]="expenseForm.category === 'MENSA'"
                    [class.ring-amber-500/20]="expenseForm.category === 'MENSA'"
                    class="py-2.5 px-3 rounded-xl border border-slate-200 text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                  >
                    <span>🍽️</span>
                    <span>Spesa Mensa</span>
                  </button>

                  <button
                    type="button"
                    (click)="expenseForm.category = 'ALTRO'"
                    [class.bg-purple-50]="expenseForm.category === 'ALTRO'"
                    [class.border-purple-500]="expenseForm.category === 'ALTRO'"
                    [class.text-purple-800]="expenseForm.category === 'ALTRO'"
                    [class.ring-2]="expenseForm.category === 'ALTRO'"
                    [class.ring-purple-500/20]="expenseForm.category === 'ALTRO'"
                    class="py-2.5 px-3 rounded-xl border border-slate-200 text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                  >
                    <span>📦</span>
                    <span>Altro</span>
                  </button>
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-slate-600 mb-1">Valore in Euro (€)</label>
                  <div class="relative">
                    <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-sm">€</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      [(ngModel)]="expenseForm.amount"
                      placeholder="0.00"
                      class="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-600 mb-1">Data della Spesa</label>
                  <input
                    type="date"
                    [(ngModel)]="expenseForm.expense_date"
                    class="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1">Descrizione / Causale</label>
                <input
                  type="text"
                  [(ngModel)]="expenseForm.description"
                  placeholder="Es. Fattura catering mensa, acquisto materiale..."
                  class="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                (click)="closeExpenseModal()"
                class="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Annulla
              </button>
              <button
                type="button"
                (click)="submitExpenseModal()"
                [disabled]="savingExpense()"
                class="px-5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 shadow-sm cursor-pointer"
              >
                {{ savingExpense() ? 'Salvataggio...' : (editingExpenseId() ? 'Salva Modifiche' : 'Inserisci Spesa') }}
              </button>
            </div>
          </div>
        </div>
      }

    </div>
  `
})
export class AfterschoolExpensesComponent implements OnInit {
  private apiService = inject(ApiService);
  authService = inject(AuthService);

  selectedYear = new Date().getFullYear();
  selectedMonth = new Date().getMonth() + 1;

  expenses = signal<AfterschoolExpense[]>([]);
  summary = signal<AfterschoolExpensesSummary>({
    total_mensa: 0,
    total_altro: 0,
    total_expenses: 0,
    count: 0
  });
  loadingExpenses = signal<boolean>(false);

  mensaReport = signal<MensaReport | null>(null);
  searchStudentQuery = '';

  categoryFilter = signal<'ALL' | AfterschoolExpenseCategory>('ALL');

  showExpenseModal = signal<boolean>(false);
  editingExpenseId = signal<string | null>(null);
  savingExpense = signal<boolean>(false);
  expenseModalError = signal<string | null>(null);

  expenseForm: {
    expense_date: string;
    category: AfterschoolExpenseCategory;
    amount: number | null;
    description: string;
  } = {
    expense_date: new Date().toISOString().slice(0, 10),
    category: 'MENSA',
    amount: null,
    description: ''
  };

  readonly monthsList = [
    { value: 1, name: 'Gennaio' },
    { value: 2, name: 'Febbraio' },
    { value: 3, name: 'Marzo' },
    { value: 4, name: 'Aprile' },
    { value: 5, name: 'Maggio' },
    { value: 6, name: 'Giugno' },
    { value: 7, name: 'Luglio' },
    { value: 8, name: 'Agosto' },
    { value: 9, name: 'Settembre' },
    { value: 10, name: 'Ottobre' },
    { value: 11, name: 'Novembre' },
    { value: 12, name: 'Dicembre' }
  ];

  readonly yearsList = [2024, 2025, 2026, 2027, 2028];

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.loadExpenses();
    this.loadMensaReport();
  }

  loadExpenses(): void {
    this.loadingExpenses.set(true);
    this.apiService.getAfterschoolExpenses(Number(this.selectedYear), Number(this.selectedMonth)).subscribe({
      next: (data) => {
        this.expenses.set(data?.expenses || []);
        this.summary.set(data?.summary || { total_mensa: 0, total_altro: 0, total_expenses: 0, count: 0 });
        this.loadingExpenses.set(false);
      },
      error: (err) => {
        console.error('Errore caricamento note spese doposcuola:', err);
        this.loadingExpenses.set(false);
      }
    });
  }

  loadMensaReport(): void {
    this.apiService.getMensaReport(Number(this.selectedYear), Number(this.selectedMonth)).subscribe({
      next: (rep) => {
        this.mensaReport.set(rep);
      },
      error: (err) => {
        console.error('Errore caricamento report mensa:', err);
      }
    });
  }

  filteredExpenses(): AfterschoolExpense[] {
    const list = this.expenses();
    const cat = this.categoryFilter();
    if (cat === 'ALL') return list;
    return list.filter(e => e.category === cat);
  }

  filteredStudentsMensa() {
    const list = this.mensaReport()?.students_breakdown || [];
    const q = this.searchStudentQuery.toLowerCase().trim();
    if (!q) return list;
    return list.filter(s =>
      s.first_name.toLowerCase().includes(q) ||
      s.last_name.toLowerCase().includes(q) ||
      (s.school && s.school.toLowerCase().includes(q))
    );
  }

  private getDefaultDateForSelectedMonth(): string {
    const today = new Date();
    const y = Number(this.selectedYear);
    const m = Number(this.selectedMonth);
    if (today.getFullYear() === y && (today.getMonth() + 1) === m) {
      return today.toISOString().slice(0, 10);
    }
    return `${y}-${String(m).padStart(2, '0')}-01`;
  }

  openNewExpenseModal(): void {
    this.editingExpenseId.set(null);
    this.expenseForm = {
      expense_date: this.getDefaultDateForSelectedMonth(),
      category: 'MENSA',
      amount: null,
      description: ''
    };
    this.expenseModalError.set(null);
    this.showExpenseModal.set(true);
  }

  openEditExpenseModal(expense: AfterschoolExpense): void {
    this.editingExpenseId.set(expense.id);
    this.expenseForm = {
      expense_date: expense.expense_date,
      category: expense.category,
      amount: Number(expense.amount),
      description: expense.description || ''
    };
    this.expenseModalError.set(null);
    this.showExpenseModal.set(true);
  }

  closeExpenseModal(): void {
    this.showExpenseModal.set(false);
  }

  submitExpenseModal(): void {
    const { expense_date, category, amount, description } = this.expenseForm;

    if (!expense_date) {
      this.expenseModalError.set('Seleziona la data della spesa.');
      return;
    }

    const numAmount = Number(amount);
    if (amount === null || amount === undefined || isNaN(numAmount) || numAmount <= 0) {
      this.expenseModalError.set('Inserisci un valore in euro valido maggiore di 0.');
      return;
    }

    this.savingExpense.set(true);
    this.expenseModalError.set(null);

    const payload = {
      expense_date,
      category,
      amount: Number(numAmount.toFixed(2)),
      description: description ? description.trim() : ''
    };

    const editId = this.editingExpenseId();
    const req$ = editId
      ? this.apiService.updateAfterschoolExpense(editId, payload)
      : this.apiService.createAfterschoolExpense(payload);

    req$.subscribe({
      next: () => {
        this.savingExpense.set(false);
        this.closeExpenseModal();
        this.loadExpenses();
      },
      error: (err) => {
        this.savingExpense.set(false);
        this.expenseModalError.set(err?.error?.error || 'Errore durante il salvataggio della nota spesa.');
      }
    });
  }

  deleteExpense(expense: AfterschoolExpense): void {
    const label = expense.category === 'MENSA' ? 'Mensa' : 'Altro';
    if (!confirm(`Sei sicuro di voler eliminare la nota spesa "${label}" di € ${Number(expense.amount).toFixed(2)} del ${expense.expense_date}?`)) {
      return;
    }

    this.apiService.deleteAfterschoolExpense(expense.id).subscribe({
      next: () => {
        this.loadExpenses();
      },
      error: (err) => {
        alert(err?.error?.error || "Errore durante l'eliminazione della nota spesa.");
      }
    });
  }
}
