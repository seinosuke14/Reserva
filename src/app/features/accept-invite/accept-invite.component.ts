import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { trigger, style, animate, transition } from '@angular/animations';
import { AuthService } from '../../core/services/auth.service';
import { ProfessionalService } from '../../core/services/professional.service';

@Component({
  selector: 'app-accept-invite',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './accept-invite.component.html',
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
export class AcceptInviteComponent implements OnInit {
  private readonly fb      = inject(FormBuilder);
  private readonly authSvc = inject(AuthService);
  private readonly svc     = inject(ProfessionalService);
  private readonly router  = inject(Router);
  private readonly route   = inject(ActivatedRoute);

  inviteToken = signal<string | null>(null);
  step        = signal<'login' | 'warn' | 'error'>('login');
  loginError  = signal('');
  isLoading   = signal(false);
  isAccepting = signal(false);
  acceptError = signal('');

  // Datos del plan activo para mostrar advertencia
  planName     = signal('');
  daysLeft     = signal(0);

  form = this.fb.group({
    email:    ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('invite');
    if (!token) {
      this.step.set('error');
      return;
    }
    this.inviteToken.set(token);
  }

  get f() { return this.form.controls; }

  async onLogin(): Promise<void> {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.isLoading.set(true);
    this.loginError.set('');

    const { email, password } = this.form.value;
    const result = await this.authSvc.login(email!, password!);
    this.isLoading.set(false);

    if (!result.success) {
      this.loginError.set(result.message ?? 'Error al iniciar sesión.');
      return;
    }

    // Verificar si tiene plan pagado activo (no free, no null)
    const user = this.authSvc.currentUser();
    const hasPaidPlan = user?.plan && user.plan !== 'free' && user.subscriptionStatus === 'active';

    if (hasPaidPlan) {
      const end = user?.subscriptionEndDate ? new Date(user.subscriptionEndDate) : null;
      const days = end ? Math.max(0, Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0;
      this.planName.set(user!.plan!);
      this.daysLeft.set(days);
      this.step.set('warn');
    } else {
      await this.confirmAccept();
    }
  }

  async confirmAccept(): Promise<void> {
    const token = this.inviteToken();
    if (!token) return;

    this.isAccepting.set(true);
    this.acceptError.set('');
    const result = await this.svc.acceptInvite(token);
    this.isAccepting.set(false);

    if (result.success && result.token && result.user) {
      this.authSvc.setSession(result.token, result.user);
      this.router.navigate(['/app']);
    } else {
      this.acceptError.set(result.message);
    }
  }
}
