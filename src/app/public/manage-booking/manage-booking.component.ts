import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { formatCLP, formatDateLong } from '../../helpers/formatters';

type ViewState = 'loading' | 'ready' | 'requested' | 'error';

interface IManageBooking {
  bookingRef: string;
  date: string;
  time: string;
  amount: number;
  amountWithVat?: number;
  paymentStatus: 'Pagado' | 'Pendiente' | 'Cancelado' | 'Finalizada';
  cancellationStatus: 'none' | 'requested' | 'rejected';
  refundEligible: boolean;
  professionalName: string | null;
  serviceName: string;
  customerName: string | null;
}

@Component({
  selector: 'app-manage-booking',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './manage-booking.component.html',
  styleUrls: ['./manage-booking.component.css'],
})
export class ManageBookingComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly http  = inject(HttpClient);

  readonly state    = signal<ViewState>('loading');
  readonly booking  = signal<IManageBooking | null>(null);
  readonly reason   = signal('');
  readonly errorMsg = signal('');
  readonly submitting = signal(false);

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
        this.http.get<IManageBooking>(`${environment.apiUrl}/public/booking/manage/${this.token}`)
      );
      this.booking.set(data);
      this.state.set(data.cancellationStatus === 'requested' ? 'requested' : 'ready');
    } catch (err: any) {
      this.errorMsg.set(err?.error?.message ?? 'No se pudo cargar tu reserva.');
      this.state.set('error');
    }
  }

  // true si la cita ya no admite solicitar cancelación (cancelada o finalizada).
  get isClosed(): boolean {
    const b = this.booking();
    return !!b && (b.paymentStatus === 'Cancelado' || b.paymentStatus === 'Finalizada');
  }

  async submitRequest(): Promise<void> {
    if (this.submitting()) return;
    this.submitting.set(true);
    this.errorMsg.set('');
    try {
      await firstValueFrom(
        this.http.post(`${environment.apiUrl}/public/booking/manage/${this.token}/request-cancellation`, {
          reason: this.reason().trim() || undefined,
        })
      );
      this.state.set('requested');
    } catch (err: any) {
      this.errorMsg.set(err?.error?.message ?? 'No se pudo enviar la solicitud. Intenta de nuevo.');
    } finally {
      this.submitting.set(false);
    }
  }
}
