import { Component, signal, computed, OnInit, OnDestroy, ViewEncapsulation, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export interface Pro {
  name: string;
  loc: string;
  quote: string;
  stats: [string, string][];
  initial: string;
  bg: string;
}

@Component({
  selector: 'app-landing-destacados',
  standalone: true,
  templateUrl: './landing-destacados.component.html',
  styleUrls: ['./landing-destacados.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class LandingDestacadosComponent implements OnInit, OnDestroy {
  carouselIdx = signal(0);
  private intervalId?: ReturnType<typeof setInterval>;
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly pros: Pro[] = [
    {
      name: 'Salón Alejandra', loc: 'Providencia · Peluquería',
      quote: 'Dejé el cuaderno. Ahora sé qué servicio me rinde y a qué hora vendo más. Mis clientes agendan solas, yo me dedico a cortar.',
      stats: [['+38%', 'Citas confirmadas'], ['-72%', 'Ausencias'], ['$1.4M', 'Mes pasado']],
      initial: 'A', bg: 'linear-gradient(135deg, #f472b6 0%, #6366f1 50%, #2dd4bf 100%)',
    },
    {
      name: 'Barbería Fierro', loc: 'Ñuñoa · Barbería',
      quote: 'Los recordatorios automáticos me bajaron los no-show a casi cero. Cada hora libre la lleno solo con clientes recurrentes.',
      stats: [['+52%', 'Agenda llena'], ['4.8 ★', 'Reseñas reales'], ['96', 'Clientes/mes']],
      initial: 'F', bg: 'linear-gradient(135deg, #0D1B2A 0%, #1d2e47 50%, #E8943A 100%)',
    },
    {
      name: 'Estudio Nova', loc: 'Las Condes · Estética',
      quote: 'Los analytics me mostraron que mi día más fuerte era el jueves. Reorganicé el equipo y subí 20% mis ingresos en un mes.',
      stats: [['+20%', 'Ingresos'], ['5.0 ★', 'Rating'], ['210', 'Reseñas']],
      initial: 'N', bg: 'linear-gradient(135deg, #fef3c7 0%, #f9a8d4 50%, #c084fc 100%)',
    },
    {
      name: 'Patitas Felices', loc: 'Vitacura · Paseo mascotas',
      quote: 'Antes de LETS RESERVE agendaba por WhatsApp y se me cruzaban paseos. Ahora cada ruta cuadra perfecto y duplico clientes.',
      stats: [['x2', 'Clientes nuevos'], ['+40%', 'Rutas optimizadas'], ['84', 'Mascotas activas']],
      initial: 'P', bg: 'linear-gradient(135deg, #14b8a6 0%, #84cc16 50%, #fbbf24 100%)',
    },
    {
      name: 'Nails by Camila', loc: 'Bellas Artes · Manicure',
      quote: 'El perfil personalizable me dejó mostrar mis diseños como portfolio. Clientes nuevos me encuentran y agendan al toque.',
      stats: [['+65%', 'Clientes nuevos'], ['4.9 ★', '152 reseñas'], ['+$380k', 'Ingreso extra/mes']],
      initial: 'C', bg: 'linear-gradient(135deg, #fbbf24 0%, #ec4899 50%, #8b5cf6 100%)',
    },
  ];

  currentPro = computed(() => this.pros[this.carouselIdx()]);

  ngOnInit() {
    if (!this.isBrowser) return;
    this.intervalId = setInterval(() => {
      this.carouselIdx.update(i => (i + 1) % this.pros.length);
    }, 6500);
  }

  ngOnDestroy() {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  prevCarousel() { this.carouselIdx.update(i => (i - 1 + this.pros.length) % this.pros.length); }
  nextCarousel() { this.carouselIdx.update(i => (i + 1) % this.pros.length); }
  setCarousel(i: number) { this.carouselIdx.set(i); }

  proCategory(loc: string): string {
    return loc.split('·')[1]?.trim() || 'profesional';
  }
}
