import { Component, inject, signal, OnInit, ViewEncapsulation } from '@angular/core';
import { SubscriptionService } from '../../core/services/subscription.service';
import { LandingPlan, PlanMeta } from './landing.models';
import { LandingNavComponent }        from './components/landing-nav/landing-nav.component';
import { LandingHeroComponent }       from './components/landing-hero/landing-hero.component';
import { LandingTrustComponent }      from './components/landing-trust/landing-trust.component';
import { LandingFeaturesComponent }   from './components/landing-features/landing-features.component';
import { LandingDemoComponent }       from './components/landing-demo/landing-demo.component';
import { LandingPricingComponent }    from './components/landing-pricing/landing-pricing.component';
import { LandingDestacadosComponent } from './components/landing-destacados/landing-destacados.component';
import { LandingFaqComponent }        from './components/landing-faq/landing-faq.component';
import { LandingCtaComponent }        from './components/landing-cta/landing-cta.component';
import { LandingFooterComponent }     from './components/landing-footer/landing-footer.component';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [
    LandingNavComponent,
    LandingHeroComponent,
    LandingTrustComponent,
    LandingFeaturesComponent,
    LandingDemoComponent,
    LandingPricingComponent,
    LandingDestacadosComponent,
    LandingFaqComponent,
    LandingCtaComponent,
    LandingFooterComponent,
  ],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class LandingComponent implements OnInit {
  private readonly subscriptionSvc = inject(SubscriptionService);

  plans = signal<LandingPlan[]>([]);

  private readonly PLAN_META: Record<string, PlanMeta> = {
    free: {
      tag: 'Prueba de 2 semanas para que te acostumbres a Citema',
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
      cta: 'Próximamente',
      ctaRoute: '/registro',
      suffix: '/usuario · mín. 2',
      comingSoon: true,
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
      cta: 'Hablar con ventas',
      ctaRoute: '/registro',
      suffix: '/usuario · mín. 4',
      features: ['Todo lo de UNIDOS', 'WhatsApp automático nativo', 'Recordatorios WhatsApp', 'Cupones y descuentos', 'Visibilidad especial en Marketplace', 'Reseñas y ratings', 'Soporte prioritario'],
    },
  };

  async ngOnInit() {
    const apiPlans = await this.subscriptionSvc.getPlans();
    const merged = apiPlans
      .map(plan => {
        const meta = this.PLAN_META[plan.id];
        if (!meta) return null;
        return { ...plan, ...meta, primary: meta.primary ?? false } satisfies LandingPlan;
      })
      .filter((p): p is LandingPlan => p !== null);
    this.plans.set(merged);
  }
}
