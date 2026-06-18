import { Component, Input, Output, EventEmitter, inject, signal, computed, ViewEncapsulation } from '@angular/core';
import { RouterModule } from '@angular/router';
import { IPlan } from '../../../../core/services/subscription.service';
import { LandingPlan, PlanMeta } from '../../landing.models';
import { AuthService } from '../../../../core/services/auth.service';
import { CompanyService } from '../../../../core/services/company.service';
import { MetaPixelService } from '../../../../core/services/meta-pixel.service';
import { withVat } from '../../../../helpers/formatters';

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
  private readonly pixel   = inject(MetaPixelService);

  isAuthenticated = computed(() => this.auth.isAuthenticated());
  isProfessional  = computed(() => this.auth.isAuthenticated());
  isCompany       = computed(() => this.company.isAuthenticated());

  readonly PRO_MAX_MIN = 5;
  readonly PRO_MAX_MAX = 25;
  readonly PRO_MAX_EXTRA_USER = 8000;
  readonly TEAM_MIN = 2;
  readonly TEAM_MAX = 4;
  readonly TEAM_EXTRA_USER = 9000;
  // Extra por persona con IVA incluido (lo que se muestra en la etiqueta del selector).
  readonly TEAM_EXTRA_USER_VAT    = withVat(this.TEAM_EXTRA_USER);
  readonly PRO_MAX_EXTRA_USER_VAT = withVat(this.PRO_MAX_EXTRA_USER);

  proMaxUsers = signal(5);
  teamUsers   = signal(2);

  // Precios con IVA incluido (base + extras por persona). El IVA se aplica al total neto.
  proMaxPrice = computed(() => {
    const base = this.plans.find(p => p.id === 'pro_max')?.price ?? 25000;
    return withVat(base + (this.proMaxUsers() - this.PRO_MAX_MIN) * this.PRO_MAX_EXTRA_USER);
  });

  teamPrice = computed(() => {
    const base = this.plans.find(p => p.id === 'team')?.price ?? 25000;
    return withVat(base + Math.max(0, this.teamUsers() - this.TEAM_MIN) * this.TEAM_EXTRA_USER);
  });

  decrementUsers()      { this.proMaxUsers.update(u => Math.max(u - 1, this.PRO_MAX_MIN)); }
  incrementUsers()      { this.proMaxUsers.update(u => Math.min(u + 1, this.PRO_MAX_MAX)); }
  decrementTeamUsers()  { this.teamUsers.update(u => Math.max(u - 1, this.TEAM_MIN)); }
  incrementTeamUsers()  { this.teamUsers.update(u => Math.min(u + 1, this.TEAM_MAX)); }

  // Precio mostrado, siempre con IVA incluido.
  displayPrice(p: LandingPlan): number {
    if (p.id === 'pro_max') return this.proMaxPrice();
    if (p.id === 'team')    return this.teamPrice();
    return p.priceWithVat ?? (p.price != null ? withVat(p.price) : 0);
  }

  emitCheckout(planId: string): void {
    const members = planId === 'team' ? this.teamUsers() : this.proMaxUsers();
    this.checkoutPlan.emit({ plan: planId, members });
  }

  /**
   * Un visitante eligió un plan en la landing (clic en la CTA) → conversión
   * InitiateCheckout (Meta Pixel). Señal de alta intención para captar prospectos.
   */
  trackPlanSelect(p: LandingPlan): void {
    this.pixel.track('InitiateCheckout', {
      content_name: p.name,
      content_ids: [p.id],
      value: this.displayPrice(p),
      currency: 'CLP',
    });
  }

  private readonly PLAN_META: Record<string, PlanMeta> = {
    free: {
      tag: 'Prueba de 2 semanas para que te acostumbres a Lets Reserve',
      cta: 'Empezar gratis',
      ctaRoute: '/registro',
      features: ['1 Profesional', 'Prueba Lets Reserve por 2 semanas con todo su catalogo'],
    },
    basic: {
      tag: 'Para freelancers y negocios de 1 persona',
      cta: 'Empezar Plan basico ',
      ctaRoute: '/registro',
      features: ['1 Profesional', 'Citas ilimitadas', 'Emails de Citas ilimitados','50 confirmaciones de citas por whatsapp incluidos.','Recordatorio de citas configurable', 'Perfil público personalizable en formato basico', 'Analytics basico' ],
    },
    team: {
      tag: 'Para equipos pequeños de 2 a 5 personas',
      cta: 'Crear cuenta empresa',
      ctaRoute: '/registro-empresa',
      suffix: '/usuario · mín. 2',
      badge: 'Más popular',
      primary: true,
      features: ['Todo lo de PRO','100 confirmaciones de citas por whatsapp incluidos', 'Multi-profesional', 'Vista de equipo (citas + ventas)', 'Analytics enfocado en equipo', 'Citas personalizadas por persona', 'Método de pago compartido', 'reseñas y ratings', 'Soporte prioritario', 'perfil publico equipo'],
    },
    pro: {
      tag: 'Todo el poder de Pro, para una sola persona',
      cta: 'Empezar Pro',
      ctaRoute: '/registro',
      badge: 'Más elegido',
      primary: true,
      features: ['1 usuario', '60 confirmaciones de citas por whatsapp incluidos', 'Visibilidad en Marketplace ( Proximamente )', 'Reseñas y ratings', 'Emails de Citas ilimitados', 'Perfil público personalizable en formato Pro','Analitycs profesioanl', 'Soporte prioritario','Integración con Google Calendar','Emails Marketing ( Proximamente )'],
    },
    pro_max: {
      tag: 'Para salones medianos (6+ personas) que quieren crecer',
      cta: 'Crear cuenta empresa',
      ctaRoute: '/registro-empresa',
      suffix: '/usuario · mín. 6',
      features: ['Todo lo de Equipo', '200 confirmaciones de citas por whatsapp incluidos','Cupones y descuentos', 'Visibilidad en Marketplace ( Proximamente ) ' , 'Reseñas y ratings' , 'Soporte prioritario'],
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
