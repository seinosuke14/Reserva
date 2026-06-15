import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { trigger, style, animate, transition } from '@angular/animations';
import { SubscriptionService } from '../../core/services/subscription.service';
import { AuthService } from '../../core/services/auth.service';
import { PlanType } from '../../core/services/professional.service';
import { formatDateMedium } from '../../helpers/formatters';

type ResultState = 'loading' | 'success' | 'error' | 'cancelled';

@Component({
  selector: 'app-subscription-payment-result',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './subscription-payment-result.component.html',
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class SubscriptionPaymentResultComponent implements OnInit {
  private readonly route           = inject(ActivatedRoute);
  private readonly router          = inject(Router);
  private readonly subscriptionSvc = inject(SubscriptionService);
  private readonly authSvc         = inject(AuthService);

  state    = signal<ResultState>('loading');
  plan     = signal<PlanType | null>(null);
  endDate  = signal<string | null>(null);
  errorMsg = signal('');

  async ngOnInit(): Promise<void> {
    const params    = this.route.snapshot.queryParamMap;
    const token_ws  = params.get('token_ws');
    const cancelled = params.get('cancelled');

    if (cancelled === 'true') {
      this.state.set('cancelled');
      return;
    }

    if (!token_ws) {
      this.state.set('error');
      this.errorMsg.set('No se recibió token de pago.');
      return;
    }

    const result = await this.subscriptionSvc.confirmWebpay(token_ws);

    if (result.success && result.plan) {
      this.plan.set(result.plan);
      this.endDate.set(result.endDate ?? null);

      // Actualizar sesión local con el nuevo plan
      this.authSvc.patchUser({
        plan:               result.plan,
        subscriptionStatus: 'active',
        subscriptionEndDate: result.endDate ?? null,
      });

      this.state.set('success');
    } else {
      this.state.set('error');
      this.errorMsg.set(result.message ?? 'El pago no pudo ser procesado.');
    }
  }

  goToDashboard(): void {
    this.router.navigate(['/app']);
  }

  goToPlans(): void {
    this.router.navigate(['/planes']);
  }

  formatPlan(plan: PlanType | null): string {
    const names: Record<PlanType, string> = {
      free:    'Gratuito',
      basic:   'Básico',
      pro:     'Pro',
      team:    'Equipo',
      pro_max: 'Empresa',
    };
    return plan ? names[plan] : '';
  }

  readonly formatDate = formatDateMedium;
}
