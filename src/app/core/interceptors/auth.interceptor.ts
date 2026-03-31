import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

/**
 * Interceptor de autenticación:
 * - Si existe token JWT → añade Authorization: Bearer <token>
 * - Si es visita anónima → añade X-Guest-Id: <guestId>
 * Solo aplica a llamadas hacia nuestra API (evita contaminar llamadas externas).
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  // No interceptar URLs externas
  if (!req.url.includes(environment.apiUrl)) {
    return next(req);
  }

  const token = auth.getToken();

  const modified = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req.clone({ setHeaders: { 'X-Guest-Id': auth.guestId } });

  return next(modified);
};
