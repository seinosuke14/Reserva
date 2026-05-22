import { Component, inject, signal, OnInit, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Router, RouterModule } from '@angular/router';
import { trigger, style, animate, transition } from '@angular/animations';
import {
  CompanyService,
  ICompanyMemberStats,
  ICompanyMonthly,
  ICompanySubStatus,
  ICompanyBrand,
  IAgendaMember,
  IAgendaAppt,
} from '../../core/services/company.service';
import { PlanSelectionComponent } from '../plan-selection/plan-selection.component';
import { FONT_OPTIONS } from '../brand-editor/brand-editor.component';
import { environment } from '../../../environments/environment';

const MONTH_LABELS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

const LC_PAD_LEFT = 52, LC_PAD_RIGHT = 12, LC_PAD_TOP = 16, LC_PAD_BOTTOM = 28;
const LC_W = 580, LC_H = 150;
const LC_PLOT_W = LC_W - LC_PAD_LEFT - LC_PAD_RIGHT;
const LC_PLOT_H = LC_H - LC_PAD_TOP - LC_PAD_BOTTOM;

type ActiveTab = 'analytics' | 'equipo' | 'invitaciones' | 'planes' | 'agenda' | 'marca' | 'pagos';

type PaymentProvider = 'flow' | 'transfer';

interface IPaymentMethod {
  id: string;
  provider: PaymentProvider;
  isActive: boolean;
  credentials: Record<string, string>;
}

const CHILEAN_BANKS = ['Banco de Chile','Banco Estado','Banco Santander','Banco BCI','Banco Itaú','Banco Security','Banco Falabella','Banco Ripley','Banco BICE','Banco Internacional','Scotiabank','Coopeuch'];
const ACCOUNT_TYPES = ['Cuenta Corriente','Cuenta Vista / RUT','Cuenta de Ahorro','Cuenta Empresa'];

interface ProviderField { key: string; label: string; placeholder: string; type: string; maxlength?: number; inputmode?: string; options?: string[]; }
interface ProviderConfig { provider: PaymentProvider; label: string; description: string; fields: ProviderField[]; }

const PAYMENT_PROVIDERS: ProviderConfig[] = [
  {
    provider: 'flow',
    label: 'Flow',
    description: 'Tarjetas, débito y transferencia electrónica',
    fields: [
      { key: 'apiKey',    label: 'API Key',    placeholder: 'API Key de Flow',    type: 'text',     maxlength: 128 },
      { key: 'secretKey', label: 'Secret Key', placeholder: 'Secret Key de Flow', type: 'password', maxlength: 128 },
    ],
  },
  {
    provider: 'transfer',
    label: 'Transferencia Bancaria',
    description: 'Pago directo a cuenta bancaria',
    fields: [
      { key: 'bankName',      label: 'Banco',                 placeholder: 'Selecciona un banco',          type: 'select', options: CHILEAN_BANKS },
      { key: 'accountType',   label: 'Tipo de Cuenta',        placeholder: 'Selecciona el tipo de cuenta', type: 'select', options: ACCOUNT_TYPES },
      { key: 'accountNumber', label: 'Número de Cuenta',      placeholder: 'Ej: 12345678',                 type: 'text',  maxlength: 20, inputmode: 'numeric' },
      { key: 'rut',           label: 'RUT',                   placeholder: 'Ej: 12.345.678-9',             type: 'text',  maxlength: 12 },
      { key: 'holderName',    label: 'Titular',               placeholder: 'Nombre del titular',           type: 'text',  maxlength: 60 },
      { key: 'email',         label: 'Email de notificación', placeholder: 'pagos@email.com',              type: 'email', maxlength: 254 },
    ],
  },
];

const NAV_ITEMS: { tab: ActiveTab; label: string; icon: string }[] = [
  { tab: 'analytics',    label: 'Analytics',    icon: 'bar-chart'   },
  { tab: 'agenda',       label: 'Agenda',       icon: 'calendar'    },
  { tab: 'equipo',       label: 'Equipo',       icon: 'users'       },
  { tab: 'invitaciones', label: 'Invitaciones', icon: 'mail'        },
  { tab: 'planes',       label: 'Planes',       icon: 'credit-card' },
  { tab: 'marca',        label: 'Marca',        icon: 'sliders'     },
  { tab: 'pagos',        label: 'Pagos',        icon: 'dollar'      },
];

