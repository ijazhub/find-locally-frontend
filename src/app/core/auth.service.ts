import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthResponse, LoginRequest, RegisterRequest, UserProfile } from './models';
import { session } from './session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private url = environment.apiUrl;

  user = signal<UserProfile | null>(null);
  /** Resolves once the stored session (if any) has been checked; guards await it. */
  ready: Promise<void> = session.access ? Promise.resolve().then(() => this.loadMe()) : Promise.resolve();

  isBusiness = () => !!this.user()?.roles.includes('BUSINESS');

  loadMe(): Promise<void> {
    return firstValueFrom(this.http.get<UserProfile>(`${this.url}/users/me`))
      .then(u => this.user.set(u))
      .catch(() => this.expire());
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
  }

  expire() { session.clear(); this.user.set(null); }

  async logout() {
    await firstValueFrom(this.http.post(`${this.url}/auth/logout`, {})).catch(() => {});
    this.expire();
    this.router.navigateByUrl('/');
  }
}
