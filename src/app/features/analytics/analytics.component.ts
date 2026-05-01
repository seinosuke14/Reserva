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
  paymentStatus: 'Pagado' | 'Pendiente' | 'Cancelado';
  service?: { id: string; name: string } | null;
  amount?: number | string;
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
  bookings: number;  // todas las citas del mes
  paid: number;      // solo pagadas
}

interface IChartPoint {
  x: number;
  y: number;
  month: string;
  revenue: number;
  bookings: number;
  paid: number;
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

// Line chart layout
const LC_PAD_LEFT   = 52;  // room for Y-axis labels
const LC_PAD_RIGHT  = 12;
const LC_PAD_TOP    = 16;
const LC_PAD_BOTTOM = 28;
const LC_W          = 580;
const LC_H          = 150;
const LC_PLOT_W     = LC_W - LC_PAD_LEFT - LC_PAD_RIGHT;
const LC_PLOT_H     = LC_H - LC_PAD_TOP - LC_PAD_BOTTOM;

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
  readonly lcW = LC_W;
  readonly lcH = LC_H;

  appointments = signal<IAppointment[]>([]);
  customers    = signal<ICustomer[]>([]);
  isLoading    = signal(true);
  errorMsg     = signal<string | null>(null);
  hoveredBar   = signal<number | null>(null);

  private readonly MONTH_LABELS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  private readonly DONUT_COLORS = ['#db9648','#0f172a','#64748b','#94a3b8','#cbd5e1'];

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
      const paidApts = inMonth.filter(a => a.paymentStatus === 'Pagado');
      const revenue  = paidApts.reduce((sum, a) => sum + Number(a.amount ?? 0), 0);

      result.push({
        month: this.MONTH_LABELS[month],
        key,
        revenue,
        bookings: inMonth.length,
        paid: paidApts.length,
      });
    }
    return result;
  });

  readonly lineMaxRev = computed(() => Math.max(...this.monthlyData().map(d => d.revenue), 1));

  readonly lineChartPoints = computed<IChartPoint[]>(() => {
    const data   = this.monthlyData();
    const maxRev = this.lineMaxRev();
    const xStep  = LC_PLOT_W / (data.length - 1);

    return data.map((d, i) => ({
      x: +(LC_PAD_LEFT + i * xStep).toFixed(1),
      y: +(LC_PAD_TOP + (1 - d.revenue / maxRev) * LC_PLOT_H).toFixed(1),
      month: d.month,
      revenue: d.revenue,
      bookings: d.bookings,
      paid: d.paid,
    }));
  });

  readonly lineChartPath = computed(() =>
    this.lineChartPoints().map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  );

  readonly lineChartArea = computed(() => {
    const pts    = this.lineChartPoints();
    if (!pts.length) return '';
    const bottom = LC_PAD_TOP + LC_PLOT_H;
    return `M${pts[0].x},${pts[0].y} ` +
           pts.slice(1).map(p => `L${p.x},${p.y}`).join(' ') +
           ` L${pts[pts.length - 1].x},${bottom} L${pts[0].x},${bottom} Z`;
  });

  readonly lineYTicks = computed(() => {
    const max = this.lineMaxRev();
    return [0, 0.33, 0.66, 1].map(f => ({
      y: +(LC_PAD_TOP + (1 - f) * LC_PLOT_H).toFixed(1),
      label: formatCLP(Math.round(max * f)),
    }));
  });

  readonly totalRevenue12m   = computed(() => this.monthlyData().reduce((s, m) => s + m.revenue, 0));
  readonly avgMonthlyRevenue = computed(() => Math.round(this.totalRevenue12m() / 12));
  readonly totalBookings12m  = computed(() => this.monthlyData().reduce((s, m) => s + m.bookings, 0));
  readonly totalPaid12m      = computed(() => this.monthlyData().reduce((s, m) => s + m.paid, 0));

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
      const rev  = apt.paymentStatus === 'Pagado' ? Number(apt.amount ?? 0) : 0;
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
