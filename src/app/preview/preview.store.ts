import { Injectable, signal } from '@angular/core';

export type AccountType = 'CUSTOMER' | 'BUSINESS';
export type Status = 'AWAITING_CONFIRMATION' | 'AWAITING_CUSTOMER_APPROVAL' | 'CONFIRMED' | 'DECLINED' | 'CANCELLED' | 'EXPIRED' | 'COMPLETED';
export type Action = 'accept' | 'quote' | 'decline' | 'acceptQuote' | 'rejectQuote' | 'cancel' | 'complete';
export interface PreviewService { id: string; name: string; description: string; minutes: number; price: number; active: boolean; fulfilment: string[] }
export interface Quote { id: string; version: number; amount: number; note: string; expiresAt: string }
export interface Request {
  id: string; customer: string; service: string; startsAt: string; fulfilment: string; address: string;
  note: string; proposal: number; status: Status; version: number; quotes: Quote[]; agreed?: number;
  allowed: Record<AccountType, Action[]>;
}
export interface Media { id: string; type: 'PHOTO' | 'VIDEO' | 'REEL'; caption: string; url: string; status: 'PUBLISHED' | 'PROCESSING' | 'FAILED'; progress: number; cover?: string; local?: boolean }
export const labels: Record<Status, string> = {
  AWAITING_CONFIRMATION: 'Awaiting confirmation', AWAITING_CUSTOMER_APPROVAL: 'Awaiting customer approval',
  CONFIRMED: 'Confirmed', DECLINED: 'Declined', CANCELLED: 'Cancelled', EXPIRED: 'Expired', COMPLETED: 'Completed',
};

