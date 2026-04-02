import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export type PaymentMethod = 'card' | 'transfer';

export interface BookingDetails {
  appointmentId?: string;
  professional: string;
  date: string;
  time: string;
  service: string;
  price: number;
}

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly http = inject(HttpClient);

  async processPayment(
    _method: PaymentMethod,
    details: BookingDetails
  ): Promise<{ success: boolean; transactionId: string }> {
    // Si viene con appointmentId, marca la cita como pagada en la API
    if (details.appointmentId) {
      try {
        await firstValueFrom(
          this.http.put(`${environment.apiUrl}/appointments/${details.appointmentId}`, {
            paymentStatus: 'Pagado',
          })
        );
      } catch {
        return { success: false, transactionId: '' };
      }
    }

    const transactionId = 'TXN-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    return { success: true, transactionId };
  }
}
