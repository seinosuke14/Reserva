import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { CompanyService } from '../services/company.service';

export const companyAuthGuard: CanActivateFn = () => {
  const company = inject(CompanyService);
  const router  = inject(Router);
  return company.isAuthenticated() ? true : router.createUrlTree(['/login']);
};
