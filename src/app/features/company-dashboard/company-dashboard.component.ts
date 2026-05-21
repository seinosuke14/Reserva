import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import {
  CompanyService,
  ICompanyMemberStats,
  ICompanyMonthly,
  ICompanySubStatus,
} from '../../core/services/company.service';
import { PlanSelectionComponent } from '../plan-selection/plan-selection.component';

const MONTH_LABELS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

const LC_PAD_LEFT = 52, LC_PAD_RIGHT = 12, LC_PAD_TOP = 16, LC_PAD_BOTTOM = 28;
const LC_W = 580, LC_H = 150;
const LC_PLOT_W = LC_W - LC_PAD_LEFT - LC_PAD_RIGHT;
const LC_PLOT_H = LC_H - LC_PAD_TOP - LC_PAD_BOTTOM;

type ActiveTab = 'analytics' | 'equipo' | 'invitaciones' | 'planes';

@Component({
  selector: 'app-company-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, PlanSelectionComponent],
  templateUrl: './company-dashboard.component.html',
})
export class CompanyDashboardComponent implements OnInit {
  private readonly svc    = inject(CompanyService);
  private readonly router = inject(Router);

  company   = this.svc.currentCompany;
  activeTab = signal<ActiveTab>('analytics');
  isLoading = signal(true);

  // ── Datos analytics ──
  members = signal<ICompanyMemberStats[]>([]);
  totals  = signal({ appointments: 0, revenue: 0 });
  monthly = signal<ICompanyMonthly[]>([]);

  // ── Equipo / invitaciones ──
  invitations   = signal<any[]>([]);
  inviteEmail   = signal('');
  inviteError   = signal('');
  inviteSuccess = signal('');
  isSending     = signal(false);

  // ── Planes ──
  subStatus     = signal<ICompanySubStatus>({ hasPlan: false });
  isCheckingOut = signal<'team' | 'pro_max' | null>(null);
  planError     = signal('');

  readonly lcW = LC_W;
  readonly lcH = LC_H;

  // ── Analytics computed ──
  readonly monthlyData = computed(() => {
    const raw   = this.monthly();
    const today = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const d   = new Date(today.getFullYear(), today.getMonth() - (11 - i), 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const found = raw.find(m => m.key === key);
      return { month: MONTH_LABELS[d.getMonth()], key, revenue: found?.revenue ?? 0, appointments: found?.appointments ?? 0, paid: found?.paid ?? 0 };
    });
  });

  readonly lineMaxRev = computed(() => Math.max(...this.monthlyData().map(d => d.revenue), 1));

  readonly linePoints = computed(() => {
    const data  = this.monthlyData();
    const max   = this.lineMaxRev();
    const xStep = LC_PLOT_W / (data.length - 1);
    return data.map((d, i) => ({
      x: +(LC_PAD_LEFT + i * xStep).toFixed(1),
      y: +(LC_PAD_TOP + (1 - d.revenue / max) * LC_PLOT_H).toFixed(1),
      ...d,
    }));
  });

  readonly linePath = computed(() =>
    this.linePoints().map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  );

  readonly lineArea = computed(() => {
    const pts    = this.linePoints();
    if (!pts.length) return '';
    const bottom = LC_PAD_TOP + LC_PLOT_H;
    return `M${pts[0].x},${pts[0].y} ` +
           pts.slice(1).map(p => `L${p.x},${p.y}`).join(' ') +
           ` L${pts[pts.length-1].x},${bottom} L${pts[0].x},${bottom} Z`;
  });

  readonly yTicks = computed(() => {
    const max = this.lineMaxRev();
    return [0, 0.33, 0.66, 1].map(f => ({
      y: +(LC_PAD_TOP + (1 - f) * LC_PLOT_H).toFixed(1),
      label: this.formatCLP(Math.round(max * f)),
    }));
  });

  readonly totalRev12m  = computed(() => this.monthlyData().reduce((s, m) => s + m.revenue, 0));
  readonly avgRev       = computed(() => Math.round(this.totalRev12m() / 12));
  readonly totalApts12m = computed(() => this.monthlyData().reduce((s, m) => s + m.appointments, 0));
  readonly totalPaid12m = computed(() => this.monthlyData().reduce((s, m) => s + m.paid, 0));

  readonly revTrend = computed(() => {
    const d = this.monthlyData();
    const f = d.slice(0, 6).reduce((s, m) => s + m.revenue, 0);
    const l = d.slice(6).reduce((s, m) => s + m.revenue, 0);
    return f ? Math.round(((l - f) / f) * 100) : 0;
  });

  readonly aptTrend = computed(() => {
    const d = this.monthlyData();
    const f = d.slice(0, 6).reduce((s, m) => s + m.appointments, 0);
    const l = d.slice(6).reduce((s, m) => s + m.appointments, 0);
    return f ? Math.round(((l - f) / f) * 100) : 0;
  });

  readonly maxMemberRev = computed(() => Math.max(...this.members().map(m => m.revenue), 1));

  async ngOnInit(): Promise<void> {
    this.isLoading.set(true);
    const [dash, invs, sub] = await Promise.all([
      this.svc.getDashboard(),
      this.svc.getInvitations(),
      this.svc.getSubscriptionStatus(),
    ]);
    this.members.set(dash.members);
    this.totals.set(dash.totals);
    this.monthly.set(dash.monthly);
    this.invitations.set(invs);
    this.subStatus.set(sub);
    this.isLoading.set(false);
  }

  // ── Invitaciones ──
  async onInvite(): Promise<void> {
    const email = this.inviteEmail().trim();
    if (!email) return;
    this.isSending.set(true);
    this.inviteError.set('');
    this.inviteSuccess.set('');
    const result = await this.svc.inviteMember(email);
    this.isSending.set(false);
    if (result.success) {
      this.inviteSuccess.set(result.message);
      this.inviteEmail.set('');
      this.invitations.set(await this.svc.getInvitations());
    } else {
      this.inviteError.set(result.message);
    }
  }

  async onCancelInvitation(id: string): Promise<void> {
    await this.svc.cancelInvitation(id);
    this.invitations.set(this.invitations().filter(i => i.id !== id));
  }

  async onRemoveMember(id: string): Promise<void> {
    if (!confirm('¿Desvincular este profesional del equipo?')) return;
    const result = await this.svc.removeMember(id);
    if (result.success) this.members.set(this.members().filter(m => m.id !== id));
  }

  // ── Planes ──
  async onCheckoutEvent(event: { plan: string; members: number }): Promise<void> {
    const plan = event.plan as 'team' | 'pro_max';
    this.isCheckingOut.set(plan);
    this.planError.set('');
    const result = await this.svc.checkout(plan, event.members);
    if (result.success && result.url) {
      window.location.href = result.url;
    } else {
      this.planError.set(result.message ?? 'Error al iniciar el pago.');
      this.isCheckingOut.set(null);
    }
  }

  formatCLP(amount: number): string {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount);
  }

  logout(): void {
    this.svc.logout();
    this.router.navigate(['/login']);
  }
}
