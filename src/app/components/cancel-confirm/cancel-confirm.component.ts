import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-cancel-confirm',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cancel-confirm.component.html',
  styleUrl: './cancel-confirm.component.css',
})
export class CancelConfirmComponent {
  readonly customerName    = input.required<string>();
  readonly appointmentDate = input.required<string>();
  readonly appointmentTime = input.required<string>();
  readonly hasRefund       = input<boolean>(false);
  readonly saving          = input<boolean>(false);

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  formatDate(dateStr: string): string {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-ES', {
      weekday: 'long', day: 'numeric', month: 'long',
    });
  }
}
