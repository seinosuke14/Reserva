import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { trigger, style, animate, transition } from '@angular/animations';
import { ProfessionalService } from '../../core/services/professional.service';
import { ProfessionService, IProfession } from '../../core/services/profession.service';
import { AuthService } from '../../core/services/auth.service';
import {
  rutValidator,
  chileanPhoneValidator,
  strictEmailValidator,
  strongPasswordValidator,
  formatRut,
} from '../../core/validators/custom-validators';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './register.component.html',
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
export class RegisterComponent implements OnInit {
  private readonly fb            = inject(FormBuilder);
  private readonly svc           = inject(ProfessionalService);
  private readonly professionSvc = inject(ProfessionService);
  private readonly authSvc       = inject(AuthService);
  private readonly router        = inject(Router);
  private readonly route         = inject(ActivatedRoute);

  inviteToken = signal<string | null>(null);

  professions    = signal<IProfession[]>([]);
  isSubmitting   = signal(false);
  errorMsg       = signal('');
  acceptedTerms  = signal(false);

  // Verification step
  step              = signal<'register' | 'verify'>('register');
  pendingEmail      = signal('');
  verificationCode  = signal('');
  verifyError       = signal('');
  isVerifying       = signal(false);
  isResending       = signal(false);
  resendMsg         = signal('');

  form = this.fb.group({
    firstName:    ['', [Validators.required, Validators.minLength(2), Validators.maxLength(16), Validators.pattern(/^[A-Za-zÀ-ÿñÑ]+$/)]],
    lastName:     ['', [Validators.required, Validators.minLength(2), Validators.maxLength(16), Validators.pattern(/^[A-Za-zÀ-ÿñÑ]+$/)]],
    rut:          ['', [Validators.required, rutValidator]],
    professionId: ['', Validators.required],
    email:        ['', [Validators.required, Validators.maxLength(254), strictEmailValidator]],
    phone:        ['+569', [Validators.required, chileanPhoneValidator]],
    password:     ['', [Validators.required, Validators.maxLength(16), strongPasswordValidator]],
  });

  async ngOnInit(): Promise<void> {
    this.professions.set(await this.professionSvc.getActive());

    const token = this.route.snapshot.queryParamMap.get('invite');
    if (token) this.inviteToken.set(token);

    const state = history.state as { step?: string; email?: string };
    if (state?.step === 'verify' && state?.email) {
      this.pendingEmail.set(state.email);
      this.step.set('verify');
    }
  }

  get f() { return this.form.controls; }

  onRutInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const formatted = formatRut(input.value);
    this.f.rut.setValue(formatted, { emitEvent: false });
  }

  onPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/[^\d+]/g, '');
    if (!value.startsWith('+569')) {
      const digits = value.replace(/\D/g, '').replace(/^569/, '');
      value = '+569' + digits;
    }
    value = '+569' + value.slice(4).replace(/\D/g, '').slice(0, 8);
    this.f.phone.setValue(value, { emitEvent: false });
  }

  onCodeInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 6);
    this.verificationCode.set(digits);
    input.value = digits;
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.isSubmitting.set(true);
    this.errorMsg.set('');

    const { firstName, lastName, rut, professionId, email, phone, password } = this.form.value;
    const payload: Record<string, string> = {
      name: `${(firstName ?? '').trim()} ${(lastName ?? '').trim()}`.trim(),
      rut: rut!,
      professionId: professionId!,
      email: email!,
      phone: phone!,
      password: password!,
      termsAcceptedAt: new Date().toISOString(),
    };
    if (this.inviteToken()) payload['inviteToken'] = this.inviteToken()!;

    const result = await this.svc.register(payload as any);
    this.isSubmitting.set(false);
    if (result.success) {
      this.pendingEmail.set(result.email ?? email!);
      this.step.set('verify');
    } else {
      this.errorMsg.set(result.message);
    }
  }

  async onVerify(): Promise<void> {
    const code = this.verificationCode().trim();
    if (code.length !== 6) { this.verifyError.set('Ingresa los 6 dígitos del código.'); return; }
    this.isVerifying.set(true);
    this.verifyError.set('');

    const result = await this.svc.verifyEmail(this.pendingEmail(), code);
    this.isVerifying.set(false);
    if (result.success && result.token && result.user) {
      this.authSvc.setSession(result.token, result.user);
      this.router.navigate(['/app']);
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
