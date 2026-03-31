import { Injectable } from '@angular/core';

export type PaymentMethod = 'card' | 'transfer';

export interface BookingDetails {
  professional: string;
  date: string;
  time: string;
  service: string;
  price: number;
}

@Injectable({ providedIn: 'root' })
export class PaymentService {
  async processPayment(method: PaymentMethod, details: BookingDetails): Promise<{ success: boolean; transactionId: string }> {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({ success: true, transactionId: 'TXN-' + Math.random().toString(36).substring(2, 10).toUpperCase() });
      }, 2000);
    });
  }
}