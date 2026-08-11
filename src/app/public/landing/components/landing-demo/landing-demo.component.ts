import { Component, ViewEncapsulation } from '@angular/core';
import { RouterModule } from '@angular/router';

interface DemoStat { label: string; value: string; delta: string; accent?: boolean; }
interface DemoBar { day: string; value: string; height: number; peak?: boolean; }
interface DemoStep { title: string; body: string; }

@Component({
  selector: 'app-landing-demo',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './landing-demo.component.html',
  styleUrls: ['./landing-demo.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class LandingDemoComponent {
  readonly stats: DemoStat[] = [
    { label: 'Citas esta semana', value: '47', delta: '↑ 12% vs semana pasada' },
    { label: 'Ingresos', value: '$487k', delta: '↑ 18%', accent: true },
    { label: 'Ocupación', value: '82%', delta: '↑ 6 pts' },
  ];

  readonly bars: DemoBar[] = [
    { day: 'Lun', value: '$47k', height: 42 },
    { day: 'Mar', value: '$87k', height: 58 },
    { day: 'Mié', value: '$63k', height: 47 },
    { day: 'Jue', value: '$99k', height: 66 },
    { day: 'Vie', value: '$92k', height: 61 },
    { day: 'Sáb', value: '$151k', height: 100, peak: true },
    { day: 'Dom', value: '$71k', height: 71 },
  ];

  readonly steps: DemoStep[] = [
    { title: 'Citas que se confirman solas', body: 'Tus clientes agendan 24/7 desde tu link. Mensajería automática incluida.' },
    { title: 'Analytics que te dicen qué vender', body: 'Qué servicio está caliente, qué día rinde más, qué cliente vuelve.' },
    { title: 'Recordatorios automáticos', body: '1 hora antes vía WhatsApp o correo. Menos ausencias, más ingresos.' },
  ];
}
