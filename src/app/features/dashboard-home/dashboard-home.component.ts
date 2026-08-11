import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { formatCLP } from '../../helpers/formatters';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import { ReferralCardComponent } from '../../components/referral-card/referral-card.component';

interface IAppointment {
  id: string;
  date: string;
  time: string;
  amount: number;
  paymentStatus: 'Pagado' | 'Pendiente' | 'Cancelado' | 'Finalizada';
  cancellationStatus?: 'none' | 'requested' | 'rejected';
  paymentProvider?: string | null;
  mpPaymentId?: string | null;
  refundStatus?: string | null;
  customer: { id: string; name: string };
  service:  { id: string; name: string; duration?: number };
  createdAt?: string;
  updatedAt?: string;
}

interface IBar {
  x: number;
  barH: number;
  value: number;
  label: string;
  isToday: boolean;
}

interface IActivity {
  text: string;
  color: string;
  time: string;
}

/** Una fila de la agenda de hoy, ya resuelta para pintar (sin lógica en el template). */
interface IAgendaItem {
  id: string;
  time: string;
  customer: string;
  service: string;
  amount: number;
  status: IAppointment['paymentStatus'];
  /** past = ya terminó · now = en curso · next = la próxima · upcoming = más tarde */
  state: 'past' | 'now' | 'next' | 'upcoming';
  statusLabel: string;
}

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [CommonModule, ReferralCardComponent],
  templateUrl: './dashboard-home.component.html',
})
export class DashboardHomeComponent implements OnInit, OnDestroy {
  private readonly http   = inject(HttpClient);
  private readonly auth   = inject(AuthService);
  private readonly router = inject(Router);
  readonly formatCLP      = formatCLP;

