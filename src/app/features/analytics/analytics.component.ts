import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { formatCLP } from '../../helpers/formatters';
import { environment } from '../../../environments/environment';

interface IAppointment {
  id: string;
  date: string;
  time: string;
  paymentStatus: 'Pagado' | 'Pendiente' | 'Cancelado' | 'Finalizada';
  service?: { id: string; name: string } | null;
  quoteId?: string | null;
  amount?: number | string;
  refundStatus?: string | null;
}

interface ICustomer {
  id: string;
  name: string;
  appointments: IAppointment[];
}

interface IMonthData {
  month: string;   // 'Ene'
  key: string;     // 'YYYY-MM'
  revenue: number;
  bookings: number;    // todas las citas del mes
  paid: number;        // solo pagadas (Pagado / Finalizada)
  cancelled: number;   // canceladas
  refunded: number;    // canceladas reembolsadas con nuestro botón (refundStatus 'approved')
}

interface IChartBar {
  i: number;
  month: string;
  cx: number;        // centro del slot (eje X)
  barX: number;      // borde izquierdo de la barra
  barW: number;
  barY: number;      // tope de la barra (ingresos)
  barH: number;
  revenue: number;
  bookings: number;
  paid: number;
}

interface IMonthStat {
  reserved: number;
  paid: number;
  incomplete: number;
  pending: number;
  revenue: number;
}

interface ISeriesPoint {
  i: number;
  cx: number;
  cy: number;
  month: string;
  count: number;       // reservadas (total)
  paid: number;        // pagadas (Pagado / Finalizada)
  incomplete: number;  // canceladas o reembolsadas
  pending: number;     // pendientes
  revenue: number;     // ganancia real (monto de las pagadas)
}

interface IServiceSeries {
  name: string;
  color: string;
  linePath: string;
  points: ISeriesPoint[];
}

interface IServiceStat {
  name: string;
  bookings: number;
  revenue: number;
  pct: number;
}

interface IDonutSegment {
  name: string;
  bookings: number;
  pct: number;
  color: string;
  dash: number;
  dashOffset: number;
}

// Combo chart layout (barras de ganancia + líneas de reservas)
const CH_PAD_LEFT   = 54;  // eje Y izquierdo (ingresos)
const CH_PAD_RIGHT  = 32;  // eje Y derecho (reservas)
const CH_PAD_TOP    = 18;
const CH_PAD_BOTTOM = 30;
const CH_W          = 580;
const CH_H          = 250;
const CH_PLOT_W     = CH_W - CH_PAD_LEFT - CH_PAD_RIGHT;
const CH_PLOT_H     = CH_H - CH_PAD_TOP - CH_PAD_BOTTOM;

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './analytics.component.html',
})
export class AnalyticsComponent implements OnInit {
  private readonly http = inject(HttpClient);
  readonly formatCLP = formatCLP;

  readonly circumference = 2 * Math.PI * 48;
  readonly chW = CH_W;
  readonly chH = CH_H;
  readonly plotLeft  = CH_PAD_LEFT;
  readonly plotRight = CH_W - CH_PAD_RIGHT;

  appointments = signal<IAppointment[]>([]);
  customers    = signal<ICustomer[]>([]);
  isLoading    = signal(true);
  errorMsg     = signal<string | null>(null);
  hoveredBar    = signal<number | null>(null);   // mes (columna) activo
  hoveredSeries = signal<number | null>(null);   // servicio (línea) activo

  private readonly MONTH_LABELS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  // Paleta de servicios: colores vivos y distintos (sin blanco/negro/gris)
  readonly DONUT_COLORS = ['#6366f1','#f59e0b','#ec4899','#0ea5e9','#8b5cf6','#14b8a6','#f43f5e'];

  /** Una cita cuenta como pagada (ingreso real) si está Pagada o Finalizada. */
  private readonly isPaid = (status: string): boolean => status === 'Pagado' || status === 'Finalizada';

