import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { Booking, CartItemInput, Service, STATUS_LABEL } from '../../core/models';
import { InrPipe } from '../../shared/inr.pipe';

@Component({
  selector: 'app-bookings',
  imports: [DatePipe, FormsModule, RouterLink, MatButtonModule, MatButtonToggleModule, MatFormFieldModule, MatInputModule, MatSelectModule, InrPipe],
  templateUrl: './bookings.html',
  styleUrl: './bookings.scss',
})
export class Bookings implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);
  label = STATUS_LABEL;
  tab = signal('UPCOMING');
  bookings = signal<Booking[]>([]);
  summary = signal<any>(null);
  cart = signal<any>(null);
  drafts: Record<string, { rating: number; text: string }> = {};
  editing = signal<string | null>(null);
  services = signal<Service[]>([]);
  saving = signal(false);
  cartError = signal('');
  cartDraft = { providerId: '', serviceId: '', startsAt: '', fulfilment: '' };

  editItem(item: any) {
    this.cartError.set('');
    this.services.set([]);
    this.editing.set(item.id);
    const date = item.startsAt ? new Date(item.startsAt) : null;
    const localDate = date ? new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '';
    this.cartDraft = { providerId: item.provider.id, serviceId: item.service.id,
      startsAt: localDate, fulfilment: item.fulfilment ?? '' };
    this.api.provider(item.provider.id).subscribe({
      next: provider => this.services.set(provider.services),
      error: () => this.cartError.set('Could not load services. Please try again.'),
    });
  }

  saveItem() {
    const id = this.editing();
    if (!id || this.saving()) return;
    const draft = this.cartDraft;
    const date = draft.startsAt ? new Date(draft.startsAt) : null;
    if (date && !Number.isFinite(date.getTime())) {
      this.cartError.set('Enter a valid date and time.');
      return;
    }
    const body: CartItemInput = { providerId: draft.providerId, serviceId: draft.serviceId };
    if (date) body.startsAt = date.toISOString();
    if (draft.fulfilment) body.fulfilment = draft.fulfilment as CartItemInput['fulfilment'];
    this.saving.set(true);
    this.cartError.set('');
    this.api.updateCartItem(id, body).subscribe({
      next: cart => { this.cart.set(cart); this.editing.set(null); this.saving.set(false); },
      error: () => { this.saving.set(false); this.cartError.set('Could not update this item. Please check the service and time.'); },
    });
  }

  ngOnInit() { this.api.bookingSummary().subscribe(s => this.summary.set(s)); this.load(); }
  setTab(t: string) { this.tab.set(t); this.load(); }
  load() {
    if (this.tab() === 'CART') { this.api.cart().subscribe(c => this.cart.set(c)); return; }
    this.api.bookings(this.tab()).subscribe(p => {
      p.content.forEach(b => this.drafts[b.id] ??= { rating: 5, text: '' });
      this.bookings.set(p.content);
    });
  }
  message(b: Booking) { this.api.startConversation(b.provider.id, b.id).subscribe(c => this.router.navigate(['/messages', c.id])); }
  cancel(b: Booking) { if (confirm('Cancel this booking?')) this.api.cancelBooking(b.id).subscribe(() => this.load()); }
  review(b: Booking) { const d = this.drafts[b.id]; this.api.review(b.id, d.rating, d.text).subscribe(() => this.load()); }
  removeItem(id: string) { this.api.removeCartItem(id).subscribe(() => this.load()); }
  checkout() { this.api.checkout().subscribe(() => { this.setTab('UPCOMING'); this.ngOnInit(); }); }
}
