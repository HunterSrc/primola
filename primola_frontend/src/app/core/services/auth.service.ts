import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { User, UserRole, ApiResponse, AuthResponseData } from '../models';

const STORAGE_KEY = 'primola_user';
const ACCESS_TOKEN_KEY = 'jwt_token';
const REFRESH_TOKEN_KEY = 'jwt_refresh_token';

// Intervallo di refresh automatico preventivo: 50 minuti (in millisecondi)
const AUTO_REFRESH_INTERVAL_MS = 50 * 60 * 1000;

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private userSignal = signal<User | null>(this.loadInitialUser());
  private refreshTimer: any = null;
  private readonly apiUrl = 'http://localhost:3000/api/auth';

  readonly currentUser = this.userSignal.asReadonly();
  readonly isAuthenticated = computed(() => !!this.userSignal());
  readonly role = computed(() => this.userSignal()?.role ?? null);
  readonly isAdmin = computed(() => this.userSignal()?.role === 'ADMIN');
  readonly isStaff = computed(() => this.userSignal()?.role === 'STAFF');

  constructor(
    private router: Router,
    private http: HttpClient
  ) {
    if (this.getToken() && this.getRefreshToken()) {
      this.scheduleTokenRefresh();
    }
  }

  private loadInitialUser(): User | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored) as User;
      }
    } catch (e) {
      console.error('Failed to parse user from localStorage', e);
    }
    return null;
  }

  loginWithCredentials(credentials: { email: string; password: string }): Observable<ApiResponse<AuthResponseData>> {
    return this.http.post<ApiResponse<AuthResponseData>>(`${this.apiUrl}/login`, credentials).pipe(
      tap(response => {
        if (response.success && response.data) {
          this.handleAuthSuccess(response.data);
        }
      })
    );
  }

  refreshToken(): Observable<ApiResponse<AuthResponseData>> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      this.logout();
      return throwError(() => new Error('Nessun refresh token disponibile'));
    }

    return this.http.post<ApiResponse<AuthResponseData>>(`${this.apiUrl}/refresh`, { refreshToken }).pipe(
      tap(response => {
        if (response.success && response.data) {
          this.handleAuthSuccess(response.data);
        }
      }),
      catchError(err => {
        this.logout();
        return throwError(() => err);
      })
    );
  }

  private handleAuthSuccess(data: AuthResponseData): void {
    const user: User = {
      id: data.user.id,
      name: `${data.user.nome} ${data.user.cognome || ''}`.trim(),
      email: data.user.email,
      role: data.user.role,
      token: data.accessToken
    };

    this.userSignal.set(user);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
    } catch (e) {
      console.error('Failed to save auth state to localStorage', e);
    }

    this.scheduleTokenRefresh();
  }

  private scheduleTokenRefresh(): void {
    this.clearRefreshTimer();
    // Esegue il refresh preventivo ogni 50 minuti per mantenere la sessione attiva
    this.refreshTimer = setTimeout(() => {
      if (this.isAuthenticated() && this.getRefreshToken()) {
        this.refreshToken().subscribe({
          next: () => console.log('Sessione JWT refreshati con successo.'),
          error: (err) => console.warn('Errore refresh token preventivo:', err)
        });
      }
    }, AUTO_REFRESH_INTERVAL_MS);
  }

  private clearRefreshTimer(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  logout(): void {
    this.clearRefreshTimer();
    this.userSignal.set(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    } catch (e) {
      console.error('Failed to clear storage', e);
    }
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return this.userSignal()?.token ?? localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }
}
