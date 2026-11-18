import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-[#1e2a5e] flex items-center justify-center p-4">
      <div class="max-w-lg w-full bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl p-8 border border-white/20">
        
        <!-- Logo Primola Ufficiale & Titolo -->
        <div class="text-center mb-6 flex flex-col items-center">
          <div class="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 mb-3 flex items-center justify-center">
            <img 
              src="assets/images/logo-primola-tight.png" 
              alt="Logo Primola" 
              class="h-12 w-auto object-contain"
            />
          </div>
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#3857F1]/10 text-[#3857F1] border border-[#3857F1]/20 mt-1">
            Registrazione Docente
          </span>
          <h1 class="text-xl font-bold text-slate-800 mt-2">Crea un nuovo account</h1>
          <p class="text-slate-500 text-xs mt-1">Inserisci i tuoi dati per richiedere l'accesso alla piattaforma</p>
        </div>

        @if (registrationSuccess()) {
          <!-- Stato: Registrazione Inviata con Successo -->
          <div class="text-center py-6 px-2 space-y-4">
            <div class="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <div>
              <h2 class="text-lg font-bold text-slate-800">Registrazione Inviata!</h2>
              <p class="text-sm text-slate-600 mt-2 leading-relaxed">
                Il tuo account docente è stato registrato ed è attualmente 
                <span class="font-semibold text-amber-600">in attesa di autorizzazione</span> da parte dell'amministratore.
              </p>
              <p class="text-xs text-slate-400 mt-2">
                Riceverai notifica o abilitazione prima di poter effettuare l'accesso.
              </p>
            </div>

            <div class="pt-4">
              <a
                routerLink="/login"
                class="inline-flex items-center justify-center px-6 py-3 bg-[#3857F1] hover:bg-blue-700 text-white font-semibold rounded-xl text-sm shadow-md transition-all"
              >
                Torna al Login
              </a>
            </div>
          </div>
        } @else {
          <!-- Messaggio di errore -->
          @if (errorMessage()) {
            <div class="mb-5 p-3.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-center space-x-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 flex-shrink-0 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
              <span>{{ errorMessage() }}</span>
            </div>
          }

          <!-- Form di Registrazione -->
          <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Nome *</label>
                <input
                  type="text"
                  formControlName="first_name"
                  placeholder="Mario"
                  class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#3857F1] focus:border-transparent transition text-sm"
                />
                @if (registerForm.get('first_name')?.touched && registerForm.get('first_name')?.invalid) {
                  <span class="text-[11px] text-red-500 mt-1 block">Il nome è obbligatorio.</span>
                }
              </div>

              <div>
                <label class="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Cognome *</label>
                <input
                  type="text"
                  formControlName="last_name"
                  placeholder="Rossi"
                  class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#3857F1] focus:border-transparent transition text-sm"
                />
                @if (registerForm.get('last_name')?.touched && registerForm.get('last_name')?.invalid) {
                  <span class="text-[11px] text-red-500 mt-1 block">Il cognome è obbligatorio.</span>
                }
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Email *</label>
              <input
                type="email"
                formControlName="email"
                placeholder="mario.rossi@primola.it"
                class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#3857F1] focus:border-transparent transition text-sm"
              />
              @if (registerForm.get('email')?.touched && registerForm.get('email')?.invalid) {
                <span class="text-[11px] text-red-500 mt-1 block">Inserisci un'email valida.</span>
              }
            </div>

            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Telefono (facoltativo)</label>
              <input
                type="tel"
                formControlName="phone"
                placeholder="+39 333 1234567"
                class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#3857F1] focus:border-transparent transition text-sm"
              />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Password *</label>
                <input
                  type="password"
                  formControlName="password"
                  placeholder="Minimo 6 caratteri"
                  class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#3857F1] focus:border-transparent transition text-sm"
                />
                @if (registerForm.get('password')?.touched && registerForm.get('password')?.invalid) {
                  <span class="text-[11px] text-red-500 mt-1 block">Minimo 6 caratteri.</span>
                }
              </div>

              <div>
                <label class="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Conferma Password *</label>
                <input
                  type="password"
                  formControlName="confirm_password"
                  placeholder="Ripeti password"
                  class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#3857F1] focus:border-transparent transition text-sm"
                />
                @if (registerForm.get('confirm_password')?.touched && (registerForm.get('confirm_password')?.value !== registerForm.get('password')?.value)) {
                  <span class="text-[11px] text-red-500 mt-1 block">Le password non coincidono.</span>
                }
              </div>
            </div>

            <button
              type="submit"
              [disabled]="isLoading() || registerForm.invalid || (registerForm.get('confirm_password')?.value !== registerForm.get('password')?.value)"
              class="w-full mt-2 py-3.5 px-6 bg-gradient-to-r from-[#3857F1] to-[#2640C4] hover:from-[#2e4be0] hover:to-[#1d33a6] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-lg shadow-blue-600/25 flex items-center justify-center space-x-2 transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              @if (isLoading()) {
                <svg class="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                <span>Invio richiesta in corso...</span>
              } @else {
                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                <span>Registrati come Docente</span>
              }
            </button>
          </form>

          <!-- Link Torna al Login -->
          <div class="mt-6 pt-5 border-t border-slate-100 text-center">
            <p class="text-xs text-slate-500">
              Hai già un account?
              <a
                routerLink="/login"
                class="font-semibold text-[#3857F1] hover:text-blue-700 hover:underline transition-colors ml-1"
              >
                Accedi qui
              </a>
            </p>
          </div>
        }

      </div>
    </div>
  `
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  registerForm = this.fb.group({
    first_name: ['', [Validators.required]],
    last_name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirm_password: ['', [Validators.required]]
  });

  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  registrationSuccess = signal(false);

  onSubmit() {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    const { first_name, last_name, email, phone, password, confirm_password } = this.registerForm.value;

    if (password !== confirm_password) {
      this.errorMessage.set('Le password inserite non coincidono.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.authService.register({
      first_name: first_name!.trim(),
      last_name: last_name!.trim(),
      email: email!.toLowerCase().trim(),
      phone: phone ? phone.trim() : undefined,
      password: password!
    }).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.registrationSuccess.set(true);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.error || 'Errore durante la registrazione. Riprova più tardi.');
      }
    });
  }
}
