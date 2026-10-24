import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { NgForm } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { PasswordRecovery } from './password-recovery';

describe('password recovery', () => {
  const validForm = { invalid: false } as NgForm;
  let auth: { forgotPassword: jasmine.Spy; resetPassword: jasmine.Spy };
  beforeEach(() => {
    auth = {
      forgotPassword: jasmine.createSpy().and.resolveTo(undefined),
      resetPassword: jasmine.createSpy().and.resolveTo(undefined),
    };
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: AuthService, useValue: auth }] });
  });

  function createReset(token = 'a'.repeat(43)) {
    const fixture = TestBed.createComponent(PasswordRecovery);
    fixture.componentRef.setInput('reset', true);
    fixture.componentRef.setInput('token', token);
    fixture.componentInstance.password = 'a secure password';
    fixture.componentInstance.confirmation = 'a secure password';
    return fixture.componentInstance;
  }

  it('requests recovery using the trimmed email and displays generic confirmation', async () => {
    const fixture = TestBed.createComponent(PasswordRecovery);
    const page = fixture.componentInstance;
    page.email = ' person@example.com ';
    await page.submit(validForm);
    fixture.detectChanges();
    expect(auth.forgotPassword).toHaveBeenCalledOnceWith('person@example.com');
    expect(fixture.nativeElement.textContent).toContain('If an eligible account exists');
  });

  it('rejects missing or malformed tokens without calling the API', async () => {
    const page = createReset('invalid');
    await page.submit(validForm);
    expect(page.validToken()).toBeFalse();
    expect(auth.resetPassword).not.toHaveBeenCalled();
  });

  it('requires matching passwords', async () => {
    const page = createReset();
    page.confirmation = 'different password';
    await page.submit(validForm);
    expect(page.error()).toBe('Passwords do not match.');
    expect(auth.resetPassword).not.toHaveBeenCalled();
  });

  it('enforces UTF-8 bytes for multibyte passwords', async () => {
    const page = createReset();
    page.password = page.confirmation = '\u00e9'.repeat(37);
    await page.submit(validForm);
    expect(page.error()).toContain('72 UTF-8 bytes');
    expect(auth.resetPassword).not.toHaveBeenCalled();
  });

  it('submits the email token and new password, then clears password fields', async () => {
    const page = createReset();
    await page.submit(validForm);
    expect(auth.resetPassword).toHaveBeenCalledOnceWith('a'.repeat(43), 'a secure password');
    expect(page.complete()).toBeTrue();
    expect(page.password).toBe('');
    expect(page.confirmation).toBe('');
  });

  it('handles expired tokens and allows requesting a new link', async () => {
    auth.resetPassword.and.rejectWith(new HttpErrorResponse({ status: 400 }));
    const page = createReset();
    await page.submit(validForm);
    expect(page.error()).toContain('expired');
    expect(page.complete()).toBeFalse();
    expect(page.pending()).toBeFalse();
  });
});
