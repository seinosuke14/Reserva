import { Injectable, inject, effect, PLATFORM_ID, DestroyRef } from '@angular/core';
import { isPlatformBrowser, DOCUMENT } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ConsentService } from './consent.service';

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & { queue?: unknown[]; loaded?: boolean; version?: string };
    _fbq?: unknown;
  }
}

/**
 * Carga el Meta Pixel (Facebook) y dispara PageView, pero SOLO en vistas públicas.
 * El dashboard privado (/app) nunca carga el pixel.
 *
 * - SSR-safe: no hace nada fuera del navegador.
 * - Carga perezosa: el script de fbevents se inyecta la primera vez que se visita
 *   una ruta pública; si el usuario solo navega por /app, nunca se carga.
 */
@Injectable({ providedIn: 'root' })
export class MetaPixelService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly doc        = inject(DOCUMENT);
  private readonly router     = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly consent    = inject(ConsentService);

  private readonly pixelId = environment.metaPixelId;
  private initialized = false;
  /** Si la última vista navegada es pública (rastreable). */
  private onPublicView = false;

  /**
   * Determina si una ruta es pública (rastreable). Son privados:
   * - el dashboard del profesional: /app y /app/...
   * - el dashboard de la empresa: /empresa exacto (OJO: /empresa/:slug SÍ es público,
   *   es la página pública de la empresa).
   */
  private isPublicUrl(url: string): boolean {
    const path = url.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/';
    if (path === '/app' || path.startsWith('/app/')) return false;
    if (path === '/empresa') return false;
    return true;
  }

  /**
   * Empieza a escuchar la navegación. Llamar una sola vez al arrancar la app
   * (desde AppComponent). Si no hay pixelId configurado, no hace nada.
   */
  init(): void {
    if (!isPlatformBrowser(this.platformId) || !this.pixelId) return;

    // OJO: en el arranque NO usar router.url para la ruta inicial. En ese momento
    // la navegación aún no ha terminado y router.url vale '/' (público) aunque el
    // destino real sea /app — eso cargaría el pixel en el dashboard. Solo lo
    // evaluamos si la navegación YA terminó (router.navigated); el resto de cargas
    // iniciales las captura el primer NavigationEnd de la suscripción de abajo.
    if (this.router.navigated && this.isPublicUrl(this.router.url)) {
      this.onPublicView = true;
      this.trackPageView();
    }

    const sub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(e => {
        this.onPublicView = this.isPublicUrl(e.urlAfterRedirects);
        if (this.onPublicView) this.trackPageView();
      });

    this.destroyRef.onDestroy(() => sub.unsubscribe());

    // Si el usuario acepta las cookies más tarde (desde el banner), carga el pixel
    // y registra la vista pública actual sin esperar a la siguiente navegación.
    effect(() => {
      if (this.consent.analyticsAllowed() && this.onPublicView) this.trackPageView();
    });
  }

  /**
   * Dispara un PageView, cargando el pixel la primera vez. No hace NADA sin
   * consentimiento explícito del usuario (Ley 21.719): el script de Meta ni
   * siquiera se inyecta hasta que se acepta.
   */
  private trackPageView(): void {
    if (!this.consent.analyticsAllowed()) return;
    this.ensureLoaded();
    window.fbq?.('track', 'PageView');
  }

  /**
   * Dispara un evento estándar o personalizado (p.ej. 'Lead', 'CompleteRegistration',
   * 'Schedule', 'Purchase'). Úsalo desde componentes públicos en momentos clave.
   * No hace nada en el dashboard ni si el pixel no está configurado.
   */
  track(event: string, params?: Record<string, unknown>): void {
    if (!isPlatformBrowser(this.platformId) || !this.pixelId) return;
    if (!this.consent.analyticsAllowed()) return;
    this.ensureLoaded();
    window.fbq?.('track', event, params);
  }

  /** Inyecta el snippet oficial de Meta Pixel una sola vez. */
  private ensureLoaded(): void {
    if (this.initialized || window.fbq) {
      this.initialized = true;
      return;
    }
    this.initialized = true;

    /* eslint-disable */
    const n: any = (window.fbq = function (...args: unknown[]) {
      (n as any).callMethod
        ? (n as any).callMethod.apply(n, args)
        : (n as any).queue.push(args);
    });
    if (!window._fbq) window._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = '2.0';
    n.queue = [];
    /* eslint-enable */

    const script = this.doc.createElement('script');
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    this.doc.head.appendChild(script);

    window.fbq?.('init', this.pixelId);
  }
}
