import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

// Un paso del tutorial interactivo. Según el panel, navega por ruta
// (profesional) o cambiando de pestaña (empresa).
export interface TourStep {
  /** Título corto del paso. */
  title: string;
  /** Instrucción que ve el usuario. */
  body: string;
  /** Ruta del dashboard a la que se navega (paneles con rutas). */
  route?: string;
  /** Identificador de pestaña a activar (paneles con tabs). */
  tab?: string;
}

// Configuración con la que cada panel arranca su tutorial.
export interface TourConfig {
  steps: TourStep[];
  /** Si la cuenta ya completó el onboarding (no se ofrece de nuevo). */
  alreadyCompleted: boolean;
  /** Cómo navegar a cada paso. Por defecto usa la ruta del paso. */
  navigate?: (step: TourStep) => void;
  /** Se ejecuta al terminar/salir/declinar para persistir el estado. */
  onComplete?: () => void;
}

type TourPhase = 'idle' | 'welcome' | 'running';

// Estado central del tutorial de onboarding. La UI (overlay + modal de
// bienvenida) reacciona a `phase`; este servicio maneja la navegación entre
// pasos y delega la persistencia al panel que lo inició.
@Injectable({ providedIn: 'root' })
export class TourService {
  private readonly router = inject(Router);

  readonly phase = signal<TourPhase>('idle');
  readonly steps = signal<TourStep[]>([]);
  readonly index = signal(0);

  readonly currentStep = computed<TourStep | undefined>(() => this.steps()[this.index()]);
  readonly total = computed(() => this.steps().length);
  readonly isFirst = computed(() => this.index() === 0);
  readonly isLast = computed(() => this.index() === this.steps().length - 1);

  private navigate: (step: TourStep) => void = (step) => this.defaultNavigate(step);
  private onComplete: () => void = () => {};

  /**
   * Ofrece el tutorial si la cuenta aún no lo completó. Muestra el modal de
   * bienvenida; no hace nada si ya está completado o ya hay un tour activo.
   */
  offerIfPending(config: TourConfig): void {
    if (this.phase() !== 'idle') return;
    if (config.alreadyCompleted || !config.steps.length) return;
    this.steps.set(config.steps);
    this.navigate = config.navigate ?? ((step) => this.defaultNavigate(step));
    this.onComplete = config.onComplete ?? (() => {});
    this.index.set(0);
    this.phase.set('welcome');
  }

  /** El usuario acepta aprender → arranca el recorrido. */
  accept(): void {
    if (!this.steps().length) { this.complete(); return; }
    this.index.set(0);
    this.phase.set('running');
    this.navigateToCurrent();
  }

  /** El usuario no quiere el tutorial ahora → se marca como visto. */
  decline(): void {
    this.complete();
  }

  /** "Continuar": avanza al siguiente paso o finaliza. */
  next(): void {
    if (this.isLast()) { this.complete(); return; }
    this.index.update((i) => i + 1);
    this.navigateToCurrent();
  }

  /** Retrocede un paso. */
  prev(): void {
    if (this.isFirst()) return;
    this.index.update((i) => i - 1);
    this.navigateToCurrent();
  }

  /** "Salir de tutorial": cierra y marca como visto. */
  exit(): void {
    this.complete();
  }

  private defaultNavigate(step: TourStep): void {
    if (step.route) this.router.navigateByUrl(step.route);
  }

  private navigateToCurrent(): void {
    const step = this.currentStep();
    if (step) this.navigate(step);
  }

  /** Cierra el tour y delega la persistencia al panel. */
  private complete(): void {
    this.phase.set('idle');
    this.onComplete();
  }
}
