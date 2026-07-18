import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { formatCLP, formatDateLong } from '../../helpers/formatters';

type ViewState = 'loading' | 'ready' | 'error';

interface IPayBooking {
  bookingRef: string;
  date: string;
  time: string;
  amount: number;
  amountWithVat?: number;
  paymentProvider: string;
  paymentDueAt: string | null;
  professionalName: string | null;
  serviceName: string;
  customerName: string | null;
}

@Component({
  selector: 'app-confirm-booking',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './confirm-booking.component.html',
  styleUrls: ['./confirm-booking.component.css'],
})
export class ConfirmBookingComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly http  = inject(HttpClient);

  readonly state    = signal<ViewState>('loading');
  readonly booking  = signal<IPayBooking | null>(null);
  readonly errorMsg = signal('');
  readonly paying   = signal(false);

  readonly formatCLP      = formatCLP;
  readonly formatDateLong = formatDateLong;

  private token = '';

  async ngOnInit(): Promise<void> {
    this.token = this.route.snapshot.paramMap.get('token') ?? '';
    if (!this.token) {
      this.errorMsg.set('Enlace inválido.');
      this.state.set('error');
      return;
    }
    await this.load();
  }

  private async load(): Promise<void> {
    try {
      const data = await firstValueFrom(
        this.http.get<IPayBooking>(`${environment.apiUrl}/public/booking/pay/${this.token}`)
      );
      this.booking.set(data);
      this.state.set('ready');
    } catch (err: any) {
      this.errorMsg.set(err?.error?.message ?? 'No se pudo cargar tu reserva.');
      this.state.set('error');
    }
  }

  async pay(): Promise<void> {
    if (this.paying()) return;
    this.paying.set(true);
    this.errorMsg.set('');
    try {
      const res = await firstValueFrom(
        this.http.post<{ url: string }>(`${environment.apiUrl}/public/booking/pay/${this.token}`, {})
      );
      if (res?.url) {
        window.location.href = res.url;
      } else {
        this.errorMsg.set('No se pudo iniciar el pago. Intenta de nuevo.');
        this.paying.set(false);
      }
    } catch (err: any) {
      this.errorMsg.set(err?.error?.message ?? 'No se pudo iniciar el pago. Intenta de nuevo.');
      this.paying.set(false);
    }
  }
}
