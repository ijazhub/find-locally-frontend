import { HttpInterceptorFn } from '@angular/common/http';
import { Injector, inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { session } from './session';
import { TokenService } from './token.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const injector = inject(Injector);
  const token = session.access;
  const base = environment.apiUrl.replace(/\/$/, '');
  const isApi = req.url === base || req.url.startsWith(`${base}/`) || req.url.startsWith(`${base}?`);
  const isPublicAuth = ['login', 'register', 'refresh', 'forgot-password', 'reset-password'].some(
    action => req.url.split('?')[0] === `${base}/auth/${action}`,
  );
  const redirect = () => {
    injector.get(AuthService).expire();
    const router = injector.get(Router);
    if (!router.url.startsWith('/login')) {
      router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
    }
  };
  if (isApi && !isPublicAuth && !token) {
    redirect();
    return throwError(() => new Error('Login required'));
  }
  if (isApi && token && !isPublicAuth) req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  return next(req).pipe(
    catchError(err => {
      if (isApi && !isPublicAuth && err.status === 401 && token) {
        if (!session.access) return throwError(() => err);
        const refreshed = session.access !== token
          ? Promise.resolve(session.access!) : injector.get(TokenService).refresh();
        return from(refreshed).pipe(
          catchError(refreshError => {
            if (session.access === token) redirect();
            return throwError(() => refreshError);
          }),
          switchMap(access => next(req.clone({ setHeaders: { Authorization: `Bearer ${access}` } })).pipe(
            catchError(retryError => {
              if (retryError.status === 401 && session.access === access) redirect();
              return throwError(() => retryError);
            }),
          )),
        );
      }
      return throwError(() => err);
    }),
  );
};
