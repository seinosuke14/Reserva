import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface IPublicService {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
}

@Component({
  selector: 'app-booking-service-selector',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="step-content">
      <div class="step-header">
        <h3 class="step-title">Selecciona el servicio</h3>
        <p class="step-desc">Elige el servicio que deseas reservar</p>
      </div>
      <div class="services-grid">
        @for (service of services(); track service.id) {
          <div class="service-card"
            [class.selected]="selectedService()?.id === service.id"
            (click)="onServiceSelect(service)">
            <div class="service-check">✓</div>
            <div class="service-body">
              <p class="service-name">{{ service.name }}</p>
              <p class="service-desc">{{ service.description }}</p>
              <div class="service-meta">
                <span class="service-duration">
                  ⏱ {{ service.duration }}min
                </span>
                <span class="service-price">{{ formatPrice(service.price) }}</span>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styleUrl: './booking-service-selector.component.scss'
})
export class BookingServiceSelectorComponent {
  readonly services = input<IPublicService[]>([]);
  readonly selectedService = input<IPublicService | null>(null);
  readonly serviceSelected = output<IPublicService>();

  onServiceSelect(service: IPublicService): void {
    this.serviceSelected.emit(service);
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(price);
  }
}
