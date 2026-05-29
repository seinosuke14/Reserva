import { Component, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IPublicPaymentMethod } from '../../../helpers/models';
import { formatCLP } from '../../../helpers/formatters';

@Component({
  selector: 'app-booking-confirmed',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './booking-confirmed.component.html',
  styleUrl: './booking-confirmed.component.scss'
})
export class BookingConfirmedComponent {
  private readonly router = inject(Router);

  selectedPayment = input<IPublicPaymentMethod | null>(null);
  bookingPrice    = input<number>(0);
  bookingRef      = input<string>('');
  appointmentId   = input<string>('');
  copiedTransfer  = input<boolean>(false);
  whatsappLink    = input<string>('');

  transferCopy = output<number>();

  readonly formatCLP = formatCLP;

  goToSurvey(): void {
    this.router.navigate(['/reservar/encuesta'], {
      queryParams: { appointmentId: this.appointmentId() },
    });
  }
}
