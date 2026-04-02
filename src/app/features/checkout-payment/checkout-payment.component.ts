import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, style, animate, transition } from '@angular/animations';
import { PaymentService, PaymentMethod } from '../../core/services/payment.service';
import { formatCLP } from '../../helpers/formatters';

@Component({
  selector: 'app-checkout-payment',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './checkout-payment.component.html',
  animations: [
    trigger('fadeScale', [
      transition(':enter', [style({ opacity: 0, transform: 'scale(0.95)' }), animate('200ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))])
    ])
  ]
})
export class CheckoutPaymentComponent {
  private readonly paymentSvc = inject(PaymentService);

  readonly formatCLP = formatCLP;

  isLoading      = signal(false);
  isPaid         = signal(false);
  selectedMethod = signal<PaymentMethod>('card');
  transactionId  = signal('');

  readonly booking = {
    professional: 'Dr. Diego Bascur',
    date: new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    time: '10:30',
    service: 'Consulta Médica',
    price: 45000,
  };

  async handlePayment() {
    this.isLoading.set(true);
    const result = await this.paymentSvc.processPayment(this.selectedMethod() as PaymentMethod, this.booking);
    this.isLoading.set(false);
    if (result.success) {
      this.transactionId.set(result.transactionId);
      this.isPaid.set(true);
    }
  }
}