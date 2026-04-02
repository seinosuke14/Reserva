import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-booking-step-indicator',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="stepper">
      @for (stepNum of [1, 2, 3]; track stepNum) {
        <div class="step-item">
          <div class="step-bubble" [ngClass]="getStepClass(stepNum)">
            {{ currentStep() >= stepNum ? '✓' : stepNum }}
          </div>
          <span class="step-label" [ngClass]="{ active: currentStep() === stepNum }">
            {{ getStepLabel(stepNum) }}
          </span>
        </div>
        @if (stepNum < 3) {
          <div class="step-line" [ngClass]="{ active: currentStep() > stepNum }"></div>
        }
      }
    </div>
  `,
  styleUrl: './booking-step-indicator.component.scss'
})
export class BookingStepIndicatorComponent {
  readonly currentStep = input<1 | 2 | 3>(1);

  getStepClass(step: number): string {
    if (this.currentStep() > step) return 'done';
    if (this.currentStep() === step) return 'active';
    return '';
  }

  getStepLabel(step: number): string {
    return ['Servicio', 'Fecha', 'Datos'][step - 1];
  }
}
