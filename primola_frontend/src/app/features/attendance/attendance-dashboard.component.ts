import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { AttendanceRecord, Student } from '../../core/models';
import { AppDatePipe } from '../../shared/pipes/app-date.pipe';

@Component({
  selector: 'app-attendance-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, AppDatePipe],
  template: `
    <div class="p-3 sm:p-6 md:p-10 max-w-7xl mx-auto space-y-4 sm:space-y-6 pb-6 md:pb-0">
      
      <!-- Header Banner / Control Bar -->
      <div class="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 shadow-sm border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
        <div>
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shadow-inner shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 sm:w-7 sm:h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div>
              <h1 class="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Segna Presenze</h1>
              <p class="text-xs sm:text-sm font-semibold text-emerald-700 capitalize mt-0.5">{{ selectedDate() | appDate:'full' }}</p>
            </div>
          </div>
        </div>

        <!-- Controls: Data Picker, Add Student (Office only), Save Button -->
        <div class="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 w-full md:w-auto">
          <div class="relative w-full sm:w-auto">
            <input
              type="date"
              [ngModel]="selectedDate()"
              (ngModelChange)="onDateChange($event)"
              class="w-full sm:w-auto min-w-[200px] px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors shadow-sm cursor-pointer"
            />
          </div>

          <div class="flex items-center gap-2 w-full sm:w-auto">
            @if (canManageStudents()) {
              <button
                (click)="showStudentModal.set(true)"
                class="flex-1 sm:flex-initial px-3.5 py-2 sm:px-4 sm:py-2.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 text-xs sm:text-sm font-bold rounded-xl sm:rounded-2xl flex items-center justify-center space-x-1.5 sm:space-x-2 transition-all border border-slate-200/80 shadow-sm min-h-[42px]"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
                </svg>
                <span>Aggiungi Studente</span>
              </button>
            }

            <button
              (click)="saveBulk()"
              [disabled]="isSaving()"
              class="flex-1 sm:flex-initial px-4 sm:px-6 py-2 sm:py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white text-xs sm:text-sm font-bold rounded-xl sm:rounded-2xl shadow-lg shadow-emerald-600/25 flex items-center justify-center space-x-1.5 sm:space-x-2 transition-all active:scale-95 min-h-[42px]"
            >
              @if (isSaving()) {
                <svg class="animate-spin -ml-1 mr-1.5 sm:mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Salvataggio...</span>
              } @else {
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                </svg>
                <span>Salva Presenze</span>
              }
            </button>
          </div>
        </div>
      </div>

      <!-- Quick Search Bar (Mobile e Desktop) -->
      @if (records().length > 0) {
        <div class="relative">
          <input
            type="text"
            [(ngModel)]="searchQuery"
            placeholder="Cerca studente nella lista del giorno..."
            class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
          />
          @if (searchQuery) {
            <button (click)="searchQuery = ''" class="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-sm font-bold">&times;</button>
          }
        </div>
      }

      <!-- Toast Feedback Salva -->
      @if (saveSuccessMessage()) {
        <div class="p-3.5 sm:p-4 bg-emerald-500 text-white rounded-2xl flex items-center justify-between shadow-xl shadow-emerald-500/20">
          <div class="flex items-center space-x-3">
            <div class="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs sm:text-sm">✓</div>
            <span class="font-bold text-xs sm:text-sm">{{ saveSuccessMessage() }}</span>
          </div>
          <button (click)="saveSuccessMessage.set(null)" class="text-white hover:text-emerald-100 font-bold text-lg p-1">&times;</button>
        </div>
      }

      <!-- VISTA MOBILE: Cards Touch-Friendly per Smartphone (md:hidden) -->
      <div class="block md:hidden space-y-3">
        @for (item of filteredRecords(); track item.student_id; let idx = $index) {
          <div
            class="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/90 transition-all"
            [class.border-emerald-400]="item.is_present"
            [class.bg-emerald-50/15]="item.is_present"
          >
            <!-- Card Header: Nome, Scuola, Telefono -->
            <div class="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
              <div class="flex items-center space-x-3">
                <div class="w-10 h-10 rounded-2xl flex items-center justify-center font-extrabold text-xs shrink-0 shadow-2xs"
                     [class]="item.is_present ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'">
                  {{ item.first_name.charAt(0) }}{{ item.last_name.charAt(0) }}
                </div>
                <div>
                  <div class="flex items-center space-x-1.5 flex-wrap">
                    <span class="text-sm font-bold text-slate-900">{{ item.last_name }} {{ item.first_name }}</span>
                  </div>
                  <p class="text-xs text-slate-500">{{ item.school || 'Scuola non indicata' }}</p>
                </div>
              </div>

              <div class="flex items-center space-x-2">
                @if (item.main_tutor_phone) {
                  <a
                    [href]="'tel:' + item.main_tutor_phone"
                    class="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 shrink-0 border border-emerald-200/60 active:scale-95"
                    title="Chiama tutore"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </a>
                }
                @if (canManageStudents()) {
                  <button
                    type="button"
                    (click)="removeStudent(item.student_id)"
                    class="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 shrink-0 border border-rose-200/60 active:scale-95"
                    title="Rimuovi studente dalla giornata"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                }
              </div>
            </div>

            <!-- Card Actions: Presenza (tutti), Mensa (modifica se Office, visualizzazione se Teacher) -->
            <div class="grid grid-cols-2 gap-2 pt-3">
              <!-- Presente Button (Office e Teacher possono segnare) -->
              <button
                type="button"
                (click)="togglePresence(getOriginalIndex(item))"
                [class]="item.is_present ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-2 ring-emerald-500/20' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'"
                class="min-h-[44px] py-2 px-2 rounded-xl font-bold transition-all flex flex-col items-center justify-center text-xs active:scale-95"
              >
                <span class="text-sm leading-none mb-0.5">@if (item.is_present) { ✓ } @else { ✕ }</span>
                <span class="text-[10px]">Presente</span>
              </button>

              <!-- Mensa: Toggle per Office, Badge informativo sola lettura per Teacher -->
              @if (canManageMeals()) {
                <button
                  type="button"
                  (click)="toggleMeal(getOriginalIndex(item))"
                  [class]="item.has_meal ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'"
                  class="min-h-[44px] py-2 px-2 rounded-xl font-bold transition-all flex flex-col items-center justify-center text-xs active:scale-95"
                >
                  <span class="text-sm leading-none mb-0.5">🍲</span>
                  <span class="text-[10px]">Mensa</span>
                </button>
              } @else {
                <!-- Vista Docente: Sola Lettura Mensa -->
                <div
                  [class]="item.has_meal ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-slate-100 text-slate-400 border border-slate-200'"
                  class="min-h-[44px] py-2 px-2 rounded-xl font-bold flex flex-col items-center justify-center text-xs select-none"
                  title="Stato mensa (gestito da segreteria)"
                >
                  <span class="text-sm leading-none mb-0.5">🍲</span>
                  <span class="text-[10px]">{{ item.has_meal ? 'Mensa Sì' : 'No Mensa' }}</span>
                </div>
              }
            </div>

            <!-- Note Input Mobile -->
            <div class="mt-2.5">
              <input
                type="text"
                [(ngModel)]="item.notes"
                placeholder="Note opzionali..."
                class="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-slate-400"
              />
            </div>
          </div>
        } @empty {
          <div class="p-8 bg-white rounded-2xl text-center text-slate-400 font-medium border border-slate-200 space-y-2">
            <p>Nessuno studente inserito per questa data.</p>
            @if (canManageStudents()) {
              <p class="text-xs text-emerald-700 font-semibold">Usa il pulsante "+ Aggiungi Studente" per inserire gli studenti presenti oggi.</p>
            } @else {
              <p class="text-xs text-slate-500">Gli studenti verranno caricati dalla segreteria (Office).</p>
            }
          </div>
        }
      </div>

      <!-- VISTA DESKTOP / TABLET: Tabella Tradizionale (hidden md:block) -->
      <div class="hidden md:block bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200/80 text-slate-600 text-xs font-bold uppercase tracking-wider">
                <th class="py-4 px-6">Studente</th>
                <th class="py-4 px-6">Scuola / Tutore</th>
                <th class="py-4 px-6 text-center">Presente</th>
                <th class="py-4 px-6 text-center">Mensa</th>
                <th class="py-4 px-6">Note</th>
                @if (canManageStudents()) {
                  <th class="py-4 px-4 text-center w-12">Azioni</th>
                }
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-sm">
              @for (item of filteredRecords(); track item.student_id; let idx = $index) {
                <tr class="hover:bg-slate-50/70 transition-colors" [class.bg-emerald-50/20]="item.is_present">
                  
                  <!-- Nome e Avatar -->
                  <td class="py-4 px-6 font-bold text-slate-800">
                    <div class="flex items-center space-x-3.5">
                      <div class="w-9 h-9 rounded-2xl flex items-center justify-center font-extrabold text-xs shrink-0 shadow-sm"
                           [class]="item.is_present ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'">
                        {{ item.first_name.charAt(0) }}{{ item.last_name.charAt(0) }}
                      </div>
                      <div>
                        <div class="flex items-center space-x-2">
                          <span class="text-base text-slate-900">{{ item.last_name }} {{ item.first_name }}</span>
                        </div>
                      </div>
                    </div>
                  </td>

                  <!-- Info Scuola & Telefono -->
                  <td class="py-4 px-6 text-slate-600 text-xs">
                    <div class="font-medium text-slate-800">{{ item.school || 'Non indicata' }}</div>
                    @if (item.main_tutor_phone) {
                      <a [href]="'tel:' + item.main_tutor_phone" class="text-slate-400 font-mono mt-0.5 block hover:text-emerald-600">{{ item.main_tutor_phone }}</a>
                    }
                  </td>

                  <!-- Presente Toggle (Attivo sia per Office che per Teacher) -->
                  <td class="py-4 px-6 text-center">
                    <button
                      type="button"
                      (click)="togglePresence(getOriginalIndex(item))"
                      [class]="item.is_present ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-2 ring-emerald-500/20' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'"
                      class="w-10 h-10 rounded-2xl font-bold transition-all inline-flex items-center justify-center text-sm active:scale-90"
                    >
                      @if (item.is_present) { ✓ } @else { ✕ }
                    </button>
                  </td>

                  <!-- Mensa Toggle (Office: interattivo, Teacher: sola lettura) -->
                  <td class="py-4 px-6 text-center">
                    @if (canManageMeals()) {
                      <button
                        type="button"
                        (click)="toggleMeal(getOriginalIndex(item))"
                        [class]="item.has_meal ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30' : 'bg-slate-100 text-slate-300 hover:bg-slate-200'"
                        class="w-10 h-10 rounded-2xl font-bold transition-all inline-flex items-center justify-center text-sm active:scale-90"
                        title="Modifica mensa"
                      >
                        🍲
                      </button>
                    } @else {
                      <div
                        [class]="item.has_meal ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-slate-100 text-slate-400 border border-slate-200'"
                        class="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-bold select-none"
                        title="Stato mensa impostato dalla segreteria"
                      >
                        🍲 {{ item.has_meal ? 'Sì' : 'No' }}
                      </div>
                    }
                  </td>

                  <!-- Note Input -->
                  <td class="py-4 px-6">
                    <input
                      type="text"
                      [(ngModel)]="item.notes"
                      placeholder="Note opzionali..."
                      class="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-400"
                    />
                  </td>

                  <!-- Azioni (es. Rimuovi Studente della giornata, solo per Office) -->
                  @if (canManageStudents()) {
                    <td class="py-4 px-4 text-center">
                      <button
                        type="button"
                        (click)="removeStudent(item.student_id)"
                        class="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-all"
                        title="Rimuovi studente dalla giornata"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  }

                </tr>
              } @empty {
                <tr>
                  <td [attr.colspan]="canManageStudents() ? 6 : 5" class="py-16 text-center text-slate-400 font-medium">
                    Nessuno studente inserito per questa data.
                    @if (canManageStudents()) {
                      <span class="block mt-1 text-xs text-emerald-700">Clicca su "+ Aggiungi Studente" per registrare presenze per questa giornata.</span>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- Modale Aggiungi Studente (Visibile solo per utenti Office/Admin) -->
      @if (showStudentModal() && canManageStudents()) {
        <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div class="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full p-5 sm:p-8 shadow-2xl border border-slate-100 space-y-4 sm:space-y-5 animate-fade-in">
            <div class="flex items-center justify-between pb-3 sm:pb-4 border-b border-slate-100">
              <h3 class="text-lg sm:text-xl font-extrabold text-slate-900">Aggiungi Studente alla Giornata</h3>
              <button (click)="showStudentModal.set(false)" class="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold">&times;</button>
            </div>

            <p class="text-xs text-slate-500">
              Seleziona uno studente dall'anagrafica per aggiungerlo all'elenco di oggi:
            </p>

            <div class="relative">
              <input
                type="text"
                [(ngModel)]="modalSearchQuery"
                placeholder="Cerca studente..."
                class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div class="max-h-60 sm:max-h-64 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl sm:rounded-2xl">
              @for (student of filteredAvailableStudents(); track student.id) {
                <div class="p-3 sm:p-3.5 hover:bg-emerald-50/50 flex items-center justify-between transition-colors">
                  <div>
                    <p class="text-xs sm:text-sm font-bold text-slate-900">{{ student.last_name }} {{ student.first_name }}</p>
                    <p class="text-[11px] text-slate-400">{{ student.school || 'Nessuna scuola specificata' }}</p>
                  </div>
                  <button
                    (click)="addStudentToAttendance(student)"
                    class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                  >
                    + Aggiungi
                  </button>
                </div>
              } @empty {
                <div class="p-8 text-center text-xs text-slate-400">Nessuno studente disponibile trovato.</div>
              }
            </div>

            <div class="pt-2 flex justify-end">
              <button
                (click)="showStudentModal.set(false)"
                class="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition-colors"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      }

    </div>
  `
})
export class AttendanceDashboardComponent implements OnInit {
  private api = inject(ApiService);
  readonly authService = inject(AuthService);

