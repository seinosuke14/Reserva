import {
  Component,
  PLATFORM_ID,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { TourService } from '../../core/services/tour.service';

interface Rect { top: number; left: number; width: number; height: number; }

// Overlay global del tutorial de onboarding. Reacciona al estado de TourService:
//  - phase 'welcome'  → modal borroso preguntando si quiere aprender.
//  - phase 'running'  → spotlight sobre el contenido (deja clickeable solo eso),
//    con "Salir de tutorial" arriba a la izquierda y "Continuar" a la derecha.
@Component({
  selector: 'app-onboarding-tour',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './onboarding-tour.component.html',
  styleUrl: './onboarding-tour.component.css',
})
export class OnboardingTourComponent {
  readonly tour = inject(TourService);
  private readonly platformId = inject(PLATFORM_ID);

  /** Recuadro del área resaltada (el contenido configurable). */
  readonly spotlight = signal<Rect | null>(null);

  /** Selector del área que queda interactiva durante el tour. */
  private readonly TARGET = '[data-tour-target="content"]';

  constructor() {
    // Re-mide cuando arranca el tour o cambia de paso.
    effect(() => {
      this.tour.phase();
      this.tour.index();
      if (this.tour.phase() === 'running') this.scheduleMeasure();
      else this.spotlight.set(null);
    });

    if (isPlatformBrowser(this.platformId)) {
      const remeasure = () => {
        if (this.tour.phase() === 'running') this.measure();
      };
      window.addEventListener('resize', remeasure);
      window.addEventListener('scroll', remeasure, true);
    }
  }

  // Espera a que la nueva ruta renderice antes de medir el recuadro.
  private scheduleMeasure(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    requestAnimationFrame(() => requestAnimationFrame(() => this.measure()));
    setTimeout(() => this.measure(), 250);
  }

  private measure(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const el = document.querySelector(this.TARGET) as HTMLElement | null;
    if (!el) { this.spotlight.set(null); return; }
    const r = el.getBoundingClientRect();
    this.spotlight.set({ top: r.top, left: r.left, width: r.width, height: r.height });
  }
}