  /** Reembolsada con nuestro botón: cita cancelada cuyo reembolso quedó aprobado. */
  private readonly isRefunded = (apt: IAppointment): boolean =>
    apt.paymentStatus === 'Cancelado' && apt.refundStatus === 'approved';

  /** Grupo de la cita para las líneas del gráfico: las cotizaciones se agrupan en una sola serie. */
  private readonly groupOf = (apt: IAppointment): string =>
    apt.quoteId ? 'Cotizaciones' : (apt.service?.name ?? 'Otro');

  readonly monthlyData = computed<IMonthData[]>(() => {
    const apts  = this.appointments();
    const today = new Date();
    const result: IMonthData[] = [];

    for (let i = 11; i >= 0; i--) {
      const d     = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const year  = d.getFullYear();
      const month = d.getMonth();
      const key   = `${year}-${String(month + 1).padStart(2, '0')}`;

      const inMonth = apts.filter(a => a.date.startsWith(key));
      const paidApts = inMonth.filter(a => this.isPaid(a.paymentStatus));
      const revenue  = paidApts.reduce((sum, a) => sum + Number(a.amount ?? 0), 0);

      result.push({
        month: this.MONTH_LABELS[month],
        key,
        revenue,
        bookings: inMonth.length,
        paid: paidApts.length,
        cancelled: inMonth.filter(a => a.paymentStatus === 'Cancelado').length,
        refunded: inMonth.filter(a => this.isRefunded(a)).length,
      });
    }
    return result;
  });

  readonly maxRevenue = computed(() => Math.max(...this.monthlyData().map(d => d.revenue), 1));

  /** Paso del eje de ingresos: 10 mil; solo crece (en múltiplos de 10 mil) si hubiera demasiadas marcas. */
  readonly revStep = computed(() => {
    const rough = Math.max(Math.ceil(this.maxRevenue() / 10000) * 10000, 10000);
    return 10000 * Math.max(1, Math.ceil(rough / 10000 / 20));
  });

  /** Tope del eje de ingresos: el valor más alto redondeado hacia arriba al múltiplo del paso (la marca superior coincide con el tope). */
  readonly revAxisMax = computed(() => {
    const step = this.revStep();
    return Math.max(Math.ceil(this.maxRevenue() / step) * step, step);
  });

  readonly slotW = computed(() => CH_PLOT_W / Math.max(this.monthlyData().length, 1));

  readonly chartBars = computed<IChartBar[]>(() => {
    const data   = this.monthlyData();
    const maxRev = this.revAxisMax();
    const slotW  = this.slotW();
    const barW   = slotW * 0.5;
    const baseY  = CH_PAD_TOP + CH_PLOT_H;

    return data.map((d, i) => {
      const cx   = CH_PAD_LEFT + (i + 0.5) * slotW;
      const barH = (d.revenue / maxRev) * CH_PLOT_H;
      return {
        i,
        month: d.month,
        cx:   +cx.toFixed(1),
        barX: +(cx - barW / 2).toFixed(1),
        barW: +barW.toFixed(1),
        barY: +(baseY - barH).toFixed(1),
        barH: +barH.toFixed(1),
        revenue: d.revenue,
        bookings: d.bookings,
        paid: d.paid,
      };
    });
  });

  /** Conteo de reservas por servicio y por mes (clave YYYY-MM). */
  private readonly serviceMonthlyStats = computed(() => {
    // grupo (servicio o "Cotizaciones") -> (monthKey -> stats)
    const stats = new Map<string, Map<string, IMonthStat>>();
    for (const apt of this.appointments()) {
      const name = this.groupOf(apt);
      const key  = apt.date.slice(0, 7);                      // YYYY-MM
      let byMonth = stats.get(name);
      if (!byMonth) { byMonth = new Map(); stats.set(name, byMonth); }
      let s = byMonth.get(key);
      if (!s) { s = { reserved: 0, paid: 0, incomplete: 0, pending: 0, revenue: 0 }; byMonth.set(key, s); }

      s.reserved++;
      if (this.isPaid(apt.paymentStatus)) {
        s.paid++;
        s.revenue += Number(apt.amount ?? 0);
      } else if (apt.paymentStatus === 'Cancelado') {
        s.incomplete++;
      } else {
        s.pending++;
      }
    }
    return stats;
  });

