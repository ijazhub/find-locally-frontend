import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { BookingDetail } from './booking-detail';
import { environment } from '../../../environments/environment';
import { Booking } from '../../core/models';

describe('live quotation negotiation', () => {
  let backend: HttpTestingController;
  const booking = { id: 'b', status: 'AWAITING_CUSTOMER_APPROVAL', allowedActions: ['respondToQuotation'], provider: { id: 'p', businessName: 'Studio' }, service: { id: 's', name: 'Service', price: { amount: 10000, currency: 'INR' } }, startsAt: '2030-01-01T10:00:00Z', quotations: [{ id: 'q', version: 2, price: { amount: 12000, currency: 'INR' }, state: 'CURRENT' }] } as Booking;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), { provide: ActivatedRoute, useValue: { snapshot: { data: {} } } }] });
    backend = TestBed.inject(HttpTestingController);
  });
  afterEach(() => backend.verify());
  function page() { const fixture = TestBed.createComponent(BookingDetail); fixture.componentRef.setInput('id', 'b'); fixture.componentInstance.booking.set(booking); return fixture.componentInstance; }
  it('submits only the current quote ID/version and prevents repeated clicks', async () => {
    const component = page();
    const action = component.act('respondToQuotation', 'ACCEPT');
    await component.act('respondToQuotation', 'ACCEPT');
    const req = backend.expectOne(environment.apiUrl + '/bookings/b/quotation-response');
    expect(req.request.body).toEqual({ quotationId: 'q', version: 2, decision: 'ACCEPT' });
    expect(req.request.headers.get('Idempotency-Key')).toBeTruthy();
    req.flush({ ...booking, status: 'CONFIRMED', agreedPrice: { amount: 12000, currency: 'INR' } });
    await action; expect(component.booking()?.status).toBe('CONFIRMED');
  });
  it('refreshes authoritative details after a stale quotation conflict', async () => {
    const component = page(); component.reason = 'Saved input';
    const action = component.act('respondToQuotation', 'ACCEPT');
    backend.expectOne(environment.apiUrl + '/bookings/b/quotation-response').flush({ detail: 'Quotation superseded. Review the latest quote.' }, { status: 409, statusText: 'Conflict' });
    await Promise.resolve();
    backend.expectOne(environment.apiUrl + '/bookings/b').flush({ ...booking, status: 'EXPIRED', allowedActions: [] });
    await action; expect(component.booking()?.status).toBe('EXPIRED'); expect(component.error()).toContain('superseded'); expect(component.reason).toBe('Saved input');
  });
  it('keeps one idempotency key for an unchanged response retry after network failure', async () => {
    const component = page(); let action = component.act('respondToQuotation', 'ACCEPT');
    let req = backend.expectOne(environment.apiUrl + '/bookings/b/quotation-response'); const key = req.request.headers.get('Idempotency-Key');
    req.error(new ProgressEvent('error')); await action;
    action = component.act('respondToQuotation', 'ACCEPT'); req = backend.expectOne(environment.apiUrl + '/bookings/b/quotation-response');
    expect(req.request.headers.get('Idempotency-Key')).toBe(key); req.flush(booking); await action;
  });
  it('does not infer actions from booking status or unknown permission strings', async () => {
    const component = page(); component.booking.set({ ...booking, allowedActions: ['UNKNOWN'] });
    expect(component.allowed('respondToQuotation')).toBeFalse();
    await component.act('respondToQuotation', 'ACCEPT'); backend.expectNone(environment.apiUrl + '/bookings/b/quotation-response');
  });
});
