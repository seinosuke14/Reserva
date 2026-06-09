import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';

/** Carga fuentes de Google Fonts bajo demanda (una sola vez por familia) */
@Injectable({ providedIn: 'root' })
export class FontLoaderService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document   = inject(DOCUMENT);

  load(family: string | null | undefined): void {
    if (!family || !isPlatformBrowser(this.platformId)) return;
    const id = `gfont-${family.replace(/\s+/g, '-').toLowerCase()}`;
    if (this.document.getElementById(id)) return;
    const link = this.document.createElement('link');
    link.id   = id;
    link.rel  = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${family.replace(/\s+/g, '+')}:wght@300;400;500;600;700&display=swap`;
    this.document.head.appendChild(link);
  }
}
