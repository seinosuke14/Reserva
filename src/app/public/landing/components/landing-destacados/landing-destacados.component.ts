import { Component, signal, computed, OnInit, OnDestroy, ViewEncapsulation, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../../environments/environment';

export interface DestacadoPro {
  id: string;
  name: string;
  specialty: string;
  profileImage: string | null;
  slug: string;
  rating: string;
  reviewCount: number;
  appointmentCount: number;
}

const FALLBACK_BGS = [
  'linear-gradient(135deg, #f472b6 0%, #6366f1 50%, #2dd4bf 100%)',
  'linear-gradient(135deg, #0D1B2A 0%, #1d2e47 50%, #E8943A 100%)',
  'linear-gradient(135deg, #fef3c7 0%, #f9a8d4 50%, #c084fc 100%)',
  'linear-gradient(135deg, #14b8a6 0%, #84cc16 50%, #fbbf24 100%)',
  'linear-gradient(135deg, #fbbf24 0%, #ec4899 50%, #8b5cf6 100%)',
  'linear-gradient(135deg, #2BB8A6 0%, #008c75 50%, #0D1B2A 100%)',
];

@Component({
  selector: 'app-landing-destacados',
  standalone: true,
  imports: [],
  templateUrl: './landing-destacados.component.html',
  styleUrls: ['./landing-destacados.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class LandingDestacadosComponent implements OnInit, OnDestroy {
  private readonly http       = inject(HttpClient);
  private readonly isBrowser  = isPlatformBrowser(inject(PLATFORM_ID));

  pros          = signal<DestacadoPro[]>([]);
  carouselIdx   = signal(0);
  loading       = signal(true);
  private intervalId?: ReturnType<typeof setInterval>;

  currentPro = computed(() => this.pros()[this.carouselIdx()] ?? null);

  async ngOnInit() {
    try {
      const data = await firstValueFrom(
        this.http.get<DestacadoPro[]>(`${environment.apiUrl}/public/destacados`)
      );
      this.pros.set(data);
    } catch {
      this.pros.set([]);
    } finally {
      this.loading.set(false);
    }

    if (this.isBrowser) {
      this.intervalId = setInterval(() => {
        this.carouselIdx.update(i => (i + 1) % Math.max(this.pros().length, 1));
      }, 6500);
    }
  }

  ngOnDestroy() {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  prevCarousel() { this.carouselIdx.update(i => (i - 1 + this.pros().length) % this.pros().length); }
  nextCarousel() { this.carouselIdx.update(i => (i + 1) % this.pros().length); }
  setCarousel(i: number) { this.carouselIdx.set(i); }

  fallbackBg(index: number): string { return FALLBACK_BGS[index % FALLBACK_BGS.length]; }
  initial(name: string): string { return name.charAt(0).toUpperCase(); }
  proCategory(specialty: string): string { return specialty || 'Profesional'; }
}
