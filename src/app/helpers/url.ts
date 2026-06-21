/**
 * Determina si una ruta es pública (rastreable / con banner de cookies).
 *
 * Son privados el dashboard del profesional (`/app` y `/app/...`) y el de la
 * empresa (`/empresa` exacto). OJO: `/empresa/:slug` SÍ es público (es la página
 * pública de la empresa).
 */
export function isPublicUrl(url: string): boolean {
  const path = url.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/';
  if (path === '/app' || path.startsWith('/app/')) return false;
  if (path === '/empresa') return false;
  return true;
}
