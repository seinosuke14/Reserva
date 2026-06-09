// ─── Utilidades del flujo público de reserva ──────────────────────────────────
// Formulario de cliente, verificación de email y datos de transferencia,
// compartidos por public-booking-portal y company-public-page.

import { signal } from '@angular/core';
import { AbstractControl, FormBuilder, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { chileanPhoneValidator, strictEmailValidator } from '../core/validators/custom-validators';
import { formatCLP } from './formatters';
import { ITransferInfo } from './models';

export type EmailCheckState = 'idle' | 'checking' | 'exists' | 'not-found';

/** Formulario de datos del cliente para reservar (nombre, email, teléfono, notas) */
export function buildBookingForm(fb: FormBuilder) {
  return fb.group({
    name:  ['', [Validators.required, Validators.minLength(3), Validators.maxLength(60), Validators.pattern(/^[A-Za-zÀ-ÿñÑ]+(\s[A-Za-zÀ-ÿñÑ]+)*$/)]],
    email: ['', [Validators.required, Validators.maxLength(254), strictEmailValidator]],
    phone: ['+569', [Validators.required, chileanPhoneValidator]],
    notes: ['', [Validators.maxLength(200)]],
  });
}

/** Normaliza un teléfono chileno al formato +569XXXXXXXX */
export const normalizePhone = (value: string): string => {
  const digits = value.replace(/\D/g, '').replace(/^569/, '');
  return '+569' + digits.slice(0, 8);
};

/** Texto con los datos bancarios de transferencia para copiar al portapapeles */
export function buildTransferText(info: ITransferInfo, amount?: number | null): string {
  const lines = [
    `Banco: ${info.bankName}`,
    `Tipo de cuenta: ${info.accountType}`,
    `Número de cuenta: ${info.accountNumber}`,
    `RUT: ${info.rut}`,
    `Nombre: ${info.holderName}`,
    `Email: ${info.email}`,
  ];
  if (amount != null) lines.push(`Monto: ${formatCLP(amount)}`);
  return lines.join('\n');
}

/** Mensaje de aviso de comprobante de transferencia (WhatsApp / email) */
export const transferReceiptMessage = (name: string, service: string, date: string, hour: string): string =>
  `Hola! Soy ${name}, he realizado una transferencia por la reserva de ${service} el ${date} a las ${hour}. Adjunto comprobante.`;

/**
 * Verifica con debounce si el email ingresado ya tiene cuenta registrada.
 * Llamar a watch() en ngOnInit y destroy() en ngOnDestroy.
 */
export class EmailChecker {
  readonly state = signal<EmailCheckState>('idle');

  private debounce: ReturnType<typeof setTimeout> | null = null;
  private sub: Subscription | null = null;

  watch(
    control: AbstractControl,
    isGuest: () => boolean,
    checkExists: (email: string) => Promise<boolean>,
  ): void {
    this.sub = control.valueChanges.subscribe(email => {
      if (!email || control.invalid || !isGuest()) {
        this.state.set('idle');
        return;
      }
      if (this.debounce) clearTimeout(this.debounce);
      this.state.set('checking');
      this.debounce = setTimeout(async () => {
        const exists = await checkExists(email);
        this.state.set(exists ? 'exists' : 'not-found');
      }, 700);
    });
  }

  destroy(): void {
    this.sub?.unsubscribe();
    if (this.debounce) clearTimeout(this.debounce);
  }
}