// Explicit UI fixtures. These types and transitions are NOT a proposed backend contract.
const permitted = (status: Status): Request['allowed'] => ({
  CUSTOMER: status === 'AWAITING_CUSTOMER_APPROVAL' ? ['acceptQuote', 'rejectQuote', 'cancel'] :
    status === 'AWAITING_CONFIRMATION' || status === 'CONFIRMED' ? ['cancel'] : [],
  BUSINESS: status === 'AWAITING_CONFIRMATION' ? ['accept', 'quote', 'decline'] :
    status === 'AWAITING_CUSTOMER_APPROVAL' ? ['quote', 'decline'] : status === 'CONFIRMED' ? ['complete', 'cancel'] : [],
});
const stamp = (days: number, hour = 10) => {
  const date = new Date(Date.now() + days * 86400000).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  return `${date}T${String(hour).padStart(2, '0')}:00:00+05:30`;
};
@Injectable({ providedIn: 'root' })
export class PreviewStore {
  readonly timezone = 'Asia/Kolkata';
  profile = signal({ businessName: 'The Petal Studio', owner: 'Ananya Sen', category: 'Florist & event styling', location: 'Ballygunge, Kolkata', bio: 'Flowers for the everyday and the extraordinary. Thoughtful arrangements, seasonal stems, and celebrations that feel like you.', followers: 248, rating: 4.9 });
  services = signal<PreviewService[]>([
    { id: 'flowers', name: 'Signature bouquet', description: 'Seasonal flowers, hand-tied with care. Includes a consultation on colours and occasion.', minutes: 45, price: 150000, active: true, fulfilment: ['AT_STUDIO', 'DELIVERY'] },
    { id: 'event', name: 'Intimate celebration styling', description: 'A floral concept for your table, entrance, or special corner. Materials quoted after consultation.', minutes: 90, price: 650000, active: true, fulfilment: ['AT_CLIENT'] },
  ]);
  media = signal<Media[]>([
    { id: 'one', type: 'PHOTO', caption: 'A little sunshine for your table', url: '/preview/bouquet.svg', status: 'PUBLISHED', progress: 100 },
    { id: 'two', type: 'PHOTO', caption: 'Soft colours, thoughtful details', url: '/preview/stems.svg', status: 'PUBLISHED', progress: 100 },
    { id: 'three', type: 'REEL', caption: 'Behind the stems · processing', url: '', status: 'PROCESSING', progress: 100 },
  ]);
  requests = signal<Request[]>([
    this.fixture('request-101', 'Mira Das', 'AWAITING_CONFIRMATION', 0, 125000),
    this.fixture('request-102', 'Mira Das', 'AWAITING_CUSTOMER_APPROVAL', 1, 140000),
    this.fixture('request-103', 'Mira Das', 'CONFIRMED', 0, 150000),
    this.fixture('request-104', 'Mira Das', 'COMPLETED', -2, 145000),
    this.fixture('request-105', 'Mira Das', 'EXPIRED', -1, 120000),
    this.fixture('request-106', 'Mira Das', 'DECLINED', -3, 110000),
    this.fixture('request-107', 'Mira Das', 'CANCELLED', -4, 130000),
  ]);
  messages = signal<Record<string, { author: string; text: string }[]>>({
    'request-102': [{ author: 'Ananya', text: 'I can include the seasonal lilies in this quotation. Please review it in your booking details.' }],
    general: [{ author: 'Ananya', text: 'Hello! What are you celebrating?' }],
  });
  unread = signal(1);
  onboardingComplete = signal(false);
  availability = signal(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(day => ({ day, open: day !== 'SUN', from: '09:00', to: '18:00' })));
  private fixture(id: string, customer: string, status: Status, day: number, proposal: number): Request {
    return { id, customer, service: 'Signature bouquet', startsAt: stamp(day), fulfilment: 'AT_STUDIO', address: '', note: 'Soft pinks and white flowers, please.', proposal, status, version: 1,
      agreed: status === 'CONFIRMED' || status === 'COMPLETED' ? proposal : undefined,
      quotes: status === 'AWAITING_CUSTOMER_APPROVAL' ? [{ id: 'quote-102', version: 1, amount: 155000, note: 'Includes seasonal lilies and gift wrap.', expiresAt: new Date(Date.now() + 86400000).toISOString() }] : [], allowed: permitted(status) };
  }
  create(body: Pick<Request, 'service' | 'startsAt' | 'fulfilment' | 'address' | 'note' | 'proposal'>, key: string): Request {
    const existing = this.requests().find(r => r.id === key);
    if (existing) return existing;
    if (this.requests().some(r => r.startsAt === body.startsAt && ['CONFIRMED', 'AWAITING_CONFIRMATION', 'AWAITING_CUSTOMER_APPROVAL'].includes(r.status))) throw new Error('That slot is held or booked. Choose a different time.');
    const r: Request = { ...body, id: key, customer: 'Mira Das', status: 'AWAITING_CONFIRMATION', version: 1, quotes: [], allowed: permitted('AWAITING_CONFIRMATION') };
    this.requests.update(list => [r, ...list]);
    return r;
  }
  action(id: string, role: AccountType, action: Action, version: number, quote?: { id: string; version: number }, draft?: { amount: number; note: string; hours: number }) {
    const r = this.requests().find(r => r.id === id);
    if (!r || r.version !== version) throw new Error('This request has changed. The latest details are shown; review them before trying again.');
    if (!r.allowed[role].includes(action)) throw new Error('This action is no longer available. Review the current request.');
    const current = r.quotes.at(-1);
    if (action === 'acceptQuote' || action === 'rejectQuote') {
      if (!current || current.id !== quote?.id || current.version !== quote.version) throw new Error('The quotation has changed. Review the latest quotation.');
      if (new Date(current.expiresAt).getTime() <= Date.now()) {
        this.requests.update(list => list.map(x => x.id === id ? { ...x, status: 'EXPIRED', version: x.version + 1, allowed: permitted('EXPIRED') } : x));
        throw new Error('This quotation has expired. The current request has been refreshed.');
      }
    }
    let status: Status = r.status;
    let quotes = r.quotes;
    let agreed = r.agreed;
    if (action === 'quote') {
      if (!draft || !Number.isSafeInteger(draft.amount) || draft.amount <= 0 || draft.hours < 1 || draft.hours > 168) throw new Error('Enter a valid price and an expiry between 1 and 168 hours.');
      quotes = [...quotes, { id: crypto.randomUUID(), version: quotes.length + 1, amount: draft.amount, note: draft.note, expiresAt: new Date(Date.now() + draft.hours * 3600000).toISOString() }];
      status = 'AWAITING_CUSTOMER_APPROVAL';
    } else if (action === 'accept' || action === 'acceptQuote') { status = 'CONFIRMED'; agreed = action === 'accept' ? r.proposal : current!.amount; }
    else if (action === 'decline' || action === 'rejectQuote') status = 'DECLINED';
    else if (action === 'cancel') status = 'CANCELLED';
    else if (action === 'complete') status = 'COMPLETED';
    this.requests.update(list => list.map(x => x.id === id ? { ...x, status, quotes, agreed, version: x.version + 1, allowed: permitted(status) } : x));
  }
  send(context: string, author: string, text: string) {
    this.messages.update(all => ({ ...all, [context]: [...(all[context] || []), { author, text }] }));
  }
}