@Component({
  selector: 'app-company-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PlanSelectionComponent],
  templateUrl: './company-dashboard.component.html',
  animations: [
    trigger('sidebarLabel', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(-10px)' }),
        animate('200ms ease-out', style({ opacity: 1, transform: 'translateX(0)' })),
      ]),
      transition(':leave', [
        animate('150ms ease-in', style({ opacity: 0, transform: 'translateX(-10px)' })),
      ]),
    ]),
  ],
})
export class CompanyDashboardComponent implements OnInit, OnDestroy {
  private readonly svc    = inject(CompanyService);
  private readonly router = inject(Router);
  private readonly http   = inject(HttpClient);

  readonly navItems = NAV_ITEMS;

  company          = this.svc.currentCompany;
  activeTab        = signal<ActiveTab>('analytics');
  isLoading        = signal(true);
  isMobile         = signal(window.innerWidth < 768);
  isSidebarOpen    = signal(window.innerWidth >= 768);

  private _resizeListener = () => {
    const mobile = window.innerWidth < 768;
    this.isMobile.set(mobile);
    if (mobile) this.isSidebarOpen.set(false);
  };

  readonly companyInitials = computed(() => {
    const name = this.company()?.name ?? '';
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'E';
  });

  toggleSidebar(): void { this.isSidebarOpen.update(v => !v); }
  closeSidebar(): void  { this.isSidebarOpen.set(false); }

  selectTab(tab: ActiveTab): void {
    this.activeTab.set(tab);
    if (this.isMobile()) this.isSidebarOpen.set(false);
  }

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

  // ── Agenda ──
  agendaDate         = signal<string>(this._todayStr());
  agendaMembers      = signal<IAgendaMember[]>([]);
  agendaLoading      = signal(false);
  agendaSelectedAppt  = signal<{ appt: IAgendaAppt; memberName: string } | null>(null);
  agendaApptUpdating  = signal(false);
  agendaCurrentMonth = signal(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  readonly agendaMonthLabel = computed(() =>
    this.agendaCurrentMonth().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
  );

  readonly agendaCalendarGrid = computed(() => {
    const first = this.agendaCurrentMonth();
    const year  = first.getFullYear();
    const month = first.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let startDow = first.getDay();
    startDow = startDow === 0 ? 6 : startDow - 1;
    const grid: (Date | null)[] = [];
    for (let i = 0; i < startDow; i++) grid.push(null);
    for (let d = 1; d <= daysInMonth; d++) grid.push(new Date(year, month, d));
    while (grid.length % 7 !== 0) grid.push(null);
    return grid;
  });

  agendaDatesWithAppts = computed(() => {
    const set = new Set<string>();
    for (const m of this.agendaMembers()) {
      for (const a of m.appointments) set.add(this.agendaDate());
    }
    return set;
  });

  agendaPrevMonth(): void { const d = this.agendaCurrentMonth(); this.agendaCurrentMonth.set(new Date(d.getFullYear(), d.getMonth() - 1, 1)); }
  agendaNextMonth(): void { const d = this.agendaCurrentMonth(); this.agendaCurrentMonth.set(new Date(d.getFullYear(), d.getMonth() + 1, 1)); }

  agendaSelectCalDate(date: Date): void {
    const s = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    this.agendaDate.set(s);
    this.loadAgenda(s);
  }

  agendaIsSameDayStr(date: Date, dateStr: string): boolean {
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}` === dateStr;
  }

  readonly AGENDA_SLOTS: string[] = (() => {
    const s: string[] = [];
    for (let h = 8; h < 20; h++) {
      s.push(`${String(h).padStart(2, '0')}:00`);
      s.push(`${String(h).padStart(2, '0')}:30`);
    }
    return s;
  })();

  agendaApptAt(member: IAgendaMember, slot: string): IAgendaAppt | null {
    return member.appointments.find(a => a.time === slot) ?? null;
  }

  agendaIsContinuation(member: IAgendaMember, slot: string): IAgendaAppt | null {
    const [sh, sm] = slot.split(':').map(Number);
    const slotMin = sh * 60 + sm;
    for (const appt of member.appointments) {
      const [ah, am] = appt.time.split(':').map(Number);
      const startMin = ah * 60 + am;
      const blocks   = Math.ceil((appt.service.duration ?? 30) / 30);
      if (slotMin > startMin && slotMin < startMin + blocks * 30) return appt;
    }
    return null;
  }

  agendaDateLabel = computed(() => {
    const [y, m, d] = this.agendaDate().split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  });

  agendaIsToday = computed(() => this.agendaDate() === this._todayStr());

  _todayStr(): string {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`;
  }

