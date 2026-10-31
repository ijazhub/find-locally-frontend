import { BusinessTimePipe } from '../../shared/business-time.pipe';
import { Component, inject, input, OnChanges, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { Booking, STATUS_LABEL } from '../../core/models';
import { problemMessage } from '../../core/problem';
import { InrPipe } from '../../shared/inr.pipe';

@Component({ imports: [BusinessTimePipe, FormsModule, MatButtonModule, RouterLink, InrPipe], templateUrl: './booking-detail.html' })
export class BookingDetail implements OnChanges {
  id = input.required<string>();
  api = inject(ApiService); router = inject(Router);
  business = !!inject(ActivatedRoute).snapshot.data['business'];
  booking = signal<Booking | null>(null); loading = signal(false); pending = signal(false); error = signal(''); notice = signal('');
  label = STATUS_LABEL; quoteAmount: number | null = null; reason = '';
  private keys = new Map<string, string>();
  ngOnChanges() { this.booking.set(null); this.quoteAmount = null; this.reason = ''; this.keys.clear(); void this.load(); }
  async load() {
    const id = this.id(); this.loading.set(true); this.error.set('');
    try { const result = await firstValueFrom(this.api.booking(id)); if (this.id() === id) this.booking.set(result); }
    catch (e) { if (this.id() === id) this.error.set(problemMessage(e, 'Could not load this booking. It may be unavailable or forbidden.')); }
    finally { if (this.id() === id) this.loading.set(false); }
  }
  // Conservative mapping: only explicit server action names matching spec operationIds are enabled.
  allowed(operationId: string) { return !!this.booking()?.allowedActions?.includes(operationId); }
  current = () => this.booking()?.quotations?.find(q => q.state === 'CURRENT');
  private key(payload: object) { const body = JSON.stringify(payload); if (!this.keys.has(body)) this.keys.set(body, crypto.randomUUID()); return this.keys.get(body)!; }
  async act(operation: 'acceptBooking' | 'declineBooking' | 'completeBooking' | 'cancelBooking' | 'issueQuotation' | 'respondToQuotation', decision?: 'ACCEPT' | 'REJECT') {
    const booking = this.booking(); if (!booking || this.pending() || !this.allowed(operation)) return;
    this.pending.set(true); this.error.set(''); this.notice.set('');
    try {
      let request;
      if (operation === 'issueQuotation') {
        if (this.quoteAmount === null || this.quoteAmount < 0 || !Number.isSafeInteger(Math.round(this.quoteAmount * 100))) throw new Error('Enter a valid quotation price.');
        const price = { amount: Math.round(this.quoteAmount * 100), currency: booking.proposedPrice?.currency || booking.listedPrice?.currency || booking.service.price.currency };
        request = this.api.issueQuotation(booking.id, price, this.key({ id: booking.id, operation, price }));
      } else if (operation === 'respondToQuotation') {
        const quote = this.current(); if (!quote || !decision) return;
        const body = { quotationId: quote.id, version: quote.version, decision, ...(this.reason ? { reason: this.reason } : {}) };
        request = this.api.respondToQuotation(booking.id, body, this.key({ id: booking.id, ...body }));
      } else if (operation === 'cancelBooking') request = this.api.cancelBooking(booking.id, this.reason);
      else request = this.api.bookingAction(booking.id, operation === 'acceptBooking' ? 'accept' : operation === 'declineBooking' ? 'decline' : 'complete', this.reason);
      const updated = await firstValueFrom(request);
      if (this.id() === booking.id) { this.booking.set(updated); this.keys.clear(); this.notice.set('Booking updated.'); }
    } catch (e: any) {
      if (e.status === 409) { await this.load(); this.error.set(problemMessage(e, 'The request or slot changed. Latest details are shown; review them before trying again.')); }
      else this.error.set(e instanceof Error && !(e as any).status ? e.message : problemMessage(e));
    } finally { this.pending.set(false); }
  }
  async chat() {
    const b = this.booking(); if (!b || this.pending()) return;
    this.pending.set(true);
    try { const id = b.conversationId || (await firstValueFrom(this.api.startConversation(b.provider.id, b.id))).id; await this.router.navigate(['/messages', id]); }
    catch (e) { this.error.set(problemMessage(e)); } finally { this.pending.set(false); }
  }
}