  readonly selectedDate = signal<string>(new Date().toISOString().split('T')[0]);
  readonly records = signal<AttendanceRecord[]>([]);
  readonly allStudents = signal<Student[]>([]);
  readonly isSaving = signal<boolean>(false);
  readonly saveSuccessMessage = signal<string | null>(null);
  readonly showStudentModal = signal<boolean>(false);
  searchQuery = '';
  modalSearchQuery = '';

  // Permessi RBAC
  readonly canManageStudents = computed(() => this.authService.canManageAttendanceStudents());
  readonly canManageMeals = computed(() => this.authService.canManageAttendanceMeals());

  readonly formattedDate = computed(() => {
    const d = new Date(this.selectedDate());
    return d.toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  });

  readonly availableStudents = computed(() => {
    const existingIds = new Set(this.records().map(r => r.student_id));
    return this.allStudents().filter(s => !existingIds.has(s.id));
  });

  filteredAvailableStudents(): Student[] {
    const q = this.modalSearchQuery.toLowerCase().trim();
    if (!q) return this.availableStudents();
    return this.availableStudents().filter(s =>
      s.first_name.toLowerCase().includes(q) ||
      s.last_name.toLowerCase().includes(q) ||
      (s.school && s.school.toLowerCase().includes(q))
    );
  }

