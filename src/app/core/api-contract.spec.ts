import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { provideRouter } from '@angular/router';
import { session } from './session';
import { environment } from '../../environments/environment';

describe('supplied API contract', () => {
  let api: ApiService; let backend: HttpTestingController;
  beforeEach(() => {
    session.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])] });
    api = TestBed.inject(ApiService); backend = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { backend.verify(); session.clear(); });
  it('keeps saved credentials after a transient account lookup failure and clears the error on recovery', async () => {
    const auth = TestBed.inject(AuthService);
    session.set({ accessToken: 'a', refreshToken: 'r' });
    const result = auth.loadMe(); const rejected = expectAsync(result).toBeRejected();
    backend.expectOne(environment.apiUrl + '/users/me').flush({}, { status: 502, statusText: 'Bad Gateway' });
    await rejected;
    expect(session.access).toBe('a'); expect(auth.restorationError()).toContain('HTTP 502');
    const retry = auth.loadMe(); backend.expectOne(environment.apiUrl + '/users/me').flush({ id: 'u', accountType: 'CUSTOMER', onboardingStatus: 'NOT_APPLICABLE' });
    await retry; expect(auth.restorationFailed()).toBeFalse(); expect(auth.restorationError()).toBe('');
  });
  it('sends proposal money and preserves an explicitly supplied idempotency key', () => {
    const body = { providerId: 'p', serviceId: 's', startsAt: '2030-01-01T10:00:00Z', fulfilment: 'AT_STUDIO' as const, proposedPrice: { amount: 125000, currency: 'INR' } };
    api.createBooking(body, 'same-key').subscribe();
    const req = backend.expectOne(environment.apiUrl + '/bookings');
    expect(req.request.body).toEqual(body); expect(req.request.headers.get('Idempotency-Key')).toBe('same-key'); req.flush({});
  });
  it('issues quotations with price only and responds with quote ID/version/decision', () => {
    api.issueQuotation('booking', { amount: 150000, currency: 'INR' }, 'quote-key').subscribe();
    const issue = backend.expectOne(environment.apiUrl + '/business/bookings/booking/quotations');
    expect(issue.request.body).toEqual({ price: { amount: 150000, currency: 'INR' } }); expect(issue.request.headers.get('Idempotency-Key')).toBe('quote-key'); issue.flush({});
    const body = { quotationId: 'q', version: 2, decision: 'ACCEPT' as const };
    api.respondToQuotation('booking', body, 'response-key').subscribe();
    const respond = backend.expectOne(environment.apiUrl + '/bookings/booking/quotation-response');
    expect(respond.request.body).toEqual(body); expect(respond.request.headers.get('Idempotency-Key')).toBe('response-key'); respond.flush({});
  });
  it('uses separate reel presentation and publication fields when attaching media', () => {
    api.addMedia('upload', { presentationFormat: 'REEL', publicationState: 'DRAFT', caption: 'My work', coverUploadId: 'cover' }).subscribe();
    const req = backend.expectOne(environment.apiUrl + '/business/media');
    expect(req.request.body).toEqual({ uploadId: 'upload', presentationFormat: 'REEL', publicationState: 'DRAFT', caption: 'My work', coverUploadId: 'cover' }); req.flush({});
  });
  it('uses accountType rather than deprecated roles and preserves role-appropriate deep links', async () => {
    const auth = TestBed.inject(AuthService);
    auth.restorationFailed.set(true);
    const promise = auth.register({ email: 'test@example.com', password: 'secure password', accountType: 'BUSINESS' });
    const req = backend.expectOne(environment.apiUrl + '/auth/register'); expect(req.request.body.accountType).toBe('BUSINESS');
    req.flush({ accessToken: 'a', refreshToken: 'r', user: { id: 'u', accountType: 'BUSINESS', onboardingStatus: 'VERIFIED', roles: ['CUSTOMER'] } }); await promise;
    expect(auth.isBusiness()).toBeTrue(); expect(auth.landingUrl()).toBe('/business/dashboard');
    expect(auth.restorationFailed()).toBeFalse();
    expect(auth.canVisit('/business/bookings/b')).toBeTrue(); expect(auth.canVisit('/book/p')).toBeFalse(); expect(auth.canVisit('//example.com')).toBeFalse();
  });
});
