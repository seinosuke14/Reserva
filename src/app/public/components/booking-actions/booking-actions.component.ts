import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-booking-actions',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="step-actions" [class.space-between]="!isFirstStep()">
      @if (!isFirstStep()) {
        <button class="btn-ghost" (click)="onBack()">← Atrás</button>
      }
      @if (!isLastStep()) {
        <button class="btn-primary" (click)="onNext()" [disabled]="!canProceed()">
          Siguiente →
        </button>
      } @else {
        <button class="btn-confirm" (click)="onConfirm()" [disabled]="!canProceed()">
          Confirmar Reserva
        </button>
      }
    </div>
  `,
  styleUrl: './booking-actions.component.scss'
})
export class BookingActionsComponent {
  readonly currentStep = input<1 | 2 | 3>(1);
  readonly canProceed = input(false);

  readonly back = output<void>();
  readonly next = output<void>();
  readonly confirm = output<void>();

  get isFirstStep() {
    return () => this.currentStep() === 1;
  }

  get isLastStep() {
    return () => this.currentStep() === 3;
  }

  onBack(): void {
    this.back.emit();
  }

  onNext(): void {
    this.next.emit();
  }

  onConfirm(): void {
    this.confirm.emit();
  }
}
