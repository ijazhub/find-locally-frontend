import { Component, computed, effect, inject, signal } from '@angular/core';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ApiService } from './core/api.service';
import { AuthService } from './core/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatToolbarModule, MatButtonModule, MatIconModule, MatMenuModule, MatBadgeModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  auth = inject(AuthService);
  private api = inject(ApiService);
  private router = inject(Router);
  notifications = signal<any[]>([]);
  unread = computed(() => this.notifications().filter(n => !n.read).length);

  constructor() {
    effect(() => { if (this.auth.user()) this.api.notifications().subscribe(p => this.notifications.set(p.content)); });
  }
  readAll() { this.api.readAllNotifications().subscribe(() => this.notifications.update(l => l.map(n => ({ ...n, read: true })))); }
  open(n: any) { if (n.deepLink) this.router.navigateByUrl(n.deepLink); }
}
