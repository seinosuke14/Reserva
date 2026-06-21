import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

/**
 * Modal reutilizable que pide reconfirmar la contraseña antes de una acción
 * sensible (descargar datos, eliminar cuenta, etc.). El componente gestiona el
 * input de contraseña y emite `confirm` con su valor; el padre controla la
 * visibilidad (envolviéndolo en un @if), el estado `busy` y el mensaje de `error`.
 */
@Component({
  selector: 'app-confirm-password-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './confirm-password-modal.component.html',
})
export class ConfirmPasswordModalComponent {
  readonly title        = input.required<string>();
  readonly message      = input.required<string>();
  readonly confirmLabel = input.required<string>();
  readonly busyLabel    = input.required<string>();
  readonly variant      = input<'primary' | 'danger'>('primary');
  readonly busy         = input<boolean>(false);
  readonly error        = input<string | null>(null);
  readonly placeholder  = input<string>('Tu contraseña');

  readonly confirm = output<string>();
  readonly cancel  = output<void>();

  readonly password = signal('');

  submit(): void {
    this.confirm.emit(this.password());
  }
}
