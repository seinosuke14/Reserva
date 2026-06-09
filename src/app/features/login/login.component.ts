import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { trigger, style, animate, transition } from '@angular/animations';
import { AuthService } from '../../core/services/auth.service';
import { ProfessionalService } from '../../core/services/professional.service';
import { CompanyService } from '../../core/services/company.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.component.html',
  animations: [
    trigger('fadeSlide', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('250ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('errorAnim', [
      transition(':enter', [style({ opacity: 0, height: 0 }), animate('200ms', style({ opacity: 1, height: '*' }))]),
      transition(':leave', [animate('150ms', style({ opacity: 0, height: 0 }))])
    ]),
    trigger('stepAnim', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(12px)' }),
        animate('200ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class LoginComponent {
  private readonly fb         = inject(FormBuilder);
  private readonly auth       = inject(AuthService);
  private readonly profSvc    = inject(ProfessionalService);
  private readonly companySvc = inject(CompanyService);
  private readonly router     = inject(Router);
  private readonly route      = inject(ActivatedRoute);

  accountType   = signal<'professional' | 'company'>('professional');
  isSubmitting  = signal(false);
  isRedirecting = signal(false);
  error         = signal('');
  // Tipo de mensaje: 'error' (rojo), 'warning' (último intento, ámbar), 'blocked' (bloqueo, rojo intenso).
  errorKind     = signal<'error' | 'warning' | 'blocked'>('error');
  step          = signal<'login' | 'forgot' | 'forgot-sent'>('login');

  // Forgot password
  forgotEmail      = signal('');
  forgotError      = signal('');
  isForgotSending  = signal(false);

  form = this.fb.group({
    email:    ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  get email()    { return this.form.get('email')!; }
  get password() { return this.form.get('password')!; }

  // Borde rojo solo en errores "duros" (credenciales/ bloqueo), no en el aviso de último intento.
  hardError(): boolean { return !!this.error() && this.errorKind() !== 'warning'; }

  onForgotEmailInput(event: Event): void {
    this.forgotEmail.set((event.target as HTMLInputElement).value);
  }

  showForgot(): void {
    this.forgotEmail.set(this.form.value.email ?? '');
    this.forgotError.set('');
    this.step.set('forgot');
  }

  setAccountType(type: 'professional' | 'company'): void {
    this.accountType.set(type);
    this.error.set('');
    this.errorKind.set('error');
    this.step.set('login');
  }

  // Traduce los flags del backend (lastAttempt / blocked) al tipo de mensaje a mostrar.
  private _setError(message: string, opts?: { lastAttempt?: boolean; blocked?: boolean }): void {
    this.errorKind.set(opts?.blocked ? 'blocked' : opts?.lastAttempt ? 'warning' : 'error');
    this.error.set(message);
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.isSubmitting.set(true);
    this.error.set('');
    this.errorKind.set('error');

    if (this.accountType() === 'company') {
      const result = await this.companySvc.login(this.form.value.email!, this.form.value.password!);
      this.isSubmitting.set(false);
      if (result.success) {
        this.router.navigate(['/empresa']);
      } else {
        this._setError(result.message, result);
      }
      return;
    }

    const result = await this.auth.login(this.form.value.email!, this.form.value.password!);
    this.isSubmitting.set(false);
    if (result.success) {
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
      const target = returnUrl?.startsWith('/reservar/') ? returnUrl : '/app/agenda';
      this.router.navigateByUrl(target);
    } else if (result.needsVerification && result.email) {
      await this._redirectToVerify(result.email, result.verificationExpired ?? false);
    } else {
      this._setError(result.message, result);
    }
  }

  private async _redirectToVerify(email: string, isExpired: boolean): Promise<void> {
    this.isRedirecting.set(true);
    if (isExpired) {
      await this.profSvc.resendVerification(email);
    }
    this.router.navigate(['/registro'], { state: { step: 'verify', email } });
  }

  async onForgotSubmit(): Promise<void> {
    const email = this.forgotEmail().trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.forgotError.set('Ingresa un email válido.');
      return;
    }
    this.isForgotSending.set(true);
    this.forgotError.set('');
    if (this.accountType() === 'company') {
      await this.companySvc.forgotPassword(email);
    } else {
      await this.auth.forgotPassword(email);
    }
    this.isForgotSending.set(false);
    this.step.set('forgot-sent');
  }
}
