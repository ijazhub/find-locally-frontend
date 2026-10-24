import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute } from '@angular/router';
import { CityService } from '../../core/city.service';
import { ApiService } from '../../core/api.service';
import { Category, Page, ProviderSummary } from '../../core/models';
import { ProviderCard } from '../../shared/provider-card/provider-card';

@Component({
  selector: 'app-browse',
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatCheckboxModule, MatPaginatorModule, ProviderCard],
  templateUrl: './browse.html',
  styleUrl: './browse.scss',
})
export class Browse implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  location = inject(CityService);
  changeCity(city: string) { this.location.select(city); this.load(true); }
  categories = signal<Category[]>([]);
  res = signal<Page<ProviderSummary> | null>(null);
  f: any = { q: '', category: '', maxDistanceKm: '', minRating: '', verifiedOnly: false, sort: 'RECOMMENDED', page: 0 };
  title = () => (this.categories().find(c => c.slug === this.f.category)?.name ?? 'Everyone') + ' near you';

  ngOnInit() {
    this.api.categories().subscribe(c => this.categories.set(c));
    this.route.queryParamMap.subscribe(q => { // category tiles and the home search land here with query params
      this.f.category = q.get('category') ?? '';
      this.f.q = q.get('q') ?? '';
      this.load(true);
    });
  }
  load(reset = false) {
    if (reset) this.f.page = 0;
    this.api.providers({ ...this.f, city: this.location.selected(), verifiedOnly: this.f.verifiedOnly || null, size: 12 }).subscribe(r => this.res.set(r));
  }
  go(e: PageEvent) { this.f.page = e.pageIndex; this.load(); }
}
