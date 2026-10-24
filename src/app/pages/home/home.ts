import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Router, RouterLink } from '@angular/router';
import { CityService } from '../../core/city.service';
import { ApiService } from '../../core/api.service';
import { Category, ProviderSummary } from '../../core/models';
import { ProviderCard } from '../../shared/provider-card/provider-card';

@Component({
  selector: 'app-home',
  imports: [RouterLink, FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, ProviderCard],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);
  location = inject(CityService);
  get city() { return this.location.selected(); }
  changeCity(city: string) { this.location.select(city); this.ngOnInit(); }
  q = '';
  tints = ['#f3ddd3', '#f1e6d2', '#dcebe3', '#e6e3d8', '#e6e0f0'];
  categories = signal<Category[]>([]);
  featured = signal<ProviderSummary[]>([]);

  ngOnInit() {
    this.api.home(this.city).subscribe(h => { this.categories.set(h.categories); this.featured.set(h.featured); });
  }
  search() { this.router.navigate(['/providers'], { queryParams: { q: this.q || null } }); }
}
