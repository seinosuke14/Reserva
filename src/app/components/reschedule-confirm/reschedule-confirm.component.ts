import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { formatDateLong } from '../../helpers/formatters';

@Component({
  selector: 'app-reschedule-confirm',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reschedule-confirm.component.html',
  styleUrl: './reschedule-confirm.component.css',
})
export class RescheduleConfirmComponent {
  readonly customerName = input.required<string>();
  readonly newDate      = input.required<string>();
  readonly newTime      = input.required<string>();
  readonly saving       = input<boolean>(false);

  readonly confirmed  = output<void>();
  readonly cancelled  = output<void>();

  readonly formatDate = formatDateLong;
}
