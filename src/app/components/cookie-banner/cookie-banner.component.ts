import { Component, computed, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, NavigationEnd, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { ConsentService } from '../../core/services/consent.service';

/**
 * Banner de consentimiento de cookies. Aparece solo en vistas públicas mientras
 * el usuario no haya decidido. Al aceptar, se activa el Meta Pixel; al rechazar,
 * no se carga ningún rastreador.
 */
@Component({
  selector: 'app-cookie-banner',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './cookie-banner.component.html',
  styleUrl: './cookie-banner.component.css',
})
export class CookieBannerComponent {
  private readonly consent    = inject(ConsentService);
  private readonly router     = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly currentUrl = signal(this.router.url);

  /** Visible solo en el navegador, en rutas públicas y sin decisión previa. */
  readonly visible = computed(() =>
    isPlatformBrowser(this.platformId) &&
    this.consent.needsDecision() &&
    this.isPublicUrl(this.currentUrl())
  );

  constructor() {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(e => this.currentUrl.set(e.urlAfterRedirects));
  }

  accept(): void { this.consent.accept(); }
  reject(): void { this.consent.reject(); }

  /** Mismas reglas que MetaPixelService: /app y /empresa (exacto) son privados. */
  private isPublicUrl(url: string): boolean {
    const path = url.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/';
    if (path === '/app' || path.startsWith('/app/')) return false;
    if (path === '/empresa') return false;
    return true;
  }
}
