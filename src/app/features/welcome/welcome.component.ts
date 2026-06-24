import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Title, Meta } from '@angular/platform-browser';
import { Router, ActivatedRoute } from '@angular/router';
import { trigger, style, animate, transition } from '@angular/animations';
import { MetaPixelService } from '../../core/services/meta-pixel.service';
import { SubscriptionService } from '../../core/services/subscription.service';
import { AuthService } from '../../core/services/auth.service';
import { withVat } from '../../helpers/formatters';

/**
 * Vista de agradecimiento/bienvenida tras registrar un plan (gratis o de pago),
 * paso intermedio antes de entrar al dashboard. Aquí se captura el plan elegido
 * para Meta Pixel (StartTrial para el gratis, Subscribe para los de pago).
 *
 * Es una ruta pública (`/bienvenida`) para que el pixel pueda cargar, pero NO se
 * indexa (robots noindex) ni va en el sitemap: es una página de flujo interno.
 *
 * Pendiente: convertir esta vista en un pequeño tutorial de onboarding.
 */
@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './welcome.component.html',
  styleUrl: './welcome.component.css',
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(16px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class WelcomeComponent implements OnInit {
  private readonly router     = inject(Router);
  private readonly route      = inject(ActivatedRoute);
  private readonly pixel      = inject(MetaPixelService);
  private readonly subsSvc    = inject(SubscriptionService);
  private readonly auth       = inject(AuthService);
  private readonly titleSvc   = inject(Title);
  private readonly metaSvc    = inject(Meta);

  readonly plan     = signal<string>('');
  readonly userName = computed(() => this.auth.currentUser()?.name?.split(' ')[0] ?? '');

  private static readonly PLAN_NAMES: Record<string, string> = {
    free: 'Gratuito', basic: 'Básico', pro: 'Pro', team: 'Equipo', pro_max: 'Empresa',
  };
  readonly planLabel = computed(() => WelcomeComponent.PLAN_NAMES[this.plan()] ?? '');
  readonly isFree    = computed(() => this.plan() === 'free');

  async ngOnInit(): Promise<void> {
    // Página de flujo interno: no debe indexarse.
    this.titleSvc.setTitle('¡Bienvenido a Lets Reserve!');
    this.metaSvc.updateTag({ name: 'robots', content: 'noindex, nofollow' });

    const plan = this.route.snapshot.queryParamMap.get('plan') ?? '';
    this.plan.set(plan);
    if (plan) await this._trackPlan(plan);
  }

  /** Captura del plan registrado para Meta Pixel (evento estándar). */
  private async _trackPlan(plan: string): Promise<void> {
    if (plan === 'free') {
      // Prueba gratis → StartTrial.
      this.pixel.track('StartTrial', { content_name: plan });
      return;
    }

    // Plan de pago → Subscribe con el valor (con IVA) del plan.
    let value = 0;
    try {
      const plans = await this.subsSvc.getPlans();
      const found = plans.find(p => p.id === plan);
      if (found?.price != null) value = withVat(found.price);
    } catch { /* best-effort: si falla, mandamos el evento sin valor */ }

    this.pixel.track('Subscribe', value
      ? { content_name: plan, value, currency: 'CLP' }
      : { content_name: plan });
  }

  goToDashboard(): void {
    this.router.navigate(['/app']);
  }
}
