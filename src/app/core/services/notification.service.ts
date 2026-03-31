import { Injectable, signal, computed } from '@angular/core';
import { INotification, MOCK_NOTIFICATIONS } from '../../data/mock-notifications';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly _notifications = signal<INotification[]>([...MOCK_NOTIFICATIONS]);

  readonly notifications = this._notifications.asReadonly();
  readonly unreadCount = computed(() => this._notifications().filter(n => !n.isRead).length);

  markAsRead(id: string): void {
    this._notifications.update(list => list.map(n => n.id === id ? { ...n, isRead: true } : n));
  }

  markAllAsRead(): void {
    this._notifications.update(list => list.map(n => ({ ...n, isRead: true })));
  }

  remove(id: string): void {
    this._notifications.update(list => list.filter(n => n.id !== id));
  }

  clearAll(): void {
    this._notifications.set([]);
  }
}