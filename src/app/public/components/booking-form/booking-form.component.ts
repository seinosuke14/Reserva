import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { formatCLP, formatDateLong } from '../../../helpers/formatters';
import { IPublicService } from '../../../helpers/models';

@Component({
  selector: 'app-booking-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="step-3-grid">
      <!-- Formulario -->
      <div class="form-card">
        @if (showLoginHint()) {
          <div class="login-hint">
            <div>
              <p><strong>Ya tienes una cuenta</strong></p>
              <p>Parece que ya tienes una cuenta con este email</p>
              <div class="hint-actions">
                <a href="/login" class="hint-link">Inicia sesion</a>
                <span class="hint-or">o</span>
                <span class="hint-continue">continua como invitado</span>
              </div>
            </div>
          </div>
        }

        <form [formGroup]="bookingForm()" class="portal-form">
          <div class="form-row">
            <div class="field">
              <label class="field-label">Nombre</label>
              <input type="text" formControlName="name" class="field-input" placeholder="Tu nombre completo">
              @if (bookingForm().controls['name'].invalid && bookingForm().controls['name'].touched) {
                <span class="field-error">Requerido (3+ caracteres)</span>
              }
            </div>
            <div class="field">
              <label class="field-label">Email</label>
              <input type="email" formControlName="email" class="field-input" placeholder="tu@email.com">
              @if (bookingForm().controls['email'].invalid && bookingForm().controls['email'].touched) {
                <span class="field-error">Email valido requerido</span>
              }
            </div>
          </div>

          <div class="form-row">
            <div class="field">
              <label class="field-label">Telefono</label>
              <input type="tel" formControlName="phone" class="field-input" placeholder="+56 9 XXXX XXXX">
              @if (bookingForm().controls['phone'].invalid && bookingForm().controls['phone'].touched) {
                <span class="field-error">Requerido</span>
              }
            </div>
          </div>

          <div class="field">
            <label class="field-label"><span class="optional">Notas (opcional)</span></label>
            <textarea formControlName="notes" class="field-input textarea" rows="3" placeholder="Cuentanos si tienes alguna solicitud especial..."></textarea>
          </div>
        </form>
      </div>

      <!-- Resumen -->
      <div class="summary-aside">
        <div class="summary-card">
          <h4 class="summary-title">Resumen</h4>

          <div class="summary-detail">
            <div class="detail-icon">📦</div>
            <div>
              <p class="detail-label">Servicio</p>
              <p class="detail-value">{{ selectedService()?.name }}</p>
            </div>
          </div>

          <div class="summary-detail">
            <div class="detail-icon">📅</div>
            <div>
              <p class="detail-label">Fecha</p>
              <p class="detail-value">{{ formatDate(selectedDate()) }}</p>
            </div>
          </div>

          <div class="summary-detail">
            <div class="detail-icon">⏰</div>
            <div>
              <p class="detail-label">Hora</p>
              <p class="detail-value">{{ selectedHour() }}</p>
            </div>
          </div>

          <div class="summary-price">
            <span>Total</span>
            <span class="price-amount">{{ formatCLP(selectedService()?.price ?? 0) }}</span>
          </div>

          <p class="cancel-notice">Puedes cancelar hasta 24h antes sin costo</p>
        </div>
      </div>
    </div>
  `,
  styleUrl: './booking-form.component.scss'
})
export class BookingFormComponent {
  readonly formatCLP  = formatCLP;
  readonly formatDate = formatDateLong;

  readonly bookingForm = input.required<FormGroup>();
  readonly selectedService = input<IPublicService | null>(null);
  readonly selectedDate = input<string>('');
  readonly selectedHour = input<string | null>(null);
  readonly emailStatus = input<string>('idle');
  readonly showLoginHint = input(false);

}
