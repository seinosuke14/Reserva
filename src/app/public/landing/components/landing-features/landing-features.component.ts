import { Component, signal, computed, effect, HostListener, ViewChild, ElementRef, ViewEncapsulation } from '@angular/core';

export interface Feature {
  kicker: string;
  title: string;
  body: string;
  chips: string[];
  /** Ruta de imagen (ej: 'agenda.png' en /public). Opcional. */
  image?: string;
  /** Varias rutas: se muestran como carrusel. Tiene prioridad sobre image. */
  images?: string[];
  /** Ruta de video (ej: 'demo-agenda.mp4' en /public). Tiene prioridad sobre las imágenes. Opcional. */
  video?: string;
}

@Component({
  selector: 'app-landing-features',
  standalone: true,
  templateUrl: './landing-features.component.html',
  styleUrls: ['./landing-features.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class LandingFeaturesComponent {
  readonly features: Feature[] = [
    { kicker: 'Reserva', title: 'Agenda online 24/7', body: 'Tus clientes eligen servicio y hora desde su celular. Tú defines tu disponibilidad y bloqueas cuando quieras.', chips: ['09:00', '10:30', '12:00', '15:30'], image: "calendary.png"},
    { kicker: 'Pagos', title: 'Cobra como quieras', body: 'Tarjeta, transferencia o presencial. El pago queda registrado solo, sin planillas paralelas.', chips: ['Tarjeta', 'Transferencia', 'Presencial'], images: ['letsreservePaymenths.png', 'letsreserveuserpaymenth.png'] },
    { kicker: 'Avisos', title: 'Recordatorios automáticos', body: 'Confirmaciones por WhatsApp y correo. Menos citas perdidas, sin que muevas un dedo.', chips: ['WhatsApp', 'Correo', '24 h antes', '2 h antes'], image:"letsreserveRecordatorio.png"},
    { kicker: 'Datos', title: 'Tus números en tiempo real', body: 'Ingresos, citas y clientes al día. Decides con datos, no con corazonadas.', chips: ['Ingresos', 'Citas', 'Clientes nuevos'], image:"letsreserveEstadisticas.png"},
    // { kicker: 'Marca', title: 'Tu marca, tu perfil', body: 'Logo, colores y fotos. Tu página, no un template genérico.', chips: ['Logo', 'Colores', 'Galería'] },
    // { kicker: 'Ventas', title: 'Cotizaciones', body: 'Tus clientes piden presupuesto y tú respondes desde el panel, con precios guardados.', chips: ['Plantillas', 'Envío por link', 'Seguimiento'] },
  ];

  readonly active = signal(0);
  readonly item = computed(() => this.features[this.active()]);

  /** Imágenes del beneficio abierto: normaliza image (una) e images (varias). */
  readonly slides = computed(() => {
    const f = this.item();
    if (f.video) return [];
    return f.images?.length ? f.images : (f.image ? [f.image] : []);
  });

  // ── Carrusel de imágenes ────────────────────────────────────────────
  // El desplazamiento lo hace el navegador (scroll horizontal con snap), así en
  // el teléfono funciona el gesto nativo; las flechas solo mueven ese scroll.
  readonly slide = signal(0);

  @ViewChild('slideTrack') private slideTrack?: ElementRef<HTMLElement>;

  constructor() {
    // Al cambiar de beneficio, el carrusel vuelve a la primera imagen.
    effect(() => {
      this.slides();
      this.slide.set(0);
      queueMicrotask(() => {
        const track = this.slideTrack?.nativeElement;
        if (track) track.scrollLeft = 0;
      });
    });
  }

  goToSlide(i: number): void {
    const total = this.slides().length;
    const next  = Math.max(0, Math.min(i, total - 1));

    this.slide.set(next);
    this._scrollTo(this.zoom() ? this.zoomTrack : this.slideTrack, next, 'smooth');
  }

  prevSlide(): void { this.goToSlide(this.slide() - 1); }
  nextSlide(): void { this.goToSlide(this.slide() + 1); }

  /** Mantiene los puntos y las flechas en sintonía cuando se desliza con el dedo. */
  onScroll(track: HTMLElement): void {
    if (!track.clientWidth) return;
    this.slide.set(Math.round(track.scrollLeft / track.clientWidth));
  }

  private _scrollTo(ref: ElementRef<HTMLElement> | undefined, i: number, behavior: ScrollBehavior): void {
    const el = ref?.nativeElement;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior });
  }

  // ── Visor a pantalla completa ───────────────────────────────────────
  // Sobre todo para el teléfono: las capturas del panel se leen muy chicas
  // dentro de la tarjeta. Comparte el índice con el carrusel, así al cerrar
  // el visor queda visible la misma imagen que se estaba mirando.
  readonly zoom = signal(false);

  @ViewChild('zoomTrack') private zoomTrack?: ElementRef<HTMLElement>;

  openZoom(): void {
    if (!this.slides().length) return;
    this.zoom.set(true);
    document.body.style.overflow = 'hidden';
    // El visor se crea al activar la señal: hay que esperar a que exista.
    setTimeout(() => this._scrollTo(this.zoomTrack, this.slide(), 'auto'));
  }

  closeZoom(): void {
    if (!this.zoom()) return;
    this.zoom.set(false);
    document.body.style.overflow = '';
    setTimeout(() => this._scrollTo(this.slideTrack, this.slide(), 'auto'));
  }

  @HostListener('document:keydown.escape')
  onEscape(): void { this.closeZoom(); }

  @ViewChild('featList') private featList?: ElementRef<HTMLElement>;

  setActive(i: number, ev?: Event) {
    this.active.set(i);

    // En mobile la lista de tabs es horizontal con scroll: llevamos el tab
    // elegido a la primera posición para dejar ver los siguientes.
    const list = this.featList?.nativeElement;
    const btn = ev?.currentTarget as HTMLElement | null;
    if (list && btn) {
      const delta = btn.getBoundingClientRect().left - list.getBoundingClientRect().left;
      list.scrollTo({ left: list.scrollLeft + delta, behavior: 'smooth' });
    }
  }
}
