import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { session } from './session';

export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.ready;
  return session.access && auth.user() ? true : router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

export const businessGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.ready;
  return auth.isBusiness() ? true : router.createUrlTree(['/business/onboarding']);
};
