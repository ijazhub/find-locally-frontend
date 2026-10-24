import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';
import { session } from './session';

describe('authenticated API requests', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let expire: jasmine.Spy;
  let navigate: jasmine.Spy;
  const base = environment.apiUrl;

  beforeEach(() => {
    session.set({ accessToken: 'old', refreshToken: 'refresh' });
    expire = jasmine.createSpy('expire').and.callFake(() => session.clear());
    navigate = jasmine.createSpy('navigate');
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(),
      { provide: AuthService, useValue: { expire } },
      { provide: Router, useValue: { url: '/providers', navigate } },
    ] });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { backend.verify(); session.clear(); });

  it('attaches the access token only to backend requests', () => {
    http.get(`${base}/home`).subscribe();
    const api = backend.expectOne(`${base}/home`);
    expect(api.request.headers.get('Authorization')).toBe('Bearer old');
    api.flush({});
    http.put(`${base}-external/upload`, {}).subscribe();
    const external = backend.expectOne(`${base}-external/upload`);
    expect(external.request.headers.has('Authorization')).toBeFalse();
    external.flush({});
  });

  it('leaves login public and does not expire on rejected credentials', () => {
    http.post(`${base}/auth/login`, {}).subscribe({ error: () => {} });
    const req = backend.expectOne(`${base}/auth/login`);
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(expire).not.toHaveBeenCalled();
  });

  it('shares refresh between simultaneous failures and retries both requests', async () => {
    http.get(`${base}/home`).subscribe();
    http.get(`${base}/categories`).subscribe();
    backend.expectOne(`${base}/home`).flush({}, { status: 401, statusText: 'Unauthorized' });
    backend.expectOne(`${base}/categories`).flush({}, { status: 401, statusText: 'Unauthorized' });
    const refresh = backend.expectOne(`${base}/auth/refresh`);
    expect(refresh.request.body).toEqual({ refreshToken: 'refresh' });
    expect(refresh.request.headers.has('Authorization')).toBeFalse();
    refresh.flush({ accessToken: 'new', refreshToken: 'rotated', expiresIn: 3600 });
    await new Promise(resolve => setTimeout(resolve, 0));
    for (const path of ['/home', '/categories']) {
      const retry = backend.expectOne(base + path);
      expect(retry.request.headers.get('Authorization')).toBe('Bearer new');
      retry.flush({});
    }
    expect(session.refresh).toBe('rotated');
  });

  it('expires the session when refresh is rejected', async () => {
    http.get(`${base}/home`).subscribe({ error: () => {} });
    backend.expectOne(`${base}/home`).flush({}, { status: 401, statusText: 'Unauthorized' });
    backend.expectOne(`${base}/auth/refresh`).flush({}, { status: 401, statusText: 'Unauthorized' });
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(expire).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/login'], { queryParams: { returnUrl: '/providers' } });
  });

  it('blocks protected requests without a session', () => {
    session.clear();
    http.get(`${base}/home`).subscribe({ error: () => {} });
    backend.expectNone(`${base}/home`);
    expect(navigate).toHaveBeenCalled();
  });

  for (const action of ['forgot-password', 'reset-password']) {
    it(`allows ${action} without a session or bearer token`, () => {
      session.clear();
      http.post(`${base}/auth/${action}`, {}).subscribe();
      const req = backend.expectOne(`${base}/auth/${action}`);
      expect(req.request.headers.has('Authorization')).toBeFalse();
      req.flush(null, { status: action === 'forgot-password' ? 202 : 204, statusText: 'Success' });
      expect(navigate).not.toHaveBeenCalled();
    });
  }
});
