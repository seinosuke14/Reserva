import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { trigger, style, animate, transition } from '@angular/animations';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { formatCLP } from '../../helpers/formatters';

type PaymentState = 'checking' | 'success' | 'error';

@Component({
  selector: 'app-payment-result',
  standalone: true,
  imports: [CommonModule, RouterLink],
  animations: [
    trigger('fadeSlide', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('300ms cubic-bezier(0.4,0,0.2,1)', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ],
  template: `
    <div class="payment-result-container">
      <!-- Estado: Verificando -->
      @if (state() === 'checking') {
        <div class="checking-section">
          <div class="spinner"></div>
          <h2>Verificando pago...</h2>
          <p>Por favor aguarda mientras procesamos tu pago.</p>
        </div>
      }

      <!-- Estado: Éxito -->
      @if (state() === 'success') {
        <div class="success-section" [@fadeSlide]>
          <div class="success-icon">✓</div>
          <h2>¡Pago Confirmado!</h2>
          <p class="subtitle">Tu cita ha sido reservada con éxito.</p>

          <div class="booking-details">
            <div class="detail-row">
              <span class="label">Referencia:</span>
              <span class="value">{{ bookingRef() }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Fecha:</span>
              <span class="value">{{ appointmentDate() }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Hora:</span>
              <span class="value">{{ appointmentTime() }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Monto:</span>
              <span class="value">{{ formatCLP(appointmentAmount()) }}</span>
            </div>
          </div>

          <p class="confirmation-msg">
            Se ha enviado una confirmación a tu correo electrónico.
          </p>

          <!-- Rating -->
          <div class="rating-section">
            @if (ratingSubmitted()) {
              <p class="rating-thanks">Gracias por tu valoración</p>
            } @else {
              <p class="rating-label">¿Cómo calificarías tu experiencia?</p>
              <div class="rating-stars-input">
                @for (star of stars; track star) {
                  <button class="star-btn"
                    (mouseenter)="hoveredStar.set(star)"
                    (mouseleave)="hoveredStar.set(0)"
                    (click)="selectedRating.set(star)">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"
                      [attr.fill]="star <= (hoveredStar() || selectedRating()) ? '#FBBF24' : 'none'"
                      [attr.stroke]="star <= (hoveredStar() || selectedRating()) ? '#FBBF24' : '#D1D5DB'"
                      stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                  </button>
                }
              </div>
              @if (selectedRating()) {
                <button class="btn-rate" (click)="submitRating()" [disabled]="ratingSubmitting()">
                  {{ ratingSubmitting() ? 'Enviando...' : 'Enviar valoración' }}
                </button>
              }
            }
          </div>

          <a routerLink="/" class="btn-primary">Volver al inicio</a>
        </div>
      }

      <!-- Estado: Error -->
      @if (state() === 'error') {
        <div class="error-section" [@fadeSlide]>
          <div class="error-icon">✕</div>
          <h2>{{ errorTitle() }}</h2>
          <p class="subtitle">{{ errorMessage() }}</p>

          <div class="action-buttons">
            <button (click)="goBack()" class="btn-secondary">Volver a intentar</button>
            <a routerLink="/" class="btn-primary">Ir a inicio</a>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .payment-result-container {
      max-width: 600px;
      margin: 60px auto;
      padding: 24px;
    }

    .checking-section {
      text-align: center;
      padding: 40px 0;
    }

    .spinner {
      width: 48px;
      height: 48px;
      border: 4px solid #E5E7EB;
      border-top-color: #3B82F6;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 24px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .checking-section h2 {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 8px;
      color: #111827;
    }

    .checking-section p {
      color: #6B7280;
    }

    .success-section,
    .error-section {
      text-align: center;
      padding: 32px;
      background: #F9FAFB;
      border-radius: 12px;
      border: 1px solid #E5E7EB;
    }

    .success-icon {
      font-size: 48px;
      color: #10B981;
      margin-bottom: 16px;
    }

    .error-icon {
      font-size: 48px;
      color: #EF4444;
      margin-bottom: 16px;
    }

    h2 {
      font-size: 24px;
      font-weight: 700;
      margin: 0 0 8px;
      color: #111827;
    }

    .subtitle {
      color: #6B7280;
      margin-bottom: 24px;
    }

    .booking-details {
      background: white;
      border-radius: 8px;
      padding: 16px;
      margin: 24px 0;
      text-align: left;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #E5E7EB;
    }

    .detail-row:last-child {
      border-bottom: none;
    }

    .label {
      color: #6B7280;
      font-weight: 500;
    }

    .value {
      color: #111827;
      font-weight: 600;
    }

    .confirmation-msg {
      color: #059669;
      font-size: 14px;
      margin: 16px 0 24px;
    }

    .action-buttons {
      display: flex;
      gap: 12px;
      margin-top: 24px;
    }

    .btn-primary,
    .btn-secondary {
      flex: 1;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 600;
      text-decoration: none;
      text-align: center;
      cursor: pointer;
      border: none;
      font-size: 14px;
      transition: all 0.2s;
    }

    .btn-primary {
      background: #3B82F6;
      color: white;
    }

    .btn-primary:hover {
      background: #2563EB;
    }

    .btn-secondary {
      background: white;
      color: #3B82F6;
      border: 2px solid #3B82F6;
    }

    .btn-secondary:hover {
      background: #EFF6FF;
    }

    .rating-section {
      margin: 24px 0;
      padding: 20px;
      background: white;
      border-radius: 12px;
      border: 1px solid #E5E7EB;
    }

    .rating-label {
      font-size: 14px;
      font-weight: 600;
      color: #374151;
      margin: 0 0 12px;
    }

    .rating-stars-input {
      display: flex;
      justify-content: center;
      gap: 4px;
    }

    .star-btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px;
      transition: transform 0.15s;
    }

    .star-btn:hover {
      transform: scale(1.2);
    }

    .btn-rate {
      margin-top: 12px;
      padding: 8px 20px;
      background: #FBBF24;
      color: #78350F;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }

    .btn-rate:hover {
      background: #F59E0B;
    }

    .btn-rate:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .rating-thanks {
      color: #059669;
      font-weight: 600;
      font-size: 14px;
      margin: 0;
    }
  `]
})
export class PaymentResultComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);

  readonly state = signal<PaymentState>('checking');
  readonly formatCLP = formatCLP;

  readonly bookingRef = signal('');
  readonly appointmentDate = signal('');
  readonly appointmentTime = signal('');
  readonly appointmentAmount = signal(0);

  readonly errorTitle = signal('Pago no confirmado');
  readonly errorMessage = signal('No se pudo procesar tu pago. Intenta de nuevo.');

  // Rating
  readonly hoveredStar = signal(0);
  readonly selectedRating = signal(0);
  readonly ratingSubmitted = signal(false);
  readonly ratingSubmitting = signal(false);
  readonly stars = [1, 2, 3, 4, 5];
  private appointmentId = '';

  private slug = '';

  async ngOnInit(): Promise<void> {
    // Leer slug para volver a la reserva correcta
    this.slug = this.route.snapshot.queryParamMap.get('slug') ?? '';

    // Verificar si fue cancelado en Webpay
    const cancelled = this.route.snapshot.queryParamMap.get('cancelled');
    if (cancelled === 'true') {
      this.showError('Pago cancelado', 'Cancelaste el proceso de pago. Tu reserva ha sido liberada.');
      return;
    }

    // Buscar token de confirmación
    const tokenWs = this.route.snapshot.queryParamMap.get('token_ws');
    if (!tokenWs) {
      this.showError('Token inválido', 'No se encontró el token de pago.');
      return;
    }

    try {
      const result: any = await firstValueFrom(
        this.http.post(`${environment.apiUrl}/public/webpay/confirm`, { token_ws: tokenWs })
      );

      this.bookingRef.set(result.bookingRef);
      this.appointmentDate.set(this.formatDate(result.appointment.date));
      this.appointmentTime.set(result.appointment.time);
      this.appointmentAmount.set(result.appointment.amount);
      this.appointmentId = result.appointment.id;

      this.state.set('success');
    } catch (err: any) {
      const message = err?.error?.message || 'Error al confirmar el pago. Intenta de nuevo.';
      this.showError('Pago rechazado', message);
    }
  }

  private showError(title: string, message: string): void {
    this.errorTitle.set(title);
    this.errorMessage.set(message);
    this.state.set('error');
  }

  goBack(): void {
    if (this.slug) {
      this.router.navigate(['/reservar', this.slug]);
    } else {
      this.router.navigate(['/']);
    }
  }

  async submitRating(): Promise<void> {
    if (!this.selectedRating() || !this.appointmentId) return;
    this.ratingSubmitting.set(true);
    try {
      await firstValueFrom(
        this.http.post(`${environment.apiUrl}/public/rate`, {
          appointmentId: this.appointmentId,
          rating: this.selectedRating(),
        })
      );
      this.ratingSubmitted.set(true);
    } catch {
      this.ratingSubmitted.set(true);
    } finally {
      this.ratingSubmitting.set(false);
    }
  }

  private formatDate(dateStr: string): string {
    return new Intl.DateTimeFormat('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(new Date(dateStr + 'T12:00:00'));
  }
}
