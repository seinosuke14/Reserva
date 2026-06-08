import { Component, signal, ViewEncapsulation } from '@angular/core';

export interface FaqItem { q: string; a: string; }

@Component({
  selector: 'app-landing-faq',
  standalone: true,
  templateUrl: './landing-faq.component.html',
  styleUrls: ['./landing-faq.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class LandingFaqComponent {
  faqOpen = signal(-1);

  readonly faqItems: FaqItem[] = [
    { q: '¿Necesito tarjeta de crédito para probar?', a: 'No. El trial de 2 semanas no pide tarjeta. Solo email y teléfono. Si decides seguir, eliges plan al final del trial.' },
    { q: '¿Y si mis clientes no entienden cómo agendar?', a: 'Tu link es público y funciona desde cualquier celular. Tus clientes no se registran: eligen servicio, eligen hora y listo. Reciben confirmación por WhatsApp y Correo Electronico.' },
    { q: '¿Puedo personalizar el perfil de mi negocio?', a: 'Sí — el perfil es 100% editable. Sube tus fotos, logo, colores, descripción y servicios. Nada de templates genéricos.' },
    { q: '¿Cómo funciona el plan UNIDOS para mi equipo?', a: 'Pagas 9.000 CLP por usuario, mínimo 2 (18k total). Cada profesional tiene su agenda y la dueña ve todo en una sola vista, con un solo método de pago.' },
    { q: '¿Qué pasa si quiero cancelar?', a: 'Cancelas desde tu panel cuando quieras. Sin contratos, sin penalidades. Lo que ves es lo que pagas.' },
    { q: '¿Soporte en español?', a: 'Directo, en horario hábil chileno. Por WhatsApp y email. Sin tickets eternos.' },
  ];

  toggleFaq(i: number) { this.faqOpen.set(this.faqOpen() === i ? -1 : i); }
}
