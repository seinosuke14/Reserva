import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { formatCLP } from '../../helpers/formatters';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';

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
  service:  { id: string; name: string };
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

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-home.component.html',
})
export class DashboardHomeComponent implements OnInit {
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

  readonly linkBanner = computed(() => {
    const user = this.auth.currentUser();
    if (user?.slug && !user?.companyId) return {
      url:     `${window.location.origin}/reservar/${user.slug}`,
      label:   'Tu link de agendamiento',
      accent:  '#00C4A7',
      shadow:  'rgba(0,196,167,.4)',
      iconBg:  'rgba(0,196,167,.13)',
      iconColor: '#00C4A7',
      isCompany: false,
    };
    if (user?.companyId && user?.companySlug) return {
      url:     `${window.location.origin}/empresa/${user.companySlug}`,
      label:   'Link de agendamiento (vía empresa)',
      accent:  '#6366f1',
      shadow:  'rgba(99,102,241,.4)',
      iconBg:  'rgba(99,102,241,.18)',
      iconColor: '#818cf8',
      isCompany: true,
    };
    return null;
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

  readonly stats = computed(() => {
    const apts = this.todayAppointments();
    return {
      totalCitas:  apts.length,
      confirmadas: apts.filter(a => a.paymentStatus !== 'Cancelado').length,
      ingresosHoy: apts.filter(a => this.isPaid(a.paymentStatus)).reduce((s, a) => s + Number(a.amount), 0),
      pendientes:  apts.filter(a => a.paymentStatus === 'Pendiente').length,
    };
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

  readonly monthlyIncome = computed(() => {
    const now    = new Date();
    const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return this.allAppointments()
      .filter(a => this.isPaid(a.paymentStatus) && a.date.startsWith(prefix))
      .reduce((s, a) => s + Number(a.amount), 0);
  });

  readonly monthTrend = computed(() => {
    const now  = new Date();
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prefix = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
    const prevIncome = this.allAppointments()
      .filter(a => this.isPaid(a.paymentStatus) && a.date.startsWith(prefix))
      .reduce((s, a) => s + Number(a.amount), 0);
    if (!prevIncome) return 0;
    return Math.round(((this.monthlyIncome() - prevIncome) / prevIncome) * 100);
  });

  sparkline(data: number[], w = 60, h = 22): string {
    if (data.every(v => v === 0)) return `0,${h} ${w},${h}`;
    const max   = Math.max(...data);
    const min   = Math.min(...data);
    const range = max - min || 1;
    return data.map((v, i) =>
      `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * (h - 2) - 1}`
    ).join(' ');
  }

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
}
