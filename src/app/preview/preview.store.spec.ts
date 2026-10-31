import { PreviewStore } from './preview.store';
import { previewRoutes } from './preview.routes';

describe('FindLocally isolated screen fixtures', () => {
  let store: PreviewStore;
  beforeEach(() => { store = new PreviewStore(); });

  it('keeps customer and provider screen routes separate', () => {
    expect(previewRoutes.find(r => r.path === 'customer/edit')).toBeUndefined();
    expect(previewRoutes.find(r => r.path === 'provider/book')).toBeUndefined();
    expect(previewRoutes.find(r => r.path === 'provider')?.data?.['role']).toBe('BUSINESS');
    expect(previewRoutes.find(r => r.path === 'customer')?.data?.['role']).toBe('CUSTOMER');
  });
  it('treats a quotation and a chat reply as unconfirmed', () => {
    store.action('request-101', 'BUSINESS', 'quote', 1, undefined, { amount: 160000, note: 'Seasonal flowers', hours: 24 });
    store.send('request-101', 'Mira', 'That sounds good!');
    const r = store.requests().find(r => r.id === 'request-101')!;
    expect(r.status).toBe('AWAITING_CUSTOMER_APPROVAL');
    expect(r.agreed).toBeUndefined();
    expect(r.quotes[0].amount).toBe(160000);
  });
  it('accepts only the current quotation ID and version', () => {
    const r = store.requests().find(r => r.id === 'request-102')!;
    expect(() => store.action(r.id, 'CUSTOMER', 'acceptQuote', r.version, { id: 'stale', version: 1 })).toThrowError(/changed/);
    store.action(r.id, 'CUSTOMER', 'acceptQuote', r.version, r.quotes[0]);
    const confirmed = store.requests().find(item => item.id === r.id)!;
    expect(confirmed.status).toBe('CONFIRMED');
    expect(confirmed.agreed).toBe(155000);
  });
  it('preserves quotation history and rejects stale request versions', () => {
    store.action('request-102', 'BUSINESS', 'quote', 1, undefined, { amount: 165000, note: 'Updated scope', hours: 12 });
    const r = store.requests().find(r => r.id === 'request-102')!;
    expect(r.quotes.length).toBe(2);
    expect(() => store.action(r.id, 'CUSTOMER', 'acceptQuote', 1, r.quotes[0])).toThrowError(/changed/);
    expect(() => store.action(r.id, 'CUSTOMER', 'acceptQuote', r.version, r.quotes[0])).toThrowError(/quotation has changed/);
  });
  it('expires an outdated quotation instead of confirming it', () => {
    store.requests.update(list => list.map(r => r.id === 'request-102' ? { ...r, quotes: r.quotes.map(q => ({ ...q, expiresAt: '2000-01-01T00:00:00Z' })) } : r));
    const r = store.requests().find(r => r.id === 'request-102')!;
    expect(() => store.action(r.id, 'CUSTOMER', 'acceptQuote', r.version, r.quotes[0])).toThrowError(/expired/);
    expect(store.requests().find(item => item.id === r.id)?.status).toBe('EXPIRED');
  });
  it('uses role-permitted actions and prevents repeated confirmation', () => {
    expect(() => store.action('request-101', 'CUSTOMER', 'accept', 1)).toThrowError(/no longer available/);
    store.action('request-101', 'BUSINESS', 'accept', 1);
    expect(() => store.action('request-101', 'BUSINESS', 'accept', 1)).toThrowError(/changed/);
  });
  it('rejects quotations and isolates messages between bookings', () => {
    const r = store.requests().find(r => r.id === 'request-102')!;
    store.action(r.id, 'CUSTOMER', 'rejectQuote', r.version, r.quotes[0]);
    expect(store.requests().find(r => r.id === 'request-102')?.status).toBe('DECLINED');
    store.send('request-101', 'Mira', 'Different booking');
    expect(store.messages()['request-102'].some(m => m.text === 'Different booking')).toBeFalse();
  });
  it('deduplicates request submission and rejects an occupied slot', () => {
    const body = { service: 'Signature bouquet', startsAt: '2030-01-01T09:00:00+05:30', fulfilment: 'AT_STUDIO', address: '', note: '', proposal: 120000 };
    const first = store.create(body, 'stable-key');
    expect(store.create(body, 'stable-key')).toBe(first);
    expect(store.requests().filter(r => r.id === 'stable-key').length).toBe(1);
    expect(() => store.create(body, 'another-key')).toThrowError(/slot is held or booked/);
  });
});