  async updateAgendaApptStatus(status: 'Pagado' | 'Cancelado'): Promise<void> {
    const sel = this.agendaSelectedAppt();
    if (!sel || this.agendaApptUpdating()) return;
    this.agendaApptUpdating.set(true);
    const result = await this.svc.updateAppointmentStatus(sel.appt.id, status);
    this.agendaApptUpdating.set(false);
    if (result.success) {
      this.agendaSelectedAppt.set(null);
      await this.loadAgenda(this.agendaDate());
    }
  }

  async loadAgenda(date: string): Promise<void> {
    this.agendaLoading.set(true);
    const res = await this.svc.getAgenda(date);
    this.agendaMembers.set(res.members);
    this.agendaLoading.set(false);
  }

  agendaPrevDay(): void {
    const [y, m, d] = this.agendaDate().split('-').map(Number);
    const prev = new Date(y, m - 1, d - 1);
    const s = `${prev.getFullYear()}-${String(prev.getMonth()+1).padStart(2,'0')}-${String(prev.getDate()).padStart(2,'0')}`;
    this.agendaDate.set(s);
    this.loadAgenda(s);
  }

  agendaNextDay(): void {
    const [y, m, d] = this.agendaDate().split('-').map(Number);
    const next = new Date(y, m - 1, d + 1);
    const s = `${next.getFullYear()}-${String(next.getMonth()+1).padStart(2,'0')}-${String(next.getDate()).padStart(2,'0')}`;
    this.agendaDate.set(s);
    this.loadAgenda(s);
  }

  agendaGoToday(): void {
    const s = this._todayStr();
    this.agendaDate.set(s);
    this.loadAgenda(s);
  }

  // ── Marca ──
  brandSlugValue   = signal('');
  brandSlugSaving  = signal(false);
  brandSlugMsg     = signal<{ type: 'success' | 'error'; text: string } | null>(null);
  brandLinkCopied  = signal(false);

