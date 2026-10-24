import { Component, inject, input, linkedSignal, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ProviderSummary } from '../../core/models';
import { InrPipe } from '../inr.pipe';

@Component({
  selector: 'app-provider-card',
  imports: [RouterLink, MatCardModule, MatButtonModule, MatIconModule, InrPipe],
  templateUrl: './provider-card.html',
  styleUrl: './provider-card.scss',
})
export class ProviderCard {
  p = input.required<ProviderSummary>();
  changed = output<boolean>();
  saved = linkedSignal(() => !!this.p().saved);
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private router = inject(Router);

  toggle() {
    if (!this.auth.user()) { this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } }); return; }
    const next = !this.saved();
    (next ? this.api.save(this.p().id) : this.api.unsave(this.p().id)).subscribe(() => {
      this.saved.set(next);
      this.changed.emit(next);
    });
  }
}
