import { Component, OnChanges, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ProviderDetail } from '../../core/models';
import { InrPipe } from '../../shared/inr.pipe';

@Component({
  selector: 'app-provider',
  imports: [RouterLink, MatButtonModule, MatRadioModule, MatSnackBarModule, InrPipe],
  templateUrl: './provider.html',
  styleUrl: './provider.scss',
})
export class Provider implements OnChanges {
  id = input.required<string>(); // :id from the route
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private snack = inject(MatSnackBar);
  p = signal<ProviderDetail | null>(null);
  selectedId = signal('');
  selected = () => this.p()?.services.find(s => s.id === this.selectedId());

  ngOnChanges() {
    // Reload when Angular reuses this component for a different provider.
    this.api.provider(this.id()).subscribe(p => { this.p.set(p); this.selectedId.set(p.services[0]?.id ?? ''); });
  }
  private needLogin() {
    if (this.auth.user()) return false;
    this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
    return true;
  }
  book() { if (!this.needLogin()) this.router.navigate(['/book', this.id()], { queryParams: { serviceId: this.selectedId() } }); }
  addToCart() {
    if (!this.needLogin()) this.api.addToCart(this.id(), this.selectedId()).subscribe(() => this.snack.open('Added to your cart', 'OK', { duration: 3000 }));
  }
  message() {
    if (!this.needLogin()) this.api.startConversation(this.id()).subscribe(c => this.router.navigate(['/messages', c.id]));
  }
}
