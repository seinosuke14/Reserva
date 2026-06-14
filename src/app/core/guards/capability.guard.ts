import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PlanCapabilitiesService } from '../services/plan-capabilities.service';
import { CapabilityKey } from '../config/plan-capabilities';

/**
 * Protege una ruta exigiendo que el plan del usuario incluya una capacidad.
 * Defensa contra acceso por URL directa; redirige a la vista rápida si no la tiene.
 */
export const capabilityGuard = (key: CapabilityKey): CanActivateFn => () => {
  const caps   = inject(PlanCapabilitiesService);
  const router = inject(Router);
  return caps.can(key) ? true : router.createUrlTree(['/app']);
};
