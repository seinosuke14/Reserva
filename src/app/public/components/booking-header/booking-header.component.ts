import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-booking-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="portal-header">
      <div class="header-inner">
        <div class="prof-info">
          <div class="prof-avatar">{{ professional()?.name.charAt(0) }}</div>
          <div>
            <p class="prof-name">{{ professional()?.slug || professional()?.name }}</p>
            <p class="prof-specialty">{{ professional()?.specialty }}</p>
          </div>
        </div>
        <span class="status-badge">
          <span class="status-dot"></span>
          Disponible
        </span>
      </div>
    </header>
  `,
  styleUrl: './booking-header.component.scss'
})
export class BookingHeaderComponent {
  readonly professional = input<any>(null);
}
