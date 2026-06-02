import { Component, Input, Output, EventEmitter, inject, signal, computed, OnInit } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { trigger, style, animate, transition } from '@angular/animations';
import { SubscriptionService, IPlan } from '../../core/services/subscription.service';
import { AuthService } from '../../core/services/auth.service';
import { PlanType } from '../../core/services/professional.service';
import { ICompanySubStatus } from '../../core/services/company.service';

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
  @Input() companyMode = false;
  @Input() checkingOut: string | null = null;
  @Input() companySubStatus: ICompanySubStatus | null = null;
  @Output() companyCheckout = new EventEmitter<{ plan: string; members: number }>();

  private readonly subscriptionSvc = inject(SubscriptionService);
  private readonly authSvc         = inject(AuthService);
  private readonly router          = inject(Router);
  private readonly titleSvc        = inject(Title);
  private readonly metaSvc         = inject(Meta);

  plans           = signal<IPlan[]>([]);
  activating      = signal<PlanType | null>(null);
  errorMsg        = signal('');
  isSuspended      = computed(() => this.authSvc.currentUser()?.subscriptionStatus === 'suspended');
  isAuthenticated  = computed(() => this.authSvc.isAuthenticated());
  userName         = computed(() => this.authSvc.currentUser()?.name ?? '');
  isCompanyMember  = computed(() => !!this.authSvc.currentUser()?.companyId && !this.companyMode);
  companyEmail     = computed(() => this.authSvc.currentUser()?.companyEmail ?? null);

  isOnboarding = computed(() => {
    const user = this.authSvc.currentUser();
    return !!user && !user.plan;
  });

  // ── Company mode: selectores de cantidad ──
  readonly TEAM_MIN    = 2;
  readonly TEAM_MAX    = 4;
  readonly TEAM_EXTRA  = 5000;
  readonly PRO_MAX_MIN = 5;
  readonly PRO_MAX_MAX = 25;
  readonly PRO_MAX_EXTRA = 5000;

  teamUsers   = signal(2);
  proMaxUsers = signal(5);

  teamDisplayPrice = computed(() => {
    const base = this.plans().find(p => p.id === 'team')?.price ?? 25000;
    return base + Math.max(0, this.teamUsers() - this.TEAM_MIN) * this.TEAM_EXTRA;
  });

  proMaxDisplayPrice = computed(() => {
    const base = this.plans().find(p => p.id === 'pro_max')?.price ?? 25000;
    return base + (this.proMaxUsers() - this.PRO_MAX_MIN) * this.PRO_MAX_EXTRA;
  });

  teamUsersMin   = computed(() => this.isActivePlan('team')    ? Math.max(this.TEAM_MIN,    this.companySubStatus?.maxMembers ?? this.TEAM_MIN)    : this.TEAM_MIN);
  proMaxUsersMin = computed(() => this.isActivePlan('pro_max') ? Math.max(this.PRO_MAX_MIN, this.companySubStatus?.maxMembers ?? this.PRO_MAX_MIN) : this.PRO_MAX_MIN);

  incrementTeam()   { this.teamUsers.update(n => Math.min(n + 1, this.TEAM_MAX)); }
  decrementTeam()   { this.teamUsers.update(n => Math.max(n - 1, this.teamUsersMin())); }
  incrementProMax() { this.proMaxUsers.update(n => Math.min(n + 1, this.PRO_MAX_MAX)); }
  decrementProMax() { this.proMaxUsers.update(n => Math.max(n - 1, this.proMaxUsersMin())); }

  isActivePlan(planId: string): boolean {
    return !!this.companySubStatus?.hasPlan && this.companySubStatus.plan === planId && this.companySubStatus.status === 'active';
  }

  hasChange(plan: IPlan): boolean {
    if (!this.isActivePlan(plan.id)) return true;
    const current  = this.companySubStatus?.maxMembers ?? 0;
    const selected = plan.id === 'team' ? this.teamUsers() : this.proMaxUsers();
    return selected !== current;
  }

  extraCost(plan: IPlan): number {
    if (!this.isActivePlan(plan.id)) return 0;
    const current = this.companySubStatus?.maxMembers ?? 0;
    if (plan.id === 'team') {
      return Math.max(0, this.teamUsers() - current) * this.TEAM_EXTRA;
    }
    if (plan.id === 'pro_max') {
      return Math.max(0, this.proMaxUsers() - current) * this.PRO_MAX_EXTRA;
    }
    return 0;
  }

  get visiblePlans(): IPlan[] {
    const all = this.plans();
    if (this.companyMode) return all.filter(p => p.id === 'team' || p.id === 'pro_max');
    const individual = all.filter(p => p.id !== 'team' && p.id !== 'pro_max');
    const trialUsed  = this.authSvc.currentUser()?.trialUsed ?? false;
    return trialUsed ? individual.filter(p => p.id !== 'free') : individual;
  }

  isPlanComingSoon(plan: IPlan): boolean {
    return !!plan.comingSoon && !this.companyMode;
  }

  ngOnInit(): void {
    if (!this.companyMode) {
      const title = 'Planes y Precios · Sistema de Agendamiento Online | Lets Reserve';
      const desc  = 'Elige el plan de agendamiento ideal para tu negocio. Sistema de reservas online para gestionar citas, agenda y clientes. Prueba gratis hoy.';
      this.titleSvc.setTitle(title);
      this.metaSvc.updateTag({ name: 'description', content: desc });
      this.metaSvc.updateTag({ name: 'keywords', content: 'precio sistema agendamiento, plan reservas online, software agenda citas precio, agendamiento online Chile' });
      this.metaSvc.updateTag({ property: 'og:title', content: title });
      this.metaSvc.updateTag({ property: 'og:description', content: desc });
      this.metaSvc.updateTag({ property: 'og:url', content: 'https://letsreserve.cl/planes' });
    }
    this.subscriptionSvc.getPlans().then(p => {
      this.plans.set(p);
      if (this.companySubStatus?.hasPlan && this.companySubStatus.maxMembers) {
        if (this.companySubStatus.plan === 'team')    this.teamUsers.set(this.companySubStatus.maxMembers);
        if (this.companySubStatus.plan === 'pro_max') this.proMaxUsers.set(this.companySubStatus.maxMembers);
      }
    });
  }

  logout(): void {
    this.authSvc.logout();
    this.router.navigate(['/landing']);
  }

  async selectPlan(plan: IPlan): Promise<void> {
    if (!plan.available || this.isPlanComingSoon(plan)) return;

    if (this.companyMode) {
      if (!this.hasChange(plan)) return;
      const members = plan.id === 'team' ? this.teamUsers() : this.proMaxUsers();
      this.companyCheckout.emit({ plan: plan.id, members });
      return;
    }

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
    if (this.isPlanComingSoon(plan)) return 'ps-plan-card ps-plan-card--disabled';
    if (plan.id === 'pro_max' && !this.companyMode) return 'ps-plan-card ps-plan-card--max';
    if (this.isPrimary(plan) || this.companyMode) return 'ps-plan-card ps-plan-card--featured';
    return 'ps-plan-card';
  }

  getPlanButtonClass(plan: IPlan): string {
    if (this.companyMode) {
      return 'ps-btn ps-btn--featured';
    }
    if (plan.id === 'free') {
      return this.isOnboarding() ? 'ps-btn ps-btn--primary' : 'ps-btn ps-btn--muted';
    }
    if (plan.id === 'pro_max') return 'ps-btn ps-btn--max';
    if (this.isPrimary(plan))  return 'ps-btn ps-btn--featured';
    return 'ps-btn ps-btn--secondary';
  }

  isActivating(plan: IPlan): boolean {
    return this.companyMode
      ? this.checkingOut === plan.id
      : this.activating() === plan.id;
  }
}
