import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { trigger, style, animate, transition } from '@angular/animations';
import { SubscriptionService, IPlan } from '../../core/services/subscription.service';
import { AuthService } from '../../core/services/auth.service';
import { PlanType } from '../../core/services/professional.service';

@Component({
  selector: 'app-plan-selection',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './plan-selection.component.html',
  styleUrls: ['./plan-selection.component.css'],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(16px)' }),
        animate('280ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class PlanSelectionComponent implements OnInit {
  private readonly subscriptionSvc = inject(SubscriptionService);
  private readonly authSvc         = inject(AuthService);
  private readonly router          = inject(Router);

  plans           = signal<IPlan[]>([]);
  activating      = signal<PlanType | null>(null);
  errorMsg        = signal('');
  isSuspended     = computed(() => this.authSvc.currentUser()?.subscriptionStatus === 'suspended');
  isAuthenticated = computed(() => this.authSvc.isAuthenticated());
  userName        = computed(() => this.authSvc.currentUser()?.name ?? '');

  /** Onboarding: usuario autenticado pero sin plan aún (recién verificó email) */
  isOnboarding = computed(() => {
    const user = this.authSvc.currentUser();
    return !!user && !user.plan;
  });

  ngOnInit(): void {
    this.subscriptionSvc.getPlans().then(p => this.plans.set(p));
  }

  logout(): void {
    this.authSvc.logout();
    this.router.navigate(['/landing']);
  }

  async selectPlan(plan: IPlan): Promise<void> {
    if (!plan.available || plan.comingSoon) return;

    // Plan gratuito solo seleccionable en modo onboarding
    if (plan.id === 'free') {
      if (!this.isOnboarding()) return;
      this.activating.set('free');
      this.errorMsg.set('');
      const result = await this.subscriptionSvc.activateFree();
      if (result.success) {
        this.authSvc.patchUser({
          plan:               result.plan!,
          subscriptionStatus: result.subscriptionStatus as any,
          subscriptionEndDate: result.subscriptionEndDate ?? null,
        });
        this.router.navigate(['/app']);
      } else {
        this.errorMsg.set(result.message ?? 'Error al activar el plan gratuito.');
        this.activating.set(null);
      }
      return;
    }

    this.activating.set(plan.id);
    this.errorMsg.set('');
    const result = await this.subscriptionSvc.checkout(plan.id);

    if (result.success && result.url) {
      window.location.href = result.url;
    } else {
      this.errorMsg.set(result.message ?? 'Error al iniciar el pago.');
      this.activating.set(null);
    }
  }

  formatPrice(price: number | null): string {
    if (price === null) return '—';
    if (price === 0) return 'Gratis';
    return `$${price.toLocaleString('es-CL')} CLP`;
  }

  private static readonly PLAN_BADGES: Partial<Record<string, string>> = {
    team: 'Más elegido',
  };

  private static readonly PLAN_FEATURES: Partial<Record<string, string[]>> = {
    free:    ['Sin tarjeta de crédito', '14 días completos', 'Todas las funciones incluidas', 'Soporte por email'],
    basic:   ['1 usuario', 'Citas ilimitadas', 'Mensajería ilimitada', 'Recordatorio automático 1h antes', 'Perfil público personalizable', 'Analytics básico'],
    pro:     ['1 usuario', 'WhatsApp automático nativo', 'Recordatorios WhatsApp', 'Cupones y descuentos', 'Visibilidad especial en Marketplace', 'Reseñas y ratings', 'Soporte prioritario'],
    team:    ['Todo lo de PRO', 'Multi-profesional', 'Vista de equipo (citas + ventas)', 'Analytics de equipo', 'Método de pago compartido'],
    pro_max: ['Todo lo de UNIDOS', 'WhatsApp automático nativo', 'Cupones y descuentos', 'Visibilidad especial en Marketplace', 'Reseñas y ratings', 'Soporte prioritario'],
  };

  getPlanBadge(plan: IPlan): string | null {
    return PlanSelectionComponent.PLAN_BADGES[plan.id] ?? null;
  }

  isPrimary(plan: IPlan): boolean {
    return plan.id === 'team';
  }

  getPlanFeatures(plan: IPlan): string[] {
    return PlanSelectionComponent.PLAN_FEATURES[plan.id] ?? [];
  }

  getPlanCardClass(plan: IPlan): string {
    if (plan.comingSoon) return 'ps-plan-card ps-plan-card--disabled';
    if (plan.id === 'pro_max') return 'ps-plan-card ps-plan-card--max';
    if (this.isPrimary(plan))  return 'ps-plan-card ps-plan-card--featured';
    return 'ps-plan-card';
  }

  getPlanButtonClass(plan: IPlan): string {
    if (plan.id === 'free') {
      return this.isOnboarding() ? 'ps-btn ps-btn--primary' : 'ps-btn ps-btn--muted';
    }
    if (plan.id === 'pro_max') return 'ps-btn ps-btn--max';
    if (this.isPrimary(plan))  return 'ps-btn ps-btn--featured';
    return 'ps-btn ps-btn--secondary';
  }
}
