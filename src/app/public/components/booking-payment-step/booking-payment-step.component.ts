import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IPublicPaymentMethod } from '../../../helpers/models';
import { formatCLP } from '../../../helpers/formatters';

@Component({
  selector: 'app-booking-payment-step',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './booking-payment-step.component.html',
  styleUrl: './booking-payment-step.component.scss'
})
export class BookingPaymentStepComponent {
  paymentMethods  = input.required<IPublicPaymentMethod[]>();
  selectedPayment = input<IPublicPaymentMethod | null>(null);
  bookingPrice    = input<number>(0);
  copiedTransfer  = input<boolean>(false);
  acceptedTerms   = input<boolean>(false);

  paymentSelected = output<IPublicPaymentMethod>();
  transferCopy    = output<number>();
  termsToggled    = output<void>();

  readonly formatCLP = formatCLP;
}
