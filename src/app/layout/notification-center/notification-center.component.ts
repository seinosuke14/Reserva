import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate } from '@angular/animations';
import { NotificationService } from '../../core/services/notification.service';
import { NotificationType } from '../../data/mock-notifications';

@Component({
  selector: 'app-notification-center',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-center.component.html',
  animations: [
    trigger('panelAnim', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.95) translateY(10px)' }),
        animate('180ms ease-out', style({ opacity: 1, transform: 'scale(1) translateY(0)' }))
      ]),
      transition(':leave', [
        animate('150ms ease-in', style({ opacity: 0, transform: 'scale(0.95) translateY(10px)' }))
      ])
    ]),
    trigger('backdropAnim', [
      transition(':enter', [style({ opacity: 0 }), animate('150ms', style({ opacity: 1 }))]),
      transition(':leave', [animate('150ms', style({ opacity: 0 }))])
    ])
  ]
})
export class NotificationCenterComponent {
  @Input() isOpen = false;
  @Output() closed = new EventEmitter<void>();

  readonly svc = inject(NotificationService);

  iconClass(type: NotificationType): string {
    return type === 'appointment' ? 'text-blue-500'
         : type === 'payment'     ? 'text-green-500'
         : 'text-red-500';
  }

  iconBg(type: NotificationType): string {
    return type === 'appointment' ? 'bg-blue-50'
         : type === 'payment'     ? 'bg-green-50'
         : 'bg-red-50';
  }
}