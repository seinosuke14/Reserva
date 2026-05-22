import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { CompanyService } from '../services/company.service';
import { environment } from '../../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth    = inject(AuthService);
  const company = inject(CompanyService);

  if (!req.url.includes(environment.apiUrl)) return next(req);
  if (req.headers.has('Authorization'))      return next(req);

  const isCompanyRoute = req.url.includes('/company/');
  const token = isCompanyRoute ? company.getToken() : auth.getToken();

  const modified = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req.clone({ setHeaders: { 'X-Guest-Id': auth.guestId } });

  return next(modified);
};
