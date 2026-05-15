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
    this.router.navigate(['/login']);
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
        this.router.navigate(['/']);
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

  getPlanCardClass(plan: IPlan): string {
    const base = 'relative flex flex-col p-6 rounded-2xl border transition-all duration-200 ';
    if (plan.comingSoon) {
      return base + 'bg-white/[.04] border-white/10 opacity-60 cursor-not-allowed';
    }
    if (plan.id === 'pro_max') {
      return base + 'bg-gradient-to-b from-amber-500/20 to-amber-900/10 border-amber-500/40 cursor-pointer hover:border-amber-400/60 hover:scale-[1.02]';
    }
    if (plan.id === 'free') {
      return base + (this.isOnboarding()
        ? 'bg-white/[.06] border-white/15 cursor-pointer hover:bg-white/10 hover:border-white/25 hover:scale-[1.02]'
        : 'bg-white/[.06] border-white/15 cursor-default');
    }
    return base + 'bg-white/[.06] border-white/15 cursor-pointer hover:bg-white/10 hover:border-white/25 hover:scale-[1.02]';
  }

  getPlanButtonClass(plan: IPlan): string {
    const base = 'w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ';
    if (plan.id === 'free') {
      return base + (this.isOnboarding()
        ? 'bg-white text-slate-900 hover:bg-white/90 disabled:opacity-60'
        : 'bg-white/10 text-white/40 cursor-default');
    }
    if (plan.id === 'pro_max') {
      return base + 'bg-amber-400 text-amber-900 hover:bg-amber-300 disabled:opacity-60';
    }
    return base + 'bg-white text-slate-900 hover:bg-white/90 disabled:opacity-60';
  }
}