  /** Fecha local de hoy (YYYY-MM-DD), sin corrimiento por zona horaria. */
  private _localDateStr(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  readonly today = this._localDateStr(new Date());

  /** "Lunes 27 de julio" — encabezado del panel. */
  readonly todayLabel = (() => {
    const s = new Intl.DateTimeFormat('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })
      .format(new Date())
      .replace(',', '');
    return s.charAt(0).toUpperCase() + s.slice(1);
  })();

  readonly ownerName = computed(() => this.auth.currentUser()?.name ?? 'Tu agenda');

  /** Una cita cuenta como ingreso real si está Pagada o Finalizada. */
  private readonly isPaid = (status: string): boolean => status === 'Pagado' || status === 'Finalizada';

  todayAppointments = signal<IAppointment[]>([]);
  allAppointments   = signal<IAppointment[]>([]);
  activeClientCount = signal(0);
  isLoading         = signal(true);
  copied            = signal(false);
  aptFilter         = signal<'todos' | 'Pagado' | 'Pendiente' | 'Cancelado'>('todos');
  hoveredBar        = signal<number | null>(null);
  /** Semana mostrada en el gráfico: 0 = actual, -1 = anterior, … (acotado al mes actual). */
  weekOffset        = signal(0);

  /** Minuto actual del día: marca qué cita está en curso en la agenda. */
  private readonly nowMinutes = signal(this._minutesNow());
  private _clock?: ReturnType<typeof setInterval>;

  private _minutesNow(): number {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  }

  private _toMinutes(hhmm: string): number {
    const [h, m] = hhmm.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }

  readonly linkBanner = computed(() => {
    const user = this.auth.currentUser();
    if (user?.slug && !user?.companyId) return {
      url:   `${window.location.origin}/reservar/${user.slug}`,
      label: 'Tu link de agendamiento',
    };
    if (user?.companyId && user?.companySlug) return {
      url:   `${window.location.origin}/empresa/${user.companySlug}`,
      label: 'Link de agendamiento (vía empresa)',
    };
    return null;
  });

  /** El link completo, partido en dominio + identificador para destacar el slug. */
  readonly bookingLink = computed(() => {
    const b = this.linkBanner();
    if (!b) return null;
    const bare = b.url.replace(/^https?:\/\//, '');
    const cut  = bare.lastIndexOf('/');
    return { url: b.url, base: bare.slice(0, cut + 1), slug: bare.slice(cut + 1), label: b.label };
  });

  // Solicitudes de cancelación pendientes de revisar (cliente solicitó, aún vigente).
  readonly cancellationRequests = computed(() =>
    this.allAppointments().filter(a =>
      a.cancellationStatus === 'requested' &&
      a.paymentStatus !== 'Cancelado' &&
      a.paymentStatus !== 'Finalizada'
    )
  );

  // Reembolsos de citas canceladas (mercadopago_connect) que NO quedaron aprobados.
  // Como las citas canceladas no se ven en la agenda, aquí es donde el profesional las gestiona.
  readonly pendingRefunds = computed(() =>
    this.allAppointments().filter(a =>
      a.paymentProvider === 'mercadopago_connect' &&
      a.paymentStatus === 'Cancelado' &&
      !!a.mpPaymentId &&
      a.refundStatus !== 'approved'
    )
  );

  readonly retryingRefundId = signal<string | null>(null);
  readonly refundMsg        = signal<Record<string, string>>({});

  async retryRefund(apt: IAppointment): Promise<void> {
    if (this.retryingRefundId()) return;
    this.retryingRefundId.set(apt.id);
    this.refundMsg.update(m => ({ ...m, [apt.id]: '' }));
    try {
      const res: any = await firstValueFrom(
        this.http.post(`${environment.apiUrl}/appointments/${apt.id}/refund/retry`, {})
      );
      this.refundMsg.update(m => ({ ...m, [apt.id]: res?.message ?? 'Reembolso procesado.' }));
      const all = await firstValueFrom(this.http.get<IAppointment[]>(`${environment.apiUrl}/appointments`));
      this.allAppointments.set(all);
    } catch (err: any) {
      this.refundMsg.update(m => ({ ...m, [apt.id]: err?.error?.message ?? 'No se pudo reintentar el reembolso.' }));
    } finally {
      this.retryingRefundId.set(null);
    }
  }

  async copyUrl(): Promise<void> {
    const url = this.linkBanner()?.url;
    if (!url) return;
    await navigator.clipboard.writeText(url);
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2500);
  }

  goToAgenda(): void {
    this.router.navigate(['/app/agenda']);
  }

  readonly filteredTodayApts = computed(() => {
    const f    = this.aptFilter();
    const apts = this.todayAppointments();
    return f === 'todos' ? apts : apts.filter(a => a.paymentStatus === f);
  });

  /** Agenda de hoy ordenada por hora, con el estado temporal ya resuelto. */
  readonly agendaItems = computed((): IAgendaItem[] => {
    const now  = this.nowMinutes();
    const rows = [...this.filteredTodayApts()].sort((a, b) => a.time.localeCompare(b.time));

    // La primera cita que aún no termina es la "próxima" (o la que está en curso).
    let nextTaken = false;

    return rows.map(a => {
      const start = this._toMinutes(a.time);
      const end   = start + (a.service?.duration ?? 30);
      const paid  = this.isPaid(a.paymentStatus);

      let state: IAgendaItem['state'];
      if (a.paymentStatus === 'Cancelado' || end <= now) {
        state = 'past';
      } else if (start <= now && now < end) {
        state = 'now';
        nextTaken = true;
      } else if (!nextTaken) {
        state = 'next';
        nextTaken = true;
      } else {
        state = 'upcoming';
      }

      return {
        id:       a.id,
        time:     a.time,
        customer: a.customer?.name ?? '—',
        service:  a.service?.name ?? '—',
        amount:   Number(a.amount),
        status:   a.paymentStatus,
        state,
        statusLabel: a.paymentStatus === 'Cancelado' ? 'cancelada'
                   : paid                            ? `pagada · ${formatCLP(Number(a.amount))}`
                   :                                   `por cobrar ${formatCLP(Number(a.amount))}`,
      };
    });
  });

  /** Minutos agendados hoy (citas no canceladas), según la duración del servicio. */
  readonly busyMinutes = computed(() =>
    this.todayAppointments()
      .filter(a => a.paymentStatus !== 'Cancelado')
      .reduce((s, a) => s + (a.service?.duration ?? 0), 0)
  );

  readonly busyLabel = computed(() => {
    const total = this.busyMinutes();
    if (!total) return '';
    const h = Math.floor(total / 60);
    const m = total % 60;
    return h ? `${h}h${m ? ` ${m}min` : ''} agendadas` : `${m}min agendadas`;
  });

  readonly stats = computed(() => {
    const apts = this.todayAppointments();
    return {
      totalCitas:  apts.length,
      confirmadas: apts.filter(a => a.paymentStatus !== 'Cancelado').length,
      pagadas:     apts.filter(a => this.isPaid(a.paymentStatus)).length,
      ingresosHoy: apts.filter(a => this.isPaid(a.paymentStatus)).reduce((s, a) => s + Number(a.amount), 0),
      pendientes:  apts.filter(a => a.paymentStatus === 'Pendiente').length,
      porCobrar:   apts.filter(a => a.paymentStatus === 'Pendiente').reduce((s, a) => s + Number(a.amount), 0),
    };
  });

  private _dayRevenue(dateStr: string): number {
    return this.allAppointments()
      .filter(a => a.date === dateStr && this.isPaid(a.paymentStatus))
      .reduce((s, a) => s + Number(a.amount), 0);
  }

  /** Variación de la caja de hoy respecto de ayer. */
  readonly todayTrend = computed(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const prev = this._dayRevenue(this._localDateStr(yesterday));
    if (!prev) return 0;
    return Math.round(((this.stats().ingresosHoy - prev) / prev) * 100);
  });

  private _getMondayOf(weekOffset = 0): Date {
    const now = new Date();
    const dow = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1) + weekOffset * 7);
    monday.setHours(0, 0, 0, 0);
    return monday;
  }

  private _weekRevenue(weekOffset: number): number[] {
    const monday = this._getMondayOf(weekOffset);
    const all    = this.allAppointments();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const ds = this._localDateStr(d);
      return all.filter(a => a.date === ds && this.isPaid(a.paymentStatus))
                .reduce((s, a) => s + Number(a.amount), 0);
    });
  }

  readonly weeklyRevenue = computed(() => this._weekRevenue(this.weekOffset()));

  readonly weekTotal = computed(() => this.weeklyRevenue().reduce((s, v) => s + v, 0));

  readonly weekTrend = computed(() => {
    const prev = this._weekRevenue(this.weekOffset() - 1).reduce((s, v) => s + v, 0);
    if (!prev) return 0;
    return Math.round(((this.weekTotal() - prev) / prev) * 100);
  });

  readonly weekLabels = computed(() => {
    const days   = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    const monday = this._getMondayOf(this.weekOffset());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return `${days[i]} ${d.getDate()}`;
    });
  });

  readonly barChartBars = computed((): IBar[] => {
    const data    = this.weeklyRevenue();
    const max     = Math.max(...data, 1);
    const BAR     = 28, GAP = 12, CHART_H = 110;
    const monday  = this._getMondayOf(this.weekOffset());
    return data.map((v, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return {
        x:      i * (BAR + GAP),
        barH:   Math.max((v / max) * CHART_H, v > 0 ? 3 : 0),
        value:  v,
        label:  this.weekLabels()[i],
        isToday: this._localDateStr(d) === this.today,
      };
    });
  });

  // ── Navegación de semanas (solo dentro del mes actual) ─────────────────────
  /** Offset mínimo permitido: la semana que contiene el día 1 del mes actual. */
  readonly minWeekOffset = computed(() => {
    const now     = new Date();
    const curMon  = this._getMondayOf(0);
    const first   = new Date(now.getFullYear(), now.getMonth(), 1);
    const dow     = first.getDay();
    const firstMon = new Date(first);
    firstMon.setDate(first.getDate() - (dow === 0 ? 6 : dow - 1));
    firstMon.setHours(0, 0, 0, 0);
    const weeks = Math.round((curMon.getTime() - firstMon.getTime()) / (7 * 86400000));
    return -weeks;
  });

  readonly canPrevWeek = computed(() => this.weekOffset() > this.minWeekOffset());
  readonly canNextWeek = computed(() => this.weekOffset() < 0);
  readonly isCurrentWeek = computed(() => this.weekOffset() === 0);

  /** Rango de la semana mostrada, ej: "2 – 8 jun". */
  readonly weekRangeLabel = computed(() => {
    const monday = this._getMondayOf(this.weekOffset());
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const month = new Intl.DateTimeFormat('es-CL', { month: 'short' }).format(sunday);
    return `${monday.getDate()} – ${sunday.getDate()} ${month}`;
  });

  prevWeek(): void { if (this.canPrevWeek()) this.weekOffset.update(v => v - 1); }
  nextWeek(): void { if (this.canNextWeek()) this.weekOffset.update(v => v + 1); }

  private _monthIncome(d: Date): number {
    const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return this.allAppointments()
      .filter(a => this.isPaid(a.paymentStatus) && a.date.startsWith(prefix))
      .reduce((s, a) => s + Number(a.amount), 0);
  }

  readonly monthlyIncome = computed(() => this._monthIncome(new Date()));

  readonly prevMonthIncome = computed(() => {
    const now = new Date();
    return this._monthIncome(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  });

  readonly monthTrend = computed(() => {
    const prev = this.prevMonthIncome();
    if (!prev) return 0;
    return Math.round(((this.monthlyIncome() - prev) / prev) * 100);
  });

  readonly recentActivity = computed((): IActivity[] =>
    [...this.allAppointments()]
      .sort((a, b) => {
        const ta = a.updatedAt ?? a.createdAt ?? `${a.date}T${a.time}`;
        const tb = b.updatedAt ?? b.createdAt ?? `${b.date}T${b.time}`;
        return tb.localeCompare(ta);
      })
      .slice(0, 4)
      .map(a => ({
        text:  a.paymentStatus === 'Pagado'
                 ? `Pago confirmado · ${a.customer?.name ?? '—'} · ${a.service?.name ?? '—'}`
               : a.paymentStatus === 'Cancelado'
                 ? `Cita cancelada · ${a.customer?.name ?? '—'} · ${a.date} ${a.time}`
               : `Nueva cita · ${a.customer?.name ?? '—'} · ${a.service?.name ?? '—'} (${a.date} ${a.time})`,
        color: a.paymentStatus === 'Pagado'    ? '#10b981'
             : a.paymentStatus === 'Cancelado' ? '#ef4444' : '#f59e0b',
        time:  this._relTime(a.updatedAt ?? a.createdAt ?? `${a.date}T${a.time}`),
      }))
  );

  private _relTime(iso: string): string {
    const diffMs  = Date.now() - new Date(iso).getTime();
    const diffMin = Math.round(diffMs / 60000);
    if (diffMin <= 1)   return 'ahora';
    if (diffMin < 60)   return `hace ${diffMin} min`;
    const diffH = Math.round(diffMin / 60);
    if (diffH < 24)     return `hace ${diffH}h`;
    const diffD = Math.round(diffH / 24);
    return `hace ${diffD} día${diffD > 1 ? 's' : ''}`;
  }

  async ngOnInit(): Promise<void> {
    this._clock = setInterval(() => this.nowMinutes.set(this._minutesNow()), 60_000);
    try {
      const [today, all, customers] = await Promise.all([
        firstValueFrom(this.http.get<IAppointment[]>(`${environment.apiUrl}/appointments`, { params: { date: this.today } })),
        firstValueFrom(this.http.get<IAppointment[]>(`${environment.apiUrl}/appointments`)),
        firstValueFrom(this.http.get<any[]>(`${environment.apiUrl}/customers`)).catch(() => [] as any[]),
      ]);
      this.todayAppointments.set(today);
      this.allAppointments.set(all);
      this.activeClientCount.set(customers.length);
    } finally {
      this.isLoading.set(false);
    }
  }

  ngOnDestroy(): void {
    if (this._clock) clearInterval(this._clock);
  }
}