  async saveBrandSlug(): Promise<void> {
    const slug = this.brandSlugValue().trim().toLowerCase();
    if (!slug) { this.brandSlugMsg.set({ type: 'error', text: 'El nombre no puede estar vacío.' }); return; }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      this.brandSlugMsg.set({ type: 'error', text: 'Solo letras minúsculas, números y guiones (ej: mi-empresa).' }); return;
    }
    this.brandSlugSaving.set(true);
    this.brandSlugMsg.set(null);
    const result = await this.svc.updateBrand({ slug } as any);
    this.brandSlugSaving.set(false);
    if (result.success) {
      this.brandSlugMsg.set({ type: 'success', text: 'Nombre comercial actualizado.' });
      const c = this.company() as any;
      if (c) this.svc.patchCompany({ slug } as any);
    } else {
      this.brandSlugMsg.set({ type: 'error', text: result.message });
    }
  }

  copyBrandLink(): void {
    const slug = (this.company() as any)?.slug ?? this.brandSlugValue();
    if (!slug) return;
    navigator.clipboard.writeText(`${window.location.origin}/empresa/${slug}`);
    this.brandLinkCopied.set(true);
    setTimeout(() => this.brandLinkCopied.set(false), 2000);
  }

  brand              = signal<Partial<ICompanyBrand>>({});
  brandSaving        = signal(false);
  brandMsg           = signal('');
  brandError         = signal('');

  brandLogoPreview   = signal<string | null>(null);
  brandBannerPreview = signal<string | null>(null);
  brandBgPreview     = signal<string | null>(null);
  brandLogoSaving    = signal(false);
  brandBannerSaving  = signal(false);
  brandBgSaving      = signal(false);
  brandImgMsg        = signal<{ type: 'success' | 'error'; text: string } | null>(null);

  readonly fontOptions = FONT_OPTIONS;

  async onBrandLogoSelect(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.brandLogoPreview.set(URL.createObjectURL(file));
    this.brandLogoSaving.set(true);
    this.brandImgMsg.set(null);
    const fd = new FormData(); fd.append('image', file);
    try {
      const res: any = await firstValueFrom(
        this.http.post(`${environment.apiUrl}/company/upload/logo`, fd)
      );
      this.brandLogoPreview.set(res.profileImage);
      this.brandImgMsg.set({ type: 'success', text: 'Logo actualizado.' });
    } catch (err: any) {
      this.brandLogoPreview.set(this.brand().profileImage ?? null);
      this.brandImgMsg.set({ type: 'error', text: err?.error?.message ?? 'No se pudo subir el logo.' });
    } finally {
      this.brandLogoSaving.set(false);
      (event.target as HTMLInputElement).value = '';
    }
  }

  async onBrandBannerSelect(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.brandBannerPreview.set(URL.createObjectURL(file));
    this.brandBannerSaving.set(true);
    this.brandImgMsg.set(null);
    const fd = new FormData(); fd.append('image', file);
    try {
      const res: any = await firstValueFrom(
        this.http.post(`${environment.apiUrl}/company/upload/banner`, fd)
      );
      this.brandBannerPreview.set(res.bannerImage);
      this.brandImgMsg.set({ type: 'success', text: 'Banner actualizado.' });
    } catch (err: any) {
      this.brandBannerPreview.set(this.brand().bannerImage ?? null);
      this.brandImgMsg.set({ type: 'error', text: err?.error?.message ?? 'No se pudo subir el banner.' });
    } finally {
      this.brandBannerSaving.set(false);
      (event.target as HTMLInputElement).value = '';
    }
  }

  async onBrandBgImageSelect(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.brandBgPreview.set(URL.createObjectURL(file));
    this.brandBgSaving.set(true);
    this.brandImgMsg.set(null);
    const fd = new FormData(); fd.append('image', file);
    try {
      const res: any = await firstValueFrom(
        this.http.post(`${environment.apiUrl}/company/upload/background`, fd)
      );
      this.brandBgPreview.set(res.backgroundImage);
      this.brand.update(b => ({ ...b, backgroundType: 'image' }));
      this.brandImgMsg.set({ type: 'success', text: 'Imagen de fondo actualizada.' });
    } catch (err: any) {
      this.brandBgPreview.set(this.brand().backgroundImage ?? null);
      this.brandImgMsg.set({ type: 'error', text: err?.error?.message ?? 'No se pudo subir la imagen.' });
    } finally {
      this.brandBgSaving.set(false);
      (event.target as HTMLInputElement).value = '';
    }
  }

  async saveBrand(): Promise<void> {
    this.brandSaving.set(true);
    this.brandMsg.set('');
    this.brandError.set('');
    const result = await this.svc.updateBrand({
      description:     this.brand().description,
      backgroundColor: this.brand().backgroundColor,
      backgroundType:  this.brand().backgroundType,
      headingFont:     this.brand().headingFont,
      bodyFont:        this.brand().bodyFont,
    });
    this.brandSaving.set(false);
    if (result.success) this.brandMsg.set('Cambios guardados correctamente.');
    else                this.brandError.set(result.message);
  }

  patchBrand(key: string, value: string): void {
    this.brand.update(b => ({ ...b, [key]: value }));
  }

  get brandPublicUrl(): string {
    const slug = this.company()?.slug;
    return slug ? `/empresa/${slug}` : '';
  }

  // ── Pagos ──
  readonly paymentProviders = PAYMENT_PROVIDERS;
  paymentMethods     = signal<IPaymentMethod[]>([]);
  paymentLoading     = signal(false);
  paymentExpanded    = signal<PaymentProvider | null>(null);
  paymentFormData    = signal<Record<string, string>>({});
  paymentSaving      = signal(false);
  paymentFeedback    = signal<{ type: 'success' | 'error'; text: string } | null>(null);
  paymentVisible     = signal<Set<string>>(new Set());

  private async loadPaymentMethods(): Promise<void> {
    try {
      const data = await firstValueFrom(
        this.http.get<IPaymentMethod[]>(`${environment.apiUrl}/company/payment-methods`)
      );
      this.paymentMethods.set(data);
    } catch { this.paymentMethods.set([]); }
  }

  getPaymentMethod(provider: PaymentProvider): IPaymentMethod | undefined {
    return this.paymentMethods().find(m => m.provider === provider);
  }

  isPaymentConfigured(provider: PaymentProvider): boolean { return !!this.getPaymentMethod(provider); }
  isPaymentActive(provider: PaymentProvider): boolean { return this.getPaymentMethod(provider)?.isActive ?? false; }

  togglePaymentExpand(provider: PaymentProvider): void {
    if (this.paymentExpanded() === provider) { this.paymentExpanded.set(null); return; }
    const m = this.getPaymentMethod(provider);
    this.paymentFormData.set(m?.credentials ? { ...m.credentials } : {});
    this.paymentExpanded.set(provider);
  }

  getPaymentFieldValue(key: string): string { return this.paymentFormData()[key] ?? ''; }
  setPaymentFieldValue(key: string, value: string): void { this.paymentFormData.update(d => ({ ...d, [key]: value })); }

  togglePaymentFieldVisible(key: string): void {
    this.paymentVisible.update(s => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n; });
  }
  isPaymentFieldVisible(key: string): boolean { return this.paymentVisible().has(key); }
  getPaymentFieldType(field: ProviderField): string {
    return field.type === 'password' ? (this.isPaymentFieldVisible(field.key) ? 'text' : 'password') : field.type;
  }

  async savePaymentMethod(config: ProviderConfig): Promise<void> {
    const creds = this.paymentFormData();
    const missing = config.fields.some(f => !creds[f.key]?.trim());
    if (missing) { this.showPaymentFeedback('Todos los campos son obligatorios.', 'error'); return; }
    this.paymentSaving.set(true);
    try {
      const existing = this.getPaymentMethod(config.provider);
      if (existing) {
        await firstValueFrom(this.http.put(`${environment.apiUrl}/company/payment-methods/${existing.id}`, { credentials: creds }));
      } else {
        await firstValueFrom(this.http.post(`${environment.apiUrl}/company/payment-methods`, { provider: config.provider, credentials: creds }));
      }
      await this.loadPaymentMethods();
      this.showPaymentFeedback('Método de pago guardado.', 'success');
      this.paymentExpanded.set(null);
    } catch (err: any) {
      this.showPaymentFeedback(err?.error?.message ?? 'Error al guardar.', 'error');
    } finally { this.paymentSaving.set(false); }
  }

  async togglePaymentActive(provider: PaymentProvider): Promise<void> {
    const m = this.getPaymentMethod(provider);
    if (!m) return;
    try {
      await firstValueFrom(this.http.put(`${environment.apiUrl}/company/payment-methods/${m.id}`, { isActive: !m.isActive }));
      await this.loadPaymentMethods();
    } catch { /* silencioso */ }
  }

  async removePaymentMethod(provider: PaymentProvider): Promise<void> {
    const m = this.getPaymentMethod(provider);
    if (!m) return;
    try {
      await firstValueFrom(this.http.delete(`${environment.apiUrl}/company/payment-methods/${m.id}`));
      await this.loadPaymentMethods();
      this.paymentExpanded.set(null);
      this.showPaymentFeedback('Método de pago eliminado.', 'success');
    } catch { /* silencioso */ }
  }

  private showPaymentFeedback(text: string, type: 'success' | 'error'): void {
    this.paymentFeedback.set({ type, text });
    setTimeout(() => this.paymentFeedback.set(null), 4000);
  }

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

  constructor() {
    window.addEventListener('resize', this._resizeListener);
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this._resizeListener);
  }

  async ngOnInit(): Promise<void> {
    this.isLoading.set(true);
    const [dash, invs, sub, agenda] = await Promise.all([
      this.svc.getDashboard(),
      this.svc.getInvitations(),
      this.svc.getSubscriptionStatus(),
      this.svc.getAgenda(this.agendaDate()),
      this.loadPaymentMethods(),
    ]);
    this.members.set(dash.members);
    this.totals.set(dash.totals);
    this.monthly.set(dash.monthly);
    this.invitations.set(invs);
    this.subStatus.set(sub);
    this.agendaMembers.set(agenda.members);
    const c = this.company();
    if (c) {
      this.brand.set({
        description:     c.description     ?? '',
        profileImage:    c.profileImage    ?? '',
        bannerImage:     c.bannerImage     ?? '',
        backgroundColor: c.backgroundColor ?? '#ffffff',
        backgroundImage: c.backgroundImage ?? '',
        backgroundType:  c.backgroundType  ?? 'color',
        headingFont:     c.headingFont     ?? '',
        bodyFont:        c.bodyFont        ?? '',
      });
      this.brandLogoPreview.set(c.profileImage   ?? null);
      this.brandBannerPreview.set(c.bannerImage  ?? null);
      this.brandBgPreview.set(c.backgroundImage  ?? null);
      this.brandSlugValue.set(c.slug ?? '');
    }
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
