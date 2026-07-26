import { Component, signal, computed, ViewChild, ElementRef, ViewEncapsulation } from '@angular/core';

export interface Feature {
  kicker: string;
  title: string;
  body: string;
  chips: string[];
  /** Ruta de imagen (ej: 'agenda.png' en /public). Opcional. */
  image?: string;
  /** Ruta de video (ej: 'demo-agenda.mp4' en /public). Tiene prioridad sobre image. Opcional. */
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
    { kicker: 'Reserva', title: 'Agenda online 24/7', body: 'Tus clientes eligen servicio y hora desde su celular. Tú defines tu disponibilidad y bloqueas cuando quieras.', chips: ['09:00', '10:30', '12:00', '15:30'], image: "letsreservecalendary.png"},
    { kicker: 'Pagos', title: 'Cobra como quieras', body: 'Tarjeta, transferencia o presencial. El pago queda registrado solo, sin planillas paralelas.', chips: ['Tarjeta', 'Transferencia', 'Presencial'] },
    { kicker: 'Avisos', title: 'Recordatorios automáticos', body: 'Confirmaciones por WhatsApp y correo. Menos citas perdidas, sin que muevas un dedo.', chips: ['WhatsApp', 'Correo', '24 h antes', '2 h antes'] },
    { kicker: 'Datos', title: 'Tus números en tiempo real', body: 'Ingresos, citas y clientes al día. Decides con datos, no con corazonadas.', chips: ['Ingresos', 'Citas', 'Clientes nuevos'] },
    { kicker: 'Marca', title: 'Tu marca, tu perfil', body: 'Logo, colores y fotos. Tu página, no un template genérico.', chips: ['Logo', 'Colores', 'Galería'] },
    { kicker: 'Ventas', title: 'Cotizaciones', body: 'Tus clientes piden presupuesto y tú respondes desde el panel, con precios guardados.', chips: ['Plantillas', 'Envío por link', 'Seguimiento'] },
  ];

  readonly active = signal(0);
  readonly item = computed(() => this.features[this.active()]);

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
