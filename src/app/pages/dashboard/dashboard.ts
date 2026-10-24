import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTabsModule } from '@angular/material/tabs';
import { ApiService } from '../../core/api.service';
import { Booking, STATUS_LABEL, Service, defaultWeek } from '../../core/models';
import { InrPipe } from '../../shared/inr.pipe';

@Component({
  selector: 'app-dashboard',
  imports: [DatePipe, NgTemplateOutlet, FormsModule, MatTabsModule, MatButtonModule, MatCheckboxModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatSlideToggleModule, InrPipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private api = inject(ApiService);
  label = STATUS_LABEL;
  statuses = ['AWAITING_CONFIRMATION', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'DECLINED'];
  o = signal<any>(null);
  bookings = signal<Booking[]>([]);
  services = signal<Service[]>([]);
  reviews = signal<any[]>([]);
  status = '';
  avail: any = { byAppointmentOnly: false, weekly: defaultWeek() };
  availSaved = signal(false);
  blank = (): any => ({ name: '', description: '', durationMinutes: 60, rupees: null });
  draft: any = this.blank();

  ngOnInit() {
    this.loadOverview(); this.loadBookings(); this.loadServices();
    this.api.businessReviews().subscribe(r => this.reviews.set(r.content));
    this.api.availability().subscribe(a => { if (a?.weekly?.length) this.avail = a; });
  }
  loadOverview() { this.api.overview().subscribe(o => this.o.set(o)); }
  loadBookings() { this.api.businessBookings(this.status || undefined).subscribe(p => this.bookings.set(p.content)); }
  loadServices() { this.api.ownServices().subscribe(s => this.services.set(s)); }
  act(b: Booking, a: 'accept' | 'decline' | 'complete') { this.api.bookingAction(b.id, a).subscribe(() => { this.loadOverview(); this.loadBookings(); }); }

  toggle(s: Service, active: boolean) { this.api.setServiceActive(s.id, active).subscribe(); }
  edit(s: Service) { this.draft = { id: s.id, name: s.name, description: s.description, durationMinutes: s.durationMinutes, rupees: s.price.amount / 100 }; }
  remove(s: Service) { if (confirm(`Delete "${s.name}"?`)) this.api.deleteService(s.id).subscribe(() => this.loadServices()); }
  saveService() {
    const d = this.draft;
    const body = { name: d.name, description: d.description, durationMinutes: +d.durationMinutes, price: { amount: Math.round(d.rupees * 100), currency: 'INR' } };
    (d.id ? this.api.updateService(d.id, body) : this.api.createService(body)).subscribe(() => { this.draft = this.blank(); this.loadServices(); });
  }
  saveAvailability() { this.api.saveAvailability(this.avail).subscribe(() => this.availSaved.set(true)); }
}
