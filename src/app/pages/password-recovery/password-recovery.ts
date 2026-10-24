import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-password-recovery',
  imports: [FormsModule, MatButtonModule, MatCardModule, MatFormFieldModule, MatInputModule, RouterLink],
  templateUrl: './password-recovery.html',
  styleUrl: '../login/login.scss',
})
export class PasswordRecovery {
  reset = input(false);
  token = input<string>();
  validToken = computed(() => /^[A-Za-z0-9_-]{43}$/.test(this.token() ?? ''));
  private auth = inject(AuthService);
  email = '';
  password = '';
  confirmation = '';
  showPassword = signal(false);
  pending = signal(false);
  complete = signal(false);
  error = signal('');

  async submit(form: NgForm) {
    if (form.invalid || this.pending() || this.complete()) return;
    this.error.set('');
    if (this.reset()) {
      if (!this.validToken()) return;
      if (new TextEncoder().encode(this.password).length > 72) {
        this.error.set('Password must be at most 72 UTF-8 bytes. Try fewer characters.');
        return;
      }
      if (this.password !== this.confirmation) {
        this.error.set('Passwords do not match.');
        return;
      }
    }
    this.pending.set(true);
    try {
      if (this.reset()) await this.auth.resetPassword(this.token()!, this.password);
      else await this.auth.forgotPassword(this.email.trim());
      this.password = '';
      this.confirmation = '';
      this.showPassword.set(false);
      this.complete.set(true);
    } catch (err) {
      const status = err instanceof HttpErrorResponse ? err.status : undefined;
      this.error.set(this.reset() && status === 400
        ? 'This link may be invalid, expired, or already used. Check your password or request a new link.'
        : status === 503 ? 'Password recovery is temporarily unavailable. Please try again later.'
        : status === 400 ? 'Please enter a valid email address.'
        : 'Could not complete your request. Please try again.');
    } finally {
      this.pending.set(false);
    }
  }
}
