import { HttpBackend, HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { TokenPair } from './models';
import { session } from './session';

@Injectable({ providedIn: 'root' })
export class TokenService {
  // Refresh bypasses interceptors to prevent recursive refresh requests.
  private http = new HttpClient(inject(HttpBackend));
  private pending?: Promise<string>;

  refresh(): Promise<string> {
    if (this.pending) return this.pending;
    const refreshToken = session.refresh;
    if (!refreshToken) return Promise.reject(new Error('No refresh token'));
    this.pending = firstValueFrom(this.http.post<TokenPair>(
      `${environment.apiUrl}/auth/refresh`, { refreshToken },
    )).then(tokens => {
      // A logout or a new login must not be overwritten by an older refresh.
      if (session.refresh !== refreshToken) throw new Error('Session changed');
      session.set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
      return tokens.accessToken;
    }).finally(() => { this.pending = undefined; });
    return this.pending;
  }
}
