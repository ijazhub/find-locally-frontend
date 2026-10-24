import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatStepper, MatStepperModule } from '@angular/material/stepper';
import { catchError, of } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { CityService } from '../../core/city.service';
import { Category, DAYS, defaultWeek } from '../../core/models';

@Component({
  selector: 'app-onboarding',
  imports: [FormsModule, MatStepperModule, MatButtonModule, MatCheckboxModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  templateUrl: './onboarding.html',
  styleUrl: './onboarding.scss',
})
export class Onboarding implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private router = inject(Router);
  cities = inject(CityService);
  categories = signal<Category[]>([]);
  busy = signal(false);
  error = signal('');
  about: any = { ownerName: '', businessName: '', category: '', bio: '' };
  location: any = { city: this.cities.selected(), neighbourhood: '', workMode: 'BOTH', serviceRadiusKm: 5 };
  services: any[] = [{ name: '', durationMinutes: 60, rupees: null }];
  availability: any = { byAppointmentOnly: false, weekly: defaultWeek() };
  idType = 'AADHAAR';
  private files: { avatar?: File; cover?: File; gallery: File[]; id?: File } = { gallery: [] };

  categoryName = () => this.categories().find(c => c.slug === this.about.category)?.name ?? 'Category';

  ngOnInit() {
    this.api.categories().subscribe(c => this.categories.set(c));
    this.about.ownerName = this.auth.user()?.name ?? '';
    // Resume a saved draft, or start a new one.
    this.api.onboarding().pipe(catchError(() => this.api.startOnboarding().pipe(catchError(() => of(null))))).subscribe(s => {
      if (!s) return;
      Object.assign(this.about, s.about ?? {});
      Object.assign(this.location, s.location ?? {});
      if (!this.cities.cities.some(city => city === this.location.city)) {
        this.location.city = this.cities.selected();
      }
      if (s.availability?.weekly?.length) this.availability = s.availability;
      if (s.services?.services?.length) this.services = s.services.services.map((x: any) => ({ ...x, rupees: x.price.amount / 100 }));
    });
  }
  pick(e: Event, kind: 'avatar' | 'cover' | 'gallery' | 'id') {
    const list = Array.from((e.target as HTMLInputElement).files ?? []);
    if (kind === 'gallery') this.files.gallery = list; else this.files[kind] = list[0];
  }
  save(step: string, body: any, stepper: MatStepper) { this.api.saveStep(step, body).subscribe(() => stepper.next()); }
  saveServices(stepper: MatStepper) {
    const list = this.services.filter(s => s.name && s.rupees).map(s => ({
      name: s.name, durationMinutes: +s.durationMinutes, price: { amount: Math.round(s.rupees * 100), currency: 'INR' },
    }));
    this.save('SERVICES', { services: list }, stepper);
  }
  async saveWork(stepper: MatStepper) {
    this.busy.set(true);
    try {
      const body: any = {};
      if (this.files.avatar) body.avatarUploadId = await this.api.upload(this.files.avatar, 'AVATAR');
      if (this.files.cover) body.coverUploadId = await this.api.upload(this.files.cover, 'COVER');
      if (this.files.gallery.length) body.galleryUploadIds = await Promise.all(this.files.gallery.map(f => this.api.upload(f, 'GALLERY_PHOTO')));
      this.save('WORK', body, stepper);
    } finally { this.busy.set(false); }
  }
  async finish() {
    this.busy.set(true); this.error.set('');
    try {
      const body: any = { idType: this.idType };
      if (this.files.id) body.idDocumentUploadId = await this.api.upload(this.files.id, 'ID_DOCUMENT');
      this.api.saveStep('VERIFICATION', body).subscribe({
        next: () => this.api.submitOnboarding().subscribe({
          next: async () => { await this.auth.loadMe(); this.router.navigate(['/business/dashboard']); },
          error: () => this.error.set('Some details are missing. Please check the earlier steps.'),
        }),
        error: () => this.error.set('Could not save your ID details.'),
      });
    } finally { this.busy.set(false); }
  }
}
