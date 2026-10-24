import { Component, inject, input, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink, MatButtonModule, MatCardModule, MatFormFieldModule, MatInputModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  returnUrl = input<string>(); // from ?returnUrl=
  private auth = inject(AuthService);
  private router = inject(Router);
  email = ''; password = ''; name = '';
  registering = signal(false);
  pending = signal(false);
  showPassword = signal(false);
  error = signal('');

  toggleMode() {
    this.registering.update(value => !value);
    this.password = '';
    this.showPassword.set(false);
    this.error.set('');
  }
  async submit(form: NgForm) {
    if (form.invalid || this.pending()) return;
    this.error.set('');
    this.pending.set(true);
    try {
      const credentials = { email: this.email.trim(), password: this.password };
      if (this.registering()) {
        await this.auth.register({ ...credentials, ...(this.name.trim() ? { name: this.name.trim() } : {}) });
      } else {
        await this.auth.login(credentials);
      }
      this.password = '';
      const target = this.returnUrl();
      await this.router.navigateByUrl(target?.startsWith('/') && !target.startsWith('//') ? target : '/');
    } catch (err) {
      const status = err instanceof HttpErrorResponse ? err.status : undefined;
      this.error.set(status === 409 ? 'An account with this email already exists. Please log in.' :
        status === 401 ? 'The email or password is incorrect.' :
        status === 400 ? 'Please check your details and try again.' : 'Could not connect. Please try again.');
    } finally {
      this.pending.set(false);
    }
  }
}
