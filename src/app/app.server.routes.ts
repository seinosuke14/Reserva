import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Dashboard protegido → solo cliente, sin SSR
  { path: 'app/**', renderMode: RenderMode.Client },
  // Todo lo demás (landing, reservas, empresa pública) → SSR
  { path: '**', renderMode: RenderMode.Server },
];
