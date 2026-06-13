import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-name-change-confirm',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './name-change-confirm.component.html',
  styleUrl: './name-change-confirm.component.css',
})
export class NameChangeConfirmComponent {
  /** Nombre que el cliente suele usar (guardado en BD para ese correo). */
  readonly fromName = input.required<string>();
  /** Nombre nuevo que el cliente ingresó ahora. */
  readonly toName   = input.required<string>();

  /** El cliente confirma cambiar el nombre asociado a su correo. */
  readonly confirmed = output<void>();
  /** El cliente prefiere mantener el nombre que suele usar. */
  readonly cancelled = output<void>();
}
