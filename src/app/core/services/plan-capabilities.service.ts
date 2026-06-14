import { Injectable, inject, computed } from '@angular/core';
import { AuthService } from './auth.service';
import {
  CapabilityKey,
  PaymentProvider,
  allowedPaymentProviders,
  canPlan,
} from '../config/plan-capabilities';

/**
 * Expone las capacidades del plan efectivo del usuario actual.
 * El subscriptionGuard ya hace patchUser con el plan efectivo (incluido el de
 * la empresa para miembros de equipo), por lo que currentUser().plan es confiable.
 */
@Injectable({ providedIn: 'root' })
export class PlanCapabilitiesService {
  private readonly auth = inject(AuthService);

  readonly plan = computed(() => this.auth.currentUser()?.plan ?? null);

  can(key: CapabilityKey): boolean {
    return canPlan(this.plan(), key);
  }

  allowedProviders(): PaymentProvider[] {
    return allowedPaymentProviders(this.plan());
  }

  isProviderAllowed(provider: PaymentProvider): boolean {
    return this.allowedProviders().includes(provider);
  }
}
