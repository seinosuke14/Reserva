import { Component, signal, computed, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { RouterModule } from '@angular/router';

export interface Vertical {
  label: string;
  bg: string;
  bgImage?: string;
}

@Component({
  selector: 'app-landing-hero',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './landing-hero.component.html',
  styleUrls: ['./landing-hero.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class LandingHeroComponent implements OnInit, OnDestroy {
  vertical = signal('peluqueria');
  progress = signal(0);

  readonly verticalKeys = ['peluqueria', 'barberia', 'estetica', 'mascotas', 'unas'];

  readonly verticals: Record<string, Vertical> = {
    peluqueria: {
      label: 'Peluquería',
      bg: 'radial-gradient(ellipse 900px 600px at 80% 50%, rgba(244,114,182,.18) 0%, transparent 70%), radial-gradient(ellipse 600px 500px at 20% 80%, rgba(99,102,241,.15) 0%, transparent 60%)',
      bgImage: '/salonBelleza.jpg',
    },
    barberia: {
      label: 'Barbería',
      bg: 'radial-gradient(ellipse 900px 600px at 80% 50%, rgba(219,150,72,.18) 0%, transparent 70%), radial-gradient(ellipse 600px 500px at 20% 80%, rgba(30,41,59,.4) 0%, transparent 60%)',
      bgImage: '/barbero.png',
    },
    estetica: {
      label: 'Peluquería canina',
      bg: 'radial-gradient(ellipse 900px 600px at 80% 50%, rgba(132,204,22,.15) 0%, transparent 70%), radial-gradient(ellipse 600px 500px at 20% 80%, rgba(20,184,166,.12) 0%, transparent 60%)',
      bgImage: '/PeluqueriaCanina.png',
    },
    mascotas: {
      label: 'Paseo de mascotas',
      bg: 'radial-gradient(ellipse 900px 600px at 80% 50%, rgba(132,204,22,.15) 0%, transparent 70%), radial-gradient(ellipse 600px 500px at 20% 80%, rgba(20,184,166,.15) 0%, transparent 60%)',
      bgImage: '/paseoCan.png',
    },
    unas: {
      label: 'Tarot',
      bg: 'radial-gradient(ellipse 900px 600px at 80% 50%, rgba(139,92,246,.25) 0%, transparent 70%), radial-gradient(ellipse 600px 500px at 20% 80%, rgba(76,29,149,.3) 0%, transparent 60%)',
      bgImage: '/tarot.png',
    },
  };

  currentVertical = computed(() => this.verticals[this.vertical()]);

  private timer: ReturnType<typeof setInterval> | null = null;

  ngOnInit() { this.startTimer(); }
  ngOnDestroy() { this.stopTimer(); }

  setVertical(key: string) {
    this.vertical.set(key);
    this.startTimer();
  }

  private startTimer() {
    this.stopTimer();
    this.progress.set(0);
    this.timer = setInterval(() => {
      const next = this.progress() + 1;
      if (next > 100) {
        const idx = this.verticalKeys.indexOf(this.vertical());
        this.vertical.set(this.verticalKeys[(idx + 1) % this.verticalKeys.length]);
        this.progress.set(0);
      } else {
        this.progress.set(next);
      }
    }, 50);
  }

  private stopTimer() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }
}
