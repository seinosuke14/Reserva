import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type ConsentStatus = 'accepted' | 'rejected' | null;

/**
 * Gestiona el consentimiento de cookies de analítica/publicidad (Meta Pixel).
 *
 * Cumplimiento Ley 21.719: el rastreo publicitario solo se activa tras
 * consentimiento explícito del usuario. La decisión se guarda en localStorage.
 * SSR-safe: en el servidor siempre devuelve `null` (sin decisión) y no toca storage.
 */
@Injectable({ providedIn: 'root' })
export class ConsentService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly storageKey = 'lr_cookie_consent';

  /** Estado actual del consentimiento. Señal reactiva para la UI. */
  readonly status = signal<ConsentStatus>(this.read());

  /** True solo si el usuario aceptó explícitamente el rastreo. */
  analyticsAllowed(): boolean {
    return this.status() === 'accepted';
  }

  /** True si aún no ha decidido (para mostrar el banner). */
  needsDecision(): boolean {
    return this.status() === null;
  }

  accept(): void { this.persist('accepted'); }
  reject(): void { this.persist('rejected'); }

  private persist(value: Exclude<ConsentStatus, null>): void {
    this.status.set(value);
    if (!isPlatformBrowser(this.platformId)) return;
    try { localStorage.setItem(this.storageKey, value); } catch { /* storage no disponible */ }
  }

  private read(): ConsentStatus {
    if (!isPlatformBrowser(this.platformId)) return null;
    try {
      const v = localStorage.getItem(this.storageKey);
      return v === 'accepted' || v === 'rejected' ? v : null;
    } catch {
      return null;
    }
  }
}
