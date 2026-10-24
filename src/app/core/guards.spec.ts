import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, provideRouter } from '@angular/router';
import { AuthService } from './auth.service';
import { authGuard, businessGuard } from './guards';
import { session } from './session';

describe('route authentication', () => {
  let auth: { ready: Promise<void>; user: () => object | null; isBusiness: () => boolean };
  beforeEach(() => {
    session.clear();
    auth = { ready: Promise.resolve(), user: () => null, isBusiness: () => false };
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: AuthService, useValue: auth }] });
  });
  afterEach(() => session.clear());

  const check = () => TestBed.runInInjectionContext(() => authGuard(
    {} as ActivatedRouteSnapshot, { url: '/providers?q=makeup' } as RouterStateSnapshot,
  ));

  it('preserves the requested URL when login is needed', async () => {
    const result = await check();
    expect(TestBed.inject(Router).serializeUrl(result as any)).toBe('/login?returnUrl=%2Fproviders%3Fq%3Dmakeup');
  });

  it('waits for session restoration before allowing navigation', async () => {
    let resolve!: () => void;
    auth.ready = new Promise<void>(done => { resolve = done; });
    const result = check();
    session.set({ accessToken: 'access', refreshToken: 'refresh' });
    auth.user = () => ({ id: 'user' });
    resolve();
    expect(await result).toBeTrue();
  });

  it('requires an access token even when a profile is still in memory', async () => {
    auth.user = () => ({ id: 'user' });
    expect(await check()).not.toBeTrue();
  });

  it('sends non-business users to onboarding', async () => {
    const result = await TestBed.runInInjectionContext(() => businessGuard(
      {} as ActivatedRouteSnapshot, {} as RouterStateSnapshot,
    ));
    expect(TestBed.inject(Router).serializeUrl(result as any)).toBe('/business/onboarding');
  });
});
