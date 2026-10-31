import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../core/auth.service';
import { sessionErrorMessage } from '../core/session-error';
@Component({
  imports: [RouterLink, MatButtonModule],
  template: `<main class="page stack"><h1>{{ failed ? 'Could not restore your session' : 'This page is for a different account type' }}</h1><p>{{ failed ? 'Your saved session has been kept. Retry connecting to your account, or sign in again.' : 'Use the navigation for your account to continue.' }}</p>@if (failed && (error() || auth.restorationError())) { <p role="alert">{{ error() || auth.restorationError() }}</p> }@if (failed) { <button mat-flat-button [disabled]="pending()" (click)="retry()">Retry session restoration</button><button mat-stroked-button [disabled]="pending()" (click)="signInAgain()">Sign in again</button> } @else { <a mat-flat-button [routerLink]="auth.landingUrl()">Back to your home</a> }</main>`,
})
export class AccessState {
  auth = inject(AuthService); router = inject(Router);
  failed = inject(ActivatedRoute).snapshot.data['sessionError'];
  pending = signal(false); error = signal('');
  async retry() { if (this.pending()) return; this.pending.set(true); this.error.set(''); try { await this.auth.loadMe(); await this.router.navigateByUrl(this.auth.user() ? this.auth.landingUrl() : '/login'); } catch (e) { this.error.set(sessionErrorMessage(e)); } finally { this.pending.set(false); } }
  signInAgain() { this.auth.expire(); void this.router.navigateByUrl('/login'); }
}
