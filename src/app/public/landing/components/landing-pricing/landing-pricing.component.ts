import { Component, Input, Output, EventEmitter, inject, signal, computed, ViewEncapsulation } from '@angular/core';
import { RouterModule } from '@angular/router';
import { IPlan } from '../../../../core/services/subscription.service';
import { LandingPlan, PlanMeta } from '../../landing.models';
import { AuthService } from '../../../../core/services/auth.service';
import { CompanyService } from '../../../../core/services/company.service';

@Component({
  selector: 'app-landing-pricing',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './landing-pricing.component.html',
  styleUrls: ['./landing-pricing.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class LandingPricingComponent {
  @Input() plans: IPlan[] = [];
  @Input() companyMode = false;
  @Input() checkingOut: 'team' | 'pro_max' | null = null;
  @Output() checkoutPlan = new EventEmitter<{ plan: string; members: number }>();

  private readonly auth    = inject(AuthService);
  private readonly company = inject(CompanyService);

  isAuthenticated = computed(() => this.auth.isAuthenticated());
  isProfessional  = computed(() => this.auth.isAuthenticated());
  isCompany       = computed(() => this.company.isAuthenticated());

  readonly PRO_MAX_MIN = 5;
  readonly PRO_MAX_MAX = 25;
  readonly PRO_MAX_EXTRA_USER = 5000;
  readonly TEAM_MIN = 2;
  readonly TEAM_MAX = 4;
  readonly TEAM_EXTRA_USER = 5000;

  proMaxUsers = signal(5);
  teamUsers   = signal(2);

  proMaxPrice = computed(() => {
    const base = this.plans.find(p => p.id === 'pro_max')?.price ?? 25000;
    return base + (this.proMaxUsers() - this.PRO_MAX_MIN) * this.PRO_MAX_EXTRA_USER;
  });

  teamPrice = computed(() => {
    const base = this.plans.find(p => p.id === 'team')?.price ?? 25000;
    return base + Math.max(0, this.teamUsers() - this.TEAM_MIN) * this.TEAM_EXTRA_USER;
  });

  decrementUsers()      { this.proMaxUsers.update(u => Math.max(u - 1, this.PRO_MAX_MIN)); }
  incrementUsers()      { this.proMaxUsers.update(u => Math.min(u + 1, this.PRO_MAX_MAX)); }
  decrementTeamUsers()  { this.teamUsers.update(u => Math.max(u - 1, this.TEAM_MIN)); }
  incrementTeamUsers()  { this.teamUsers.update(u => Math.min(u + 1, this.TEAM_MAX)); }

  displayPrice(p: LandingPlan): number {
    if (p.id === 'pro_max') return this.proMaxPrice();
    if (p.id === 'team')    return this.teamPrice();
    return p.price ?? 0;
  }

  emitCheckout(planId: string): void {
    const members = planId === 'team' ? this.teamUsers() : this.proMaxUsers();
    this.checkoutPlan.emit({ plan: planId, members });
  }

  private readonly PLAN_META: Record<string, PlanMeta> = {
    free: {
      tag: 'Prueba de 2 semanas para que te acostumbres a Lets Reserve',
      cta: 'Empezar gratis',
      ctaRoute: '/registro',
      features: ['1 usuario', 'Citas ilimitadas', 'Mensajería ilimitada', 'Recordatorio automático 1h antes', 'Perfil público personalizable', 'Analytics completo', 'Trial 2 semanas'],
    },
    basic: {
      tag: 'Para freelancers y negocios de 1 persona',
      cta: 'Empezar gratis',
      ctaRoute: '/registro',
      badge: 'Más elegido',
      primary: true,
      features: ['1 usuario', 'Citas ilimitadas', 'Mensajería ilimitada', 'Recordatorio automático 1h antes', 'Perfil público personalizable', 'Analytics básico', 'Trial 2 semanas'],
    },
    team: {
      tag: 'Para equipos pequeños de 2 a 5 personas',
      cta: 'Crear cuenta empresa',
      ctaRoute: '/registro-empresa',
      suffix: '/usuario · mín. 2',
      badge: 'Más popular',
      primary: true,
      features: ['Todo lo de PRO', 'Multi-profesional', 'Vista de equipo (citas + ventas)', 'Analytics enfocado en equipo', 'Citas personalizadas por persona', 'Método de pago compartido'],
    },
    pro: {
      tag: 'Todo el poder de Pro Max, para una sola persona',
      cta: 'Empezar gratis',
      ctaRoute: '/registro',
      features: ['1 usuario', 'WhatsApp automático nativo', 'Recordatorios WhatsApp', 'Cupones y descuentos', 'Visibilidad especial en Marketplace', 'Reseñas y ratings', 'Soporte prioritario'],
    },
    pro_max: {
      tag: 'Para salones medianos (6+ personas) que quieren crecer',
      cta: 'Crear cuenta empresa',
      ctaRoute: '/registro-empresa',
      suffix: '/usuario · mín. 6',
      features: ['Todo lo de UNIDOS', 'WhatsApp automático nativo', 'Recordatorios WhatsApp', 'Cupones y descuentos', 'Visibilidad especial en Marketplace', 'Reseñas y ratings', 'Soporte prioritario'],
    },
  };

  get mergedPlans(): LandingPlan[] {
    const all = this.plans
      .map(plan => {
        const meta = this.PLAN_META[plan.id];
        if (!meta) return null;
        return { ...plan, ...meta, primary: meta.primary ?? false } as LandingPlan;
      })
      .filter((p): p is LandingPlan => p !== null);

    if (this.companyMode) return all.filter(p => p.id === 'team' || p.id === 'pro_max');
    return all;
  }
}
