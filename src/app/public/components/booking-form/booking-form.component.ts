import { Component, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

export interface IPublicService {
  id: string;
  name: string;
  price: number;
}

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
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8m3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/></svg>
            <div>
              <p><strong>{{ emailStatus() === 'exists' ? 'Ya tienes una cuenta' : '' }}</strong></p>
              <p>{{ emailMessage() }}</p>
              <div class="hint-actions">
                <a href="/login" class="hint-link">Inicia sesión</a>
                <span class="hint-or">o</span>
                <span class="hint-continue">continúa como invitado</span>
              </div>
            </div>
          </div>
        }

        <form [formGroup]="form" class="portal-form">
          <div class="form-row">
            <div class="field">
              <label class="field-label">Nombre</label>
              <input type="text" formControlName="name" class="field-input" placeholder="Tu nombre completo">
              @if (f['name'].invalid && f['name'].touched) {
                <span class="field-error">Requerido (3+ caracteres)</span>
              }
            </div>
            <div class="field">
              <label class="field-label">Email</label>
              <div class="email-wrapper">
                <input type="email" formControlName="email" class="field-input" placeholder="tu@email.com">
                @if (emailCheckState() === 'checking') {
                  <span class="email-status checking">⏳</span>
                } @else if (emailCheckState() === 'ok') {
                  <span class="email-status ok">✓</span>
                }
              </div>
              @if (f['email'].invalid && f['email'].touched) {
                <span class="field-error">Email válido requerido</span>
              }
            </div>
          </div>

          <div class="form-row">
            <div class="field">
              <label class="field-label">Teléfono</label>
              <input type="tel" formControlName="phone" class="field-input" placeholder="+56 9 XXXX XXXX">
              @if (f['phone'].invalid && f['phone'].touched) {
                <span class="field-error">Requerido</span>
              }
            </div>
          </div>

          <div class="field">
            <label class="field-label"><span class="optional">Notas (opcional)</span></label>
            <textarea formControlName="notes" class="field-input textarea" rows="3" placeholder="Cuéntanos si tienes alguna solicitud especial..."></textarea>
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
            <span class="price-amount">{{ formatPrice(selectedService()?.price ?? 0) }}</span>
          </div>

          <p class="cancel-notice">💡 Puedes cancelar hasta 24h antes sin costo</p>
        </div>
      </div>
    </div>
  `,
  styleUrl: './booking-form.component.scss'
})
export class BookingFormComponent {
  private readonly fb = inject(FormBuilder);

  readonly selectedService = input<IPublicService | null>(null);
  readonly selectedDate = input<string>('');
  readonly selectedHour = input<string | null>(null);
  readonly emailStatus = input<string>('idle');
  readonly showLoginHint = input(false);

  readonly form = this.fb.group({
    name:  ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', Validators.required],
    notes: [''],
  });

  get f() { return this.form.controls; }

  get emailCheckState() {
    return () => this.emailStatus();
  }

  get emailMessage() {
    const status = this.emailStatus();
    return () => status === 'exists'
      ? 'Parece que ya tienes una cuenta con este email'
      : '';
  }

  formatDate(dateStr: string): string {
    return new Intl.DateTimeFormat('es-ES', {
      weekday: 'long', day: 'numeric', month: 'long'
    }).format(new Date(dateStr + 'T12:00:00'));
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(price);
  }
}
