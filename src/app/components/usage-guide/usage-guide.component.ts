import { Component, computed, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

// Un paso de la guía "¿Cómo usar LR?". El contenido (intro, bullets, tip) se
// define desde cada panel; aquí solo se modela la forma.
export interface GuideStep {
  /** Título corto del paso (ej: "Configurar horarios"). */
  title: string;
  /** Párrafo introductorio que explica el objetivo del paso. */
  intro?: string;
  /** Instrucciones puntuales en formato lista. */
  items?: string[];
  /** Consejo o nota destacada. */
  tip?: string;
  /**
   * Acción opcional que lleva a la sección correspondiente del panel.
   * Usa `link` para navegar por ruta (panel profesional) o `action` para
   * emitir un identificador y que el contenedor cambie de pestaña (panel empresa).
   */
  cta?: { label: string; link?: string; action?: string };
}

// Guía paso a paso reutilizable para el panel de profesional y el de empresa.
// Recibe los pasos como input y maneja la navegación entre ellos.
@Component({
  selector: 'app-usage-guide',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './usage-guide.component.html',
  styleUrl: './usage-guide.component.css',
})
export class UsageGuideComponent {
  /** Lista de pasos a mostrar. */
  readonly steps = input<GuideStep[]>([]);
  /** Título principal de la guía. */
  readonly heading = input<string>('¿Cómo usar Lets Reserve?');
  /** Subtítulo descriptivo bajo el título. */
  readonly subheading = input<string>(
    'Sigue estos pasos para dejar tu cuenta lista y empezar a recibir reservas.'
  );

  /** Emite el `action` del CTA cuando no es navegación por ruta. */
  readonly ctaAction = output<string>();

  /** Índice del paso activo. */
  readonly current = signal(0);

  readonly currentStep = computed<GuideStep | undefined>(
    () => this.steps()[this.current()]
  );

  readonly isFirst = computed(() => this.current() === 0);
  readonly isLast = computed(() => this.current() === this.steps().length - 1);
  readonly progressPct = computed(() => {
    const total = this.steps().length;
    return total <= 1 ? 100 : Math.round((this.current() / (total - 1)) * 100);
  });

  goTo(index: number): void {
    if (index < 0 || index >= this.steps().length) return;
    this.current.set(index);
  }

  next(): void {
    if (!this.isLast()) this.current.update((i) => i + 1);
  }

  prev(): void {
    if (!this.isFirst()) this.current.update((i) => i - 1);
  }
}
