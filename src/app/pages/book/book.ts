import { DatePipe } from '@angular/common';
import { Component, OnChanges, OnInit, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatStepperModule } from '@angular/material/stepper';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { CityService } from '../../core/city.service';
import { Address, FULFILMENT_LABEL, ProviderDetail, Service, Slot } from '../../core/models';
import { InrPipe } from '../../shared/inr.pipe';

@Component({
  selector: 'app-book',
  imports: [FormsModule, DatePipe, RouterLink, MatStepperModule, MatButtonModule, MatDatepickerModule, MatFormFieldModule, MatInputModule, MatSelectModule, InrPipe],
  templateUrl: './book.html',
  styleUrl: './book.scss',
})
export class Book implements OnInit, OnChanges {
  providerId = input.required<string>(); // :providerId
  serviceId = input<string>();           // ?serviceId=
  private api = inject(ApiService);
  provider = signal<ProviderDetail | null>(null);
  service = signal<Service | null>(null);
  slots = signal<Slot[]>([]);
  slot = signal<Slot | null>(null);
  dateChosen = signal(false);
  addresses = signal<Address[]>([]);
  done = signal(false);
  error = signal('');
  today = new Date();
  label = FULFILMENT_LABEL;
  fulfilment = 'AT_STUDIO';
  addressId = '';
  note = '';
  newAddr: Address = { line1: '', city: inject(CityService).selected(), pincode: '' };

  fulfilments = () => this.service()?.fulfilment?.length ? this.service()!.fulfilment! : ['AT_STUDIO', 'AT_CLIENT'];
  needsAddress = () => this.fulfilment === 'AT_CLIENT' || this.fulfilment === 'DELIVERY';

  ngOnChanges() {
    this.provider.set(null);
    this.service.set(null);
    this.slots.set([]);
    this.slot.set(null);
    this.dateChosen.set(false);
    this.done.set(false);
    this.error.set('');
    this.note = '';
    this.api.provider(this.providerId()).subscribe(p => {
      this.provider.set(p);
      const s = p.services.find(x => x.id === this.serviceId()) ?? p.services[0];
      this.service.set(s);
      this.fulfilment = this.fulfilments()[0];
    });
  }
  ngOnInit() {
    this.api.addresses().subscribe(a => { this.addresses.set(a); this.addressId = a.find(x => (x as any).isDefault)?.id ?? a[0]?.id ?? ''; });
  }
  pickDate(d: Date | null) {
    if (!d) return;
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    this.slot.set(null); this.dateChosen.set(true);
    this.api.slots(this.providerId(), this.service()!.id, iso).subscribe(s => this.slots.set(s));
  }
  saveAddress() {
    this.api.addAddress(this.newAddr).subscribe(a => { this.addresses.update(l => [...l, a]); this.addressId = a.id!; });
  }
  confirm() {
    this.error.set('');
    this.api.createBooking({
      providerId: this.providerId(), serviceId: this.service()!.id, startsAt: this.slot()!.startsAt,
      fulfilment: this.fulfilment, addressId: this.needsAddress() ? this.addressId : undefined, note: this.note || undefined,
    }).subscribe({ next: () => this.done.set(true), error: e => this.error.set(e.status === 409 ? 'That time was just taken. Please pick another.' : 'Could not book. Please try again.') });
  }
}
