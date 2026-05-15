import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { SubscriptionService } from '../services/subscription.service';
import { PlanType, SubscriptionStatus } from '../services/professional.service';

export const subscriptionGuard: CanActivateFn = async () => {
  const auth            = inject(AuthService);
  const subscriptionSvc = inject(SubscriptionService);
  const router          = inject(Router);

  const user = auth.currentUser();
  if (!user) return router.createUrlTree(['/login']);

  let { plan, subscriptionStatus } = user;

  // Si no hay datos de plan en sesión local, consultar la API para obtener estado real
  if (!plan || !subscriptionStatus) {
    const status = await subscriptionSvc.getStatus();
    if (status.hasPlan && status.plan && status.status) {
      plan               = status.plan as PlanType;
      subscriptionStatus = status.status as SubscriptionStatus;
      // Actualizar sesión local con datos frescos
      auth.patchUser({
        plan,
        subscriptionStatus,
        subscriptionEndDate: status.endDate ?? null,
      });
    }
  }

  if (!plan || !subscriptionStatus || subscriptionStatus === 'suspended' || subscriptionStatus === 'expired') {
    return router.createUrlTree(['/planes']);
  }

  return true;
};
