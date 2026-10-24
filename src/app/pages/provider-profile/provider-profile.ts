import { DatePipe } from '@angular/common';
import { Component, OnChanges, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-provider-profile',
  imports: [RouterLink, DatePipe, MatButtonModule, MatTabsModule],
  templateUrl: './provider-profile.html',
  styleUrl: './provider-profile.scss',
})
export class ProviderProfile implements OnChanges {
  id = input.required<string>();
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private router = inject(Router);
  p = signal<any>(null);
  media = signal<any[]>([]);
  reviews = signal<any[]>([]);
  followed = signal(false);

  ngOnChanges() {
    // Reload when Angular reuses this component for a different provider.
    this.api.socialProfile(this.id()).subscribe(p => { this.p.set(p); this.followed.set(!!p.followed); });
    this.api.media(this.id()).subscribe(m => this.media.set(m.content));
    this.api.reviews(this.id()).subscribe(r => this.reviews.set(r.content));
  }
  toggleFollow() {
    if (!this.auth.user()) { this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } }); return; }
    const next = !this.followed();
    (next ? this.api.follow(this.id()) : this.api.unfollow(this.id())).subscribe(() => this.followed.set(next));
  }
}