  /** Grupos a graficar: top servicios por reservas + la línea agregada de "Cotizaciones" si existe. */
  readonly chartGroups = computed<string[]>(() => {
    const stats  = this.serviceMonthlyStats();
    const totals = new Map<string, number>();
    for (const [name, byMonth] of stats) {
      let t = 0;
      for (const s of byMonth.values()) t += s.reserved;
      totals.set(name, t);
    }
    const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1]).map(e => e[0]);
    const quotes = sorted.filter(n => n === 'Cotizaciones');
    const others = sorted.filter(n => n !== 'Cotizaciones').slice(0, 5);
    return [...others, ...quotes];
  });

  /** Una serie de puntos por cada grupo a graficar. La altura de la línea = ganancia del servicio (mismo eje $ que las barras). */
  readonly serviceSeries = computed<IServiceSeries[]>(() => {
    const months = this.monthlyData();
    const stats  = this.serviceMonthlyStats();
    const slotW  = this.slotW();
    const maxRev = this.revAxisMax();

    return this.chartGroups().map((name, si) => {
      const byMonth = stats.get(name);
      const points: ISeriesPoint[] = months.map((m, i) => {
        const s = byMonth?.get(m.key);
        const revenue = s?.revenue ?? 0;
        return {
          i,
          cx: +(CH_PAD_LEFT + (i + 0.5) * slotW).toFixed(1),
          cy: +(CH_PAD_TOP + (1 - revenue / maxRev) * CH_PLOT_H).toFixed(1),
          month: m.month,
          count: s?.reserved ?? 0,
          paid:       s?.paid ?? 0,
          incomplete: s?.incomplete ?? 0,
          pending:    s?.pending ?? 0,
          revenue,
        };
      });
      return {
        name,
        color: this.DONUT_COLORS[si % this.DONUT_COLORS.length],
        linePath: points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.cx},${p.cy}`).join(' '),
        points,
      };
    });
  });

  /** Eje izquierdo: ingresos (CLP), marcas de 10 mil en 10 mil. */
  readonly revYTicks = computed(() => {
    const axisMax = this.revAxisMax();
    const step    = this.revStep();
    const ticks: { y: number; label: string }[] = [];
    for (let v = 0; v <= axisMax; v += step) {
      ticks.push({
        y: +(CH_PAD_TOP + (1 - v / axisMax) * CH_PLOT_H).toFixed(1),
        label: formatCLP(v),
      });
    }
    return ticks;
  });

  readonly tipW    = 168;
  readonly tipBoxH = 104;   // alto del tooltip de servicio

  /** Etiqueta compacta de dinero para los puntos (ej: $90k). */
  moneyK(v: number): string {
    return v > 0 ? '$' + Math.round(v / 1000) + 'k' : '';
  }

  /** Posición X del tooltip, acotada para no salir del gráfico. */
  tooltipX(cx: number): number {
    return Math.min(Math.max(cx - this.tipW / 2, 2), CH_W - this.tipW - 2);
  }

  /** Posición Y del tooltip de servicio: arriba del punto, acotada al gráfico. */
  tipY(cy: number): number {
    return Math.min(Math.max(cy - this.tipBoxH - 8, 4), CH_H - this.tipBoxH - 4);
  }

  readonly totalRevenue12m   = computed(() => this.monthlyData().reduce((s, m) => s + m.revenue, 0));
  readonly avgMonthlyRevenue = computed(() => Math.round(this.totalRevenue12m() / 12));
  readonly totalBookings12m  = computed(() => this.monthlyData().reduce((s, m) => s + m.bookings, 0));
  readonly totalPaid12m      = computed(() => this.monthlyData().reduce((s, m) => s + m.paid, 0));
  readonly totalCancelled12m = computed(() => this.monthlyData().reduce((s, m) => s + m.cancelled, 0));
  readonly totalRefunded12m  = computed(() => this.monthlyData().reduce((s, m) => s + m.refunded, 0));
  /** Pendientes reales: total menos pagadas menos canceladas (sin contar canceladas como pendientes). */
  readonly totalPending12m   = computed(() => this.totalBookings12m() - this.totalPaid12m() - this.totalCancelled12m());

  readonly revTrend = computed(() => {
    const d = this.monthlyData();
    const f = d.slice(0, 6).reduce((s, m) => s + m.revenue, 0);
    const l = d.slice(6).reduce((s, m) => s + m.revenue, 0);
    return f ? Math.round(((l - f) / f) * 100) : 0;
  });

  readonly bkgTrend = computed(() => {
    const d = this.monthlyData();
    const f = d.slice(0, 6).reduce((s, m) => s + m.bookings, 0);
    const l = d.slice(6).reduce((s, m) => s + m.bookings, 0);
    return f ? Math.round(((l - f) / f) * 100) : 0;
  });

  readonly topServices = computed<IServiceStat[]>(() => {
    const map = new Map<string, { name: string; bookings: number; revenue: number }>();

    for (const apt of this.appointments()) {
      const name = apt.service?.name ?? 'Otro';
      const rev  = this.isPaid(apt.paymentStatus) ? Number(apt.amount ?? 0) : 0;
      const cur  = map.get(name);
      if (cur) { cur.bookings++; cur.revenue += rev; }
      else      map.set(name, { name, bookings: 1, revenue: rev });
    }

    const sorted = [...map.values()].sort((a, b) => b.bookings - a.bookings).slice(0, 5);
    const maxBk  = sorted[0]?.bookings ?? 1;
    return sorted.map(s => ({ ...s, pct: Math.round((s.bookings / maxBk) * 100) }));
  });

  readonly donutSegments = computed<IDonutSegment[]>(() => {
    const top   = this.topServices();
    const total = top.reduce((s, t) => s + t.bookings, 0);
    if (!total) return [];

    const C = this.circumference;
    let accumulated = 0;

    return top.map((s, i) => {
      const dash       = (s.bookings / total) * C;
      const dashOffset = C - accumulated;
      accumulated += dash;
      return {
        name: s.name,
        bookings: s.bookings,
        pct: Math.round((s.bookings / total) * 100),
        color: this.DONUT_COLORS[i],
        dash,
        dashOffset,
      };
    });
  });

  readonly clientSegments = computed(() => {
    const custs = this.customers();
    const vipList   = custs.filter(c => c.appointments.length >= 10)
                          .sort((a, b) => b.appointments.length - a.appointments.length);
    const fielList  = custs.filter(c => c.appointments.length >= 5 && c.appointments.length < 10)
                          .sort((a, b) => b.appointments.length - a.appointments.length);
    const nuevoList = custs.filter(c => c.appointments.length <= 2);
    return {
      vip:      vipList.length,
      vipNames: vipList,
      fiel:     fielList.length,
      fielNames: fielList,
      nuevo:    nuevoList.length,
      total:    custs.length,
    };
  });

  async ngOnInit(): Promise<void> {
    try {
      const [apts, custs] = await Promise.all([
        firstValueFrom(this.http.get<IAppointment[]>(`${environment.apiUrl}/appointments`)),
        firstValueFrom(this.http.get<ICustomer[]>(`${environment.apiUrl}/customers`)),
      ]);
      this.appointments.set(apts);
      this.customers.set(custs);
    } catch {
      this.errorMsg.set('No se pudieron cargar los datos de análisis.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
