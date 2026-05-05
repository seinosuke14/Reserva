import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export type NotificationType = 'appointment' | 'payment' | 'cancellation';

export interface INotification {
  id: string;
  type: NotificationType;
  message: string;
  timestamp: string;
  isRead: boolean;
}

interface IAppt {
  id: string;
  date: string;
  time: string;
  paymentStatus: 'Pagado' | 'Pendiente' | 'Cancelado';
  customer: { name: string };
  service:  { name: string };
  createdAt?: string;
  updatedAt?: string;
}

const SEEN_KEY   = 'crm_notif_seen';
const POLL_MS    = 30_000;
const DAYS_BACK  = 30;

// seen = { [appointmentId]: lastAcknowledgedStatus }
type SeenMap = Record<string, string>;

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);

  private readonly _notifications = signal<INotification[]>([]);
  private _timer: ReturnType<typeof setInterval> | null = null;

  readonly notifications = this._notifications.asReadonly();
  readonly unreadCount   = computed(() => this._notifications().filter(n => !n.isRead).length);

  /** Inicia carga y polling automático */
  async load(): Promise<void> {
    await this._fetch();
    if (!this._timer) {
      this._timer = setInterval(() => this._fetch(), POLL_MS);
    }
  }

  stopPolling(): void {
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
  }

  markAsRead(id: string): void {
    this._notifications.update(list =>
      list.map(n => n.id === id ? { ...n, isRead: true } : n)
    );
    this._saveOneSeen(id);
  }

  markAllAsRead(): void {
    const list = this._notifications();
    this._notifications.update(l => l.map(n => ({ ...n, isRead: true })));
    const seen = this._loadSeen();
    for (const n of list) seen[n.id] = this._statusFromType(n.type);
    this._writeSeen(seen);
  }

  remove(id: string): void {
    this._saveOneSeen(id);
    this._notifications.update(list => list.filter(n => n.id !== id));
  }

  clearAll(): void {
    const seen = this._loadSeen();
    for (const n of this._notifications()) seen[n.id] = this._statusFromType(n.type);
    this._writeSeen(seen);
    this._notifications.set([]);
  }

  // ── Internos ─────────────────────────────────────────────────

  private async _fetch(): Promise<void> {
    try {
      const appts = await firstValueFrom(
        this.http.get<IAppt[]>(`${environment.apiUrl}/appointments`)
      );

      const seen     = this._loadSeen();
      const cutoff   = new Date();
      cutoff.setDate(cutoff.getDate() - DAYS_BACK);
      const cutoffStr = cutoff.toISOString().slice(0, 10);

      // Detectar eventos nuevos o con cambio de estado respecto a lo ya visto
      const current  = this._notifications();
      const inPanel  = new Map(current.map(n => [n.id, n]));
      const toAdd: INotification[] = [];

      for (const a of appts) {
        if (a.date < cutoffStr) continue;

        const seenStatus = seen[a.id];
        const inList     = inPanel.get(a.id);

        if (seenStatus === a.paymentStatus) continue; // ya acusado y sin cambio

        if (!inList) {
          // Evento nuevo: nunca visto o ya descartado y cambió de estado
          toAdd.push(this._toNotif(a));
        } else if (inList.isRead && seenStatus !== a.paymentStatus) {
          // El usuario leyó la versión anterior pero el estado volvió a cambiar
          toAdd.push(this._toNotif(a));
          // Reemplazar la entrada existente
          inPanel.delete(a.id);
        }
        // Si está en panel y no leído → no tocar (no molestar al usuario)
      }

      if (toAdd.length === 0) return; // sin cambios → no mutar la señal

      const merged = [...toAdd, ...Array.from(inPanel.values())]
        .slice(0, 20);

      this._notifications.set(merged);
    } catch { }
  }

  private _toNotif(a: IAppt): INotification {
    return {
      id:        a.id,
      type:      a.paymentStatus === 'Pagado'    ? 'payment'
               : a.paymentStatus === 'Cancelado' ? 'cancellation'
               : 'appointment',
      message:   a.paymentStatus === 'Pagado'
                   ? `Pago confirmado · ${a.customer?.name ?? '—'} · ${a.service?.name ?? '—'}`
               : a.paymentStatus === 'Cancelado'
                   ? `Cita cancelada · ${a.customer?.name ?? '—'} · ${a.date} ${a.time}`
                   : `Nueva cita · ${a.customer?.name ?? '—'} · ${a.service?.name ?? '—'} (${a.date} ${a.time})`,
      timestamp: this._relTime(a.updatedAt ?? a.createdAt ?? `${a.date}T${a.time}`),
      isRead:    false,
    };
  }

  private _saveOneSeen(id: string): void {
    const notif = this._notifications().find(n => n.id === id);
    if (!notif) return;
    const seen = this._loadSeen();
    seen[id] = this._statusFromType(notif.type);
    this._writeSeen(seen);
  }

  private _statusFromType(type: NotificationType): string {
    return type === 'payment' ? 'Pagado' : type === 'cancellation' ? 'Cancelado' : 'Pendiente';
  }

  private _loadSeen(): SeenMap {
    try { return JSON.parse(localStorage.getItem(SEEN_KEY) ?? '{}'); } catch { return {}; }
  }

  private _writeSeen(seen: SeenMap): void {
    localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
  }

  private _relTime(iso: string): string {
    const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (diffMin <= 1)  return 'ahora';
    if (diffMin < 60)  return `hace ${diffMin} min`;
    const diffH = Math.round(diffMin / 60);
    if (diffH < 24)    return `hace ${diffH}h`;
    const diffD = Math.round(diffH / 24);
    return `hace ${diffD} día${diffD > 1 ? 's' : ''}`;
  }
}
