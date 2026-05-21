import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { trigger, style, animate, transition } from '@angular/animations';
import { CompanyService } from '../../core/services/company.service';
import {
  rutValidator,
  strictEmailValidator,
  strongPasswordValidator,
  formatRut,
} from '../../core/validators/custom-validators';

@Component({
  selector: 'app-register-company',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './register-company.component.html',
  animations: [
    trigger('fadeSlide', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('250ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('stepAnim', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(16px)' }),
        animate('200ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class RegisterCompanyComponent {
  private readonly fb      = inject(FormBuilder);
  private readonly svc     = inject(CompanyService);
  private readonly router  = inject(Router);

  step             = signal<'register' | 'verify'>('register');
  pendingEmail     = signal('');
  isSubmitting     = signal(false);
  errorMsg         = signal('');

  verificationCode = signal('');
  verifyError      = signal('');
  isVerifying      = signal(false);
  isResending      = signal(false);
  resendMsg        = signal('');

  form = this.fb.group({
    name:     ['', [Validators.required, Validators.minLength(3), Validators.maxLength(80)]],
    rut:      ['', [Validators.required, rutValidator]],
    email:    ['', [Validators.required, Validators.maxLength(254), strictEmailValidator]],
    password: ['', [Validators.required, Validators.maxLength(16), strongPasswordValidator]],
  });

  get f() { return this.form.controls; }

  onRutInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.f.rut.setValue(formatRut(input.value), { emitEvent: false });
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.isSubmitting.set(true);
    this.errorMsg.set('');

    const { name, rut, email, password } = this.form.value;
    const result = await this.svc.register({
      name: name!.trim(),
      rut: rut!,
      email: email!,
      password: password!,
      termsAcceptedAt: new Date().toISOString(),
    });

    this.isSubmitting.set(false);
    if (result.success) {
      this.pendingEmail.set(result.email ?? email!);
      this.step.set('verify');
    } else {
      this.errorMsg.set(result.message);
    }
  }

  onCodeInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 6);
    this.verificationCode.set(digits);
    input.value = digits;
  }

  async onVerify(): Promise<void> {
    const code = this.verificationCode().trim();
    if (code.length !== 6) { this.verifyError.set('Ingresa los 6 dígitos del código.'); return; }
    this.isVerifying.set(true);
    this.verifyError.set('');

    const result = await this.svc.verifyEmail(this.pendingEmail(), code);
    this.isVerifying.set(false);
    if (result.success && result.token && result.company) {
      this.svc.setSession(result.token, result.company);
      this.router.navigate(['/empresa']);
    } else {
      this.verifyError.set(result.message);
    }
  }

  async onResend(): Promise<void> {
    this.isResending.set(true);
    this.resendMsg.set('');
    const result = await this.svc.resendVerification(this.pendingEmail());
    this.isResending.set(false);
    this.resendMsg.set(result.message);
  }
}