  filteredRecords(): AttendanceRecord[] {
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) return this.records();
    return this.records().filter(r =>
      r.first_name.toLowerCase().includes(q) ||
      r.last_name.toLowerCase().includes(q) ||
      (r.school && r.school.toLowerCase().includes(q))
    );
  }

  getOriginalIndex(item: AttendanceRecord): number {
    return this.records().findIndex(r => r.student_id === item.student_id);
  }

  ngOnInit(): void {
    this.loadData();
    if (this.canManageStudents()) {
      this.api.getStudents().subscribe(students => this.allStudents.set(students));
    }
  }

  loadData(): void {
    this.api.getExpectedAttendances(this.selectedDate()).subscribe(data => {
      this.records.set(data);
    });
  }

  onDateChange(newDate: string): void {
    this.selectedDate.set(newDate);
    this.loadData();
  }

  togglePresence(index: number): void {
    if (index < 0) return;
    const current = [...this.records()];
    const record = { ...current[index] };
    record.is_present = !record.is_present;
    current[index] = record;
    this.records.set(current);
  }

  toggleMeal(index: number): void {
    if (!this.canManageMeals() || index < 0) return;
    const current = [...this.records()];
    const record = { ...current[index] };
    record.has_meal = !record.has_meal;
    current[index] = record;
    this.records.set(current);
  }

  addStudentToAttendance(student: Student): void {
    if (!this.canManageStudents()) return;
    const newRecord: AttendanceRecord = {
      student_id: student.id,
      first_name: student.first_name,
      last_name: student.last_name,
      school: student.school || '',
      main_tutor_phone: student.main_tutor_phone,
      is_present: true,
      has_meal: (student.weekly_meals ?? 0) > 0
    };
    this.records.update(prev => [...prev, newRecord]);
    this.showStudentModal.set(false);
    this.modalSearchQuery = '';
  }

  removeStudent(studentId: number | string): void {
    if (!this.canManageStudents()) return;
    this.records.update(prev => prev.filter(r => r.student_id !== studentId));
  }

  saveBulk(): void {
    this.isSaving.set(true);
    this.saveSuccessMessage.set(null);
    this.api.saveAttendancesBulk(this.selectedDate(), this.records()).subscribe({
      next: res => {
        this.isSaving.set(false);
        this.saveSuccessMessage.set(`Presenze salvate con successo per ${res.count} studenti!`);
        setTimeout(() => this.saveSuccessMessage.set(null), 5000);
      },
      error: err => {
        this.isSaving.set(false);
        alert('Errore durante il salvataggio: ' + (err.message || 'Errore di rete'));
      }
    });
  }
}
