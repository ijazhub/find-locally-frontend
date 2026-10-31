import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideNativeDateAdapter } from '@angular/material/core';
import { Book } from './book';
import { environment } from '../../../environments/environment';

describe('live booking requests', () => {
  let backend: HttpTestingController;
  beforeEach(() => { TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideNativeDateAdapter()] }); backend = TestBed.inject(HttpTestingController); });
  afterEach(() => backend.verify());
  function page() {
    const fixture = TestBed.createComponent(Book); fixture.componentRef.setInput('providerId', 'p');
    const component = fixture.componentInstance;
    component.service.set({ id: 's', name: 'Service', durationMinutes: 60, price: { amount: 150000, currency: 'INR' }, fulfilment: ['AT_STUDIO'], active: true });
    component.slot.set({ startsAt: '2030-01-01T10:00:00+05:30', endsAt: '2030-01-01T11:00:00+05:30', available: true });
    component.fulfilment = 'AT_STUDIO'; component.proposedPrice = 1250; component.note = 'Keep my notes'; return component;
  }
  it('submits UTC instants and paise proposals, blocks duplicate clicks and reuses a retry key', () => {
    const component = page(); component.confirm(); component.confirm();
    let req = backend.expectOne(environment.apiUrl + '/bookings');
    expect(req.request.body.proposedPrice).toEqual({ amount: 125000, currency: 'INR' }); expect(req.request.body.startsAt).toBe('2030-01-01T04:30:00.000Z');
    const key = req.request.headers.get('Idempotency-Key'); req.error(new ProgressEvent('error'));
    component.confirm(); req = backend.expectOne(environment.apiUrl + '/bookings'); expect(req.request.headers.get('Idempotency-Key')).toBe(key);
    req.flush({ status: 'AWAITING_CONFIRMATION' }); expect(component.done()).toBeTrue();
  });
  it('clears a conflicted slot but preserves the proposal and notes', () => {
    const component = page(); component.confirm();
    backend.expectOne(environment.apiUrl + '/bookings').flush({ detail: 'This time is no longer available.' }, { status: 409, statusText: 'Conflict' });
    expect(component.slot()).toBeNull(); expect(component.proposedPrice).toBe(1250); expect(component.note).toBe('Keep my notes'); expect(component.error()).toContain('no longer available');
  });
});
