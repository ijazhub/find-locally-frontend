import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthResponse, LoginRequest, RegisterRequest, UserProfile } from './models';
import { session } from './session';
import { sessionErrorMessage } from './session-error';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private url = environment.apiUrl;

  user = signal<UserProfile | null>(null);
  restorationFailed = signal(false);
  restorationError = signal('');
  /** Resolves once the stored session (if any) has been checked; guards await it. */
  ready: Promise<void> = session.access ? Promise.resolve().then(() => this.loadMe()).catch(() => {}) : Promise.resolve();

  isBusiness = () => this.user()?.accountType === 'BUSINESS';
  landingUrl = () => this.isBusiness() ? (this.user()?.onboardingStatus === 'VERIFIED' ? '/business/dashboard' : '/business/onboarding') : '/';
  canVisit(url: string) {
    if (!url.startsWith('/') || url.startsWith('//') || url.includes('\\')) return false;
    const path = url.split(/[?#]/)[0];
    return this.isBusiness() ? path.startsWith('/business/') || path === '/messages' || path.startsWith('/messages/') || path === '/profile' : !path.startsWith('/business/');
  }

  loadMe(): Promise<void> {
    return firstValueFrom(this.http.get<UserProfile>(`${this.url}/users/me`))
      .then(u => { this.user.set(u); this.restorationFailed.set(false); this.restorationError.set(''); })
      .catch(error => {
        if (error.status === 401) { this.expire(); return; }
        this.restorationFailed.set(true); this.restorationError.set(sessionErrorMessage(error));
        throw error;
      });
  }

  login(credentials: LoginRequest) {
    return this.authenticate('login', credentials);
  }

  register(details: RegisterRequest) {
    return this.authenticate('register', details);
  }

  forgotPassword(email: string) {
    return firstValueFrom(this.http.post<void>(`${this.url}/auth/forgot-password`, { email }));
  }

  async resetPassword(token: string, newPassword: string) {
    await firstValueFrom(this.http.post<void>(`${this.url}/auth/reset-password`, { token, newPassword }));
    this.expire();
  }

  private async authenticate(action: 'login' | 'register', body: LoginRequest | RegisterRequest) {
    const res = await firstValueFrom(this.http.post<AuthResponse>(`${this.url}/auth/${action}`, body));
    session.set({ accessToken: res.accessToken, refreshToken: res.refreshToken });
    this.user.set(res.user);
    this.restorationFailed.set(false); this.restorationError.set('');
  }

  expire() { session.clear(); this.user.set(null); this.restorationFailed.set(false); this.restorationError.set(''); }

  async logout() {
    await firstValueFrom(this.http.post(`${this.url}/auth/logout`, {})).catch(() => {});
    this.expire();
    this.router.navigateByUrl('/');
  }
}
