import { Routes } from '@angular/router';
const screen = () => import('./preview').then(m => m.Preview);
export const previewRoutes: Routes = [
  { path: '', pathMatch: 'full', data: { view: 'entry' }, loadComponent: screen },
  ...(['customer', 'provider'] as const).flatMap(persona => {
    const role = persona === 'provider' ? 'BUSINESS' : 'CUSTOMER';
    const common = [
      { path: '', view: persona === 'provider' ? 'dashboard' : 'discover' },
      { path: 'profile', view: 'profile' }, { path: 'requests', view: 'requests' },
      { path: 'requests/:id', view: 'detail' }, { path: 'messages', view: 'messages' },
    ];
    const specific = persona === 'provider' ? [
      { path: 'edit', view: 'edit' }, { path: 'services', view: 'services' },
      { path: 'availability', view: 'availability' }, { path: 'onboarding', view: 'onboarding' },
    ] : [{ path: 'book', view: 'book' }];
    return [...common, ...specific].map(({ path, view }) => ({
      path: path ? `${persona}/${path}` : persona, pathMatch: 'full' as const,
      data: { role, view }, loadComponent: screen,
    }));
  }),
  { path: '**', redirectTo: '' },
];
