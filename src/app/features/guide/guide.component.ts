import { Component } from '@angular/core';
import { UsageGuideComponent, GuideStep } from '../../components/usage-guide/usage-guide.component';

// Vista "¿Cómo usar LR?" para el profesional: 4 pasos para dejar la cuenta
// lista. El contenido detallado de cada paso se irá completando.
@Component({
  selector: 'app-guide',
  standalone: true,
  imports: [UsageGuideComponent],
  templateUrl: './guide.component.html',
  styleUrl: './guide.component.css',
})
export class GuideComponent {
  readonly steps: GuideStep[] = [
    {
      title: 'Configura tus horarios',
      intro: 'Define los días y horas en que atiendes, y bloquea los momentos en que no estás disponible.',
      cta: { label: 'Ir a Horario', link: '/app/horario' },
    },
    {
      title: 'Crea tus servicios',
      intro: 'Agrega los servicios que ofreces, organizados por categoría, con su contenido y detalles.',
      cta: { label: 'Ir a Servicios', link: '/app/servicios' },
    },
    {
      title: 'Configura el medio de pago',
      intro: 'Conecta tu forma de cobro para recibir los pagos de tus reservas.',
      cta: { label: 'Ir a Métodos de Pago', link: '/app/pagos' },
    },
    {
      title: 'Personaliza la vista del cliente',
      intro: 'Ajusta cómo verán tu portal los clientes al momento de agendar.',
      cta: { label: 'Ir a Perfil público', link: '/app/editar' },
    },
  ];
}
