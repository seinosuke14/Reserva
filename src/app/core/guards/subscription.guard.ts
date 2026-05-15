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

  // Siempre consultar la API para tener el estado real del servidor
  const status = await subscriptionSvc.getStatus();
  let plan: PlanType | null | undefined;
  let subscriptionStatus: SubscriptionStatus | null | undefined;

  if (status.hasPlan && status.plan && status.status) {
    plan               = status.plan as PlanType;
    subscriptionStatus = status.status as SubscriptionStatus;
    auth.patchUser({
      plan,
      subscriptionStatus,
      subscriptionEndDate: status.endDate ?? null,
    });
  } else {
    // Fallback a datos locales si la API no responde
    plan               = user.plan;
    subscriptionStatus = user.subscriptionStatus;
  }

  if (!plan || !subscriptionStatus || subscriptionStatus === 'suspended' || subscriptionStatus === 'expired') {
    return router.createUrlTree(['/planes']);
  }

  return true;
};
