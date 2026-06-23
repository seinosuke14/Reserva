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

/**
 * Clasifica una ruta pública en un "tipo de página" semántico, para enviarlo
 * como parámetro `page_type` en el PageView del Meta Pixel. Permite segmentar
 * campañas/conversiones por tipo de página (landing, perfil de reserva, etc.).
 */
export function pageType(url: string): string {
  const path = url.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/';
  if (path === '/' || path === '/landing')                     return 'landing';
  if (path === '/login')                                        return 'login';
  if (path === '/registro' || path === '/registro-empresa')     return 'registro';
  if (path === '/planes')                                       return 'planes';
  if (path === '/reservar/pago-resultado')                      return 'pago_resultado';
  if (path === '/reservar/encuesta')                            return 'encuesta';
  if (path.startsWith('/reservar/'))                            return 'perfil_reserva';
  if (path.startsWith('/cotizar/'))                             return 'cotizacion';
  if (path.startsWith('/empresa/'))                             return 'perfil_empresa';
  if (path === '/terminos')                                     return 'terminos';
  if (path === '/privacidad')                                   return 'privacidad';
  return 'otro';
}
