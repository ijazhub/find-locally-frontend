import { Routes } from '@angular/router';
import { authGuard, businessGuard } from './core/guards';

export const routes: Routes = [
  { path: '', pathMatch: 'full', canActivate: [authGuard], loadComponent: () => import('./pages/home/home').then(m => m.Home) },
  { path: 'login', loadComponent: () => import('./pages/login/login').then(m => m.Login) },
  { path: 'forgot-password', loadComponent: () => import('./pages/password-recovery/password-recovery').then(m => m.PasswordRecovery) },
  { path: 'reset-password', data: { reset: true }, loadComponent: () => import('./pages/password-recovery/password-recovery').then(m => m.PasswordRecovery) },
  { path: 'providers', canActivate: [authGuard], loadComponent: () => import('./pages/browse/browse').then(m => m.Browse) },
  { path: 'providers/:id/profile', canActivate: [authGuard], loadComponent: () => import('./pages/provider-profile/provider-profile').then(m => m.ProviderProfile) },
  { path: 'providers/:id', canActivate: [authGuard], loadComponent: () => import('./pages/provider/provider').then(m => m.Provider) },
  { path: 'book/:providerId', canActivate: [authGuard], loadComponent: () => import('./pages/book/book').then(m => m.Book) },
  { path: 'bookings', canActivate: [authGuard], loadComponent: () => import('./pages/bookings/bookings').then(m => m.Bookings) },
  { path: 'saved', canActivate: [authGuard], loadComponent: () => import('./pages/saved/saved').then(m => m.Saved) },
  { path: 'profile', canActivate: [authGuard], loadComponent: () => import('./pages/profile/profile').then(m => m.Profile) },
  { path: 'messages', canActivate: [authGuard], loadComponent: () => import('./pages/messages/messages').then(m => m.Messages) },
  { path: 'messages/:id', canActivate: [authGuard], loadComponent: () => import('./pages/messages/messages').then(m => m.Messages) },
  { path: 'assistant', canActivate: [authGuard], loadComponent: () => import('./pages/assistant/assistant').then(m => m.Assistant) },
  { path: 'business/onboarding', canActivate: [authGuard], loadComponent: () => import('./pages/onboarding/onboarding').then(m => m.Onboarding) },
  { path: 'business/dashboard', canActivate: [authGuard, businessGuard], loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.Dashboard) },
  { path: '**', redirectTo: '' },
];
