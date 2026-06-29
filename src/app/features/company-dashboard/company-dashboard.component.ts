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
  IMemberAgendaAppt,
} from '../../core/services/company.service';
import { IServiceCategory } from '../../helpers/models';
import { PlanSelectionComponent } from '../plan-selection/plan-selection.component';
import { FONT_OPTIONS } from '../brand-editor/brand-editor.component';
import { environment } from '../../../environments/environment';
import { GoogleCalendarConnectComponent } from '../../components/google-calendar-connect/google-calendar-connect.component';
import { ConfirmPasswordModalComponent } from '../../components/confirm-password-modal/confirm-password-modal.component';
import { UsageGuideComponent, GuideStep } from '../../components/usage-guide/usage-guide.component';
import { OnboardingTourComponent } from '../../components/onboarding-tour/onboarding-tour.component';
import { TourService, TourStep } from '../../core/services/tour.service';
import { planLabel } from '../../helpers/formatters';

const MONTH_LABELS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

const LC_PAD_LEFT = 52, LC_PAD_RIGHT = 12, LC_PAD_TOP = 16, LC_PAD_BOTTOM = 28;
const LC_W = 580, LC_H = 150;
const LC_PLOT_W = LC_W - LC_PAD_LEFT - LC_PAD_RIGHT;
const LC_PLOT_H = LC_H - LC_PAD_TOP - LC_PAD_BOTTOM;

type ActiveTab = 'analytics' | 'equipo' | 'invitaciones' | 'planes' | 'agenda' | 'marca' | 'pagos' | 'categorias' | 'guia';

type PaymentProvider = 'flow' | 'transfer' | 'khipu' | 'mercadopago' | 'mercadopago_connect';

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
    provider: 'khipu',
    label: 'Khipu',
    description: 'Transferencia bancaria automática (confirmación instantánea)',
    fields: [
      { key: 'apiKey', label: 'API Key', placeholder: 'Llave de cobrador Khipu', type: 'password', maxlength: 128 },
    ],
  },
  {
    provider: 'flow',
    label: 'Flow',
    description: 'Tarjetas, débito y transferencia electrónica (credenciales propias)',
    fields: [
      { key: 'apiKey',    label: 'API Key',    placeholder: 'API Key de Flow',    type: 'text',     maxlength: 128 },
      { key: 'secretKey', label: 'Secret Key', placeholder: 'Secret Key de Flow', type: 'password', maxlength: 128 },
    ],
  },
  {
    provider: 'mercadopago',
    label: 'MercadoPago',
    description: 'Tarjetas y medios digitales (credenciales propias)',
    fields: [
      { key: 'accessToken', label: 'Access Token', placeholder: 'APP_USR-xxxxx... (token de producción)', type: 'password', maxlength: 256 },
    ],
  },
  {
    provider: 'transfer',
    label: 'Transferencia Bancaria Manual',
    description: 'El cliente transfiere directamente y confirmas el pago',
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

const PAYMENT_SECTIONS = [
  {
    label: 'Métodos de pago externos',
    subtitle: 'El profesional usa sus propias credenciales — el dinero va directo a su cuenta',
    providers: PAYMENT_PROVIDERS.filter(p => (['flow', 'mercadopago'] as PaymentProvider[]).includes(p.provider)),
  },
  {
    label: 'Transferencia bancaria',
    subtitle: 'El pago va directamente del cliente al profesional',
    providers: PAYMENT_PROVIDERS.filter(p => (['khipu', 'transfer'] as PaymentProvider[]).includes(p.provider)),
  },
];

const NAV_ITEMS: { tab: ActiveTab; label: string; icon: string }[] = [
  { tab: 'analytics',    label: 'Analytics',    icon: 'bar-chart'   },
  { tab: 'agenda',       label: 'Agenda',       icon: 'calendar'    },
  { tab: 'equipo',       label: 'Equipo',       icon: 'users'       },
  { tab: 'categorias',   label: 'Categorías',   icon: 'tag'         },
  { tab: 'invitaciones', label: 'Invitaciones', icon: 'mail'        },
  { tab: 'planes',       label: 'Planes',       icon: 'credit-card' },
  { tab: 'marca',        label: 'Marca',        icon: 'sliders'     },
  { tab: 'pagos',        label: 'Pagos',        icon: 'dollar'      },
];

@Component({
  selector: 'app-company-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PlanSelectionComponent, GoogleCalendarConnectComponent, ConfirmPasswordModalComponent, UsageGuideComponent, OnboardingTourComponent],
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
  private readonly tour   = inject(TourService);

  /** Pasos del tutorial de onboarding de la empresa (navega por pestañas). */
  private readonly tourSteps: TourStep[] = [
    {
      tab: 'invitaciones',
      title: 'Invita a tu equipo',
      body: 'Invita por correo a los profesionales que formarán parte de tu empresa. Cuando termines, presiona Continuar.',
    },
    {
      tab: 'marca',
      title: 'Configura la vista del cliente',
      body: 'Personaliza cómo verán tus clientes el portal de la empresa al agendar.',
    },
    {
      tab: 'categorias',
      title: 'Crea las categorías',
      body: 'Define las categorías de servicios que compartirá tu equipo.',
    },
    {
      tab: 'planes',
      title: 'Configura la mensajería',
      body: 'Ajusta cuándo se enviarán los recordatorios automáticos a los clientes.',
    },
    {
      tab: 'pagos',
      title: 'Configura el medio de pago',
      body: 'Conecta la forma de cobro de la empresa para recibir los pagos.',
    },
  ];

  /** Marca el onboarding de la empresa como completado (memoria + backend). */
  private markOnboardingDone(): void {
    this.svc.patchCompany({ onboardingCompleted: true });
    this.http.post(`${environment.apiUrl}/company/onboarding/complete`, {}).subscribe({
      error: () => { /* se reintenta en la próxima sesión */ },
    });
  }

  readonly navItems = NAV_ITEMS;

  // ── Guía "¿Cómo usar LR?" (5 pasos para la empresa) ──
  readonly guideSteps: GuideStep[] = [
    {
      title: 'Invita a tu equipo',
      intro: 'Invita por correo a los profesionales que formarán parte de tu empresa.',
      cta: { label: 'Ir a Invitaciones', action: 'invitaciones' },
    },
    {
      title: 'Configura la vista del cliente',
      intro: 'Personaliza cómo verán tus clientes el portal de la empresa al agendar.',
      cta: { label: 'Ir a Marca', action: 'marca' },
    },
    {
      title: 'Crea las categorías',
      intro: 'Define las categorías de servicios que compartirá tu equipo.',
      cta: { label: 'Ir a Categorías', action: 'categorias' },
    },
    {
      title: 'Configura la mensajería',
      intro: 'Ajusta cuándo se enviarán los recordatorios automáticos a los clientes.',
      cta: { label: 'Ir a Mensajería', action: 'planes' },
    },
    {
      title: 'Configura el medio de pago',
      intro: 'Conecta la forma de cobro de la empresa para recibir los pagos.',
      cta: { label: 'Ir a Pagos', action: 'pagos' },
    },
  ];

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

  // ── Drag & Drop agenda ──
  agendaDragging        = signal<{ appt: IAgendaAppt; memberId: string } | null>(null);
  agendaDragOverSlot    = signal<{ memberId: string; slot: string } | null>(null);
  agendaPendingReschedule = signal<{ appt: IAgendaAppt; memberId: string; newDate: string; newTime: string } | null>(null);
  agendaRescheduleSaving  = signal(false);

  agendaOnDragStart(event: DragEvent, appt: IAgendaAppt, memberId: string): void {
    this.agendaDragging.set({ appt, memberId });
    event.dataTransfer?.setData('text/plain', appt.id);
    (event.target as HTMLElement).style.opacity = '0.45';
  }

  agendaOnDragEnd(event: DragEvent): void {
    (event.target as HTMLElement).style.opacity = '';
    this.agendaDragging.set(null);
    this.agendaDragOverSlot.set(null);
  }

  _isPastSlot(dateStr: string, slot: string): boolean {
    const [h, m] = slot.split(':').map(Number);
    const dt = new Date(dateStr + 'T00:00:00');
    dt.setHours(h, m, 0, 0);
    return dt < new Date();
  }

  agendaOnSlotDragOver(event: DragEvent, memberId: string, slot: string): void {
    const drag = this.agendaDragging();
    if (!drag || drag.memberId !== memberId) return;
    if (drag.appt.time === slot) return;
    if (this._isPastSlot(this.agendaDate(), slot)) return;
    const member = this.agendaMembers().find(m => m.id === memberId);
    if (!member) return;
    const occupied = new Set(member.appointments.filter(a => a.id !== drag.appt.id).map(a => a.time));
    if (occupied.has(slot)) return;
    event.preventDefault();
    this.agendaDragOverSlot.set({ memberId, slot });
  }

  agendaOnSlotDragLeave(): void {
    this.agendaDragOverSlot.set(null);
  }

  agendaOnSlotDrop(event: DragEvent, memberId: string, slot: string): void {
    const drag = this.agendaDragging();
    if (!drag || drag.memberId !== memberId || drag.appt.time === slot) return;
    if (this._isPastSlot(this.agendaDate(), slot)) return;
    event.preventDefault();
    this.agendaDragOverSlot.set(null);
    this.agendaPendingReschedule.set({ appt: drag.appt, memberId, newDate: this.agendaDate(), newTime: slot });
  }

  async agendaConfirmReschedule(): Promise<void> {
    const pending = this.agendaPendingReschedule();
    if (!pending) return;
    this.agendaRescheduleSaving.set(true);
    const result = await this.svc.rescheduleAppointment(
      pending.appt.id,
      pending.newDate,
      pending.newTime,
    );
    this.agendaRescheduleSaving.set(false);
    if (result.success) {
      this.agendaPendingReschedule.set(null);
      await this.loadAgenda(this.agendaDate());
    }
  }

  agendaCancelReschedule(): void {
    this.agendaPendingReschedule.set(null);
  }

  // ── Reschedule desde modal de detalle (empresa) ──
  agendaIsRescheduling  = signal(false);
  agendaRsDate          = signal('');
  agendaRsTime          = signal('');

  readonly AGENDA_SLOT_OPTIONS = (() => {
    const slots: string[] = [];
    for (let h = 8; h < 20; h++) {
      slots.push(`${String(h).padStart(2,'0')}:00`);
      slots.push(`${String(h).padStart(2,'0')}:30`);
    }
    return slots;
  })();

  agendaRsAvailableSlots = (): string[] => {
    const dateStr = this.agendaRsDate();
    if (!dateStr) return this.AGENDA_SLOT_OPTIONS;
    return this.AGENDA_SLOT_OPTIONS.filter(s => !this._isPastSlot(dateStr, s));
  };

  openAgendaRescheduleEdit(): void {
    const sel = this.agendaSelectedAppt();
    if (!sel) return;
    this.agendaRsDate.set(this.agendaDate());
    this.agendaRsTime.set(sel.appt.time);
    this.agendaIsRescheduling.set(true);
  }

  submitAgendaRescheduleFromPanel(): void {
    const sel = this.agendaSelectedAppt();
    if (!sel || !this.agendaRsDate() || !this.agendaRsTime()) return;
    if (this.agendaDate() === this.agendaRsDate() && sel.appt.time === this.agendaRsTime()) return;
    if (this._isPastSlot(this.agendaRsDate(), this.agendaRsTime())) return;
    this.agendaPendingReschedule.set({
      appt:     sel.appt,
      memberId: this.agendaMembers().find(m => m.appointments.some(a => a.id === sel.appt.id))?.id ?? '',
      newDate:  this.agendaRsDate(),
      newTime:  this.agendaRsTime(),
    });
    this.agendaSelectedAppt.set(null);
    this.agendaIsRescheduling.set(false);
  }

  closeAgendaDetail(): void {
    this.agendaSelectedAppt.set(null);
    this.agendaIsRescheduling.set(false);
  }
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

  // ── Agenda por profesional (tarjetas → citas por día) ──
  agendaSelectedMember = signal<{ id: string; name: string; profileImage: string | null; profession: string | null } | null>(null);
  memberAppts          = signal<IMemberAgendaAppt[]>([]);
  memberAgendaLoading  = signal(false);

  // Agrupa las citas próximas del profesional por día, ordenadas.
  readonly memberApptsByDay = computed(() => {
    const groups = new Map<string, IMemberAgendaAppt[]>();
    for (const a of this.memberAppts()) {
      (groups.get(a.date) ?? groups.set(a.date, []).get(a.date)!).push(a);
    }
    return [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, appts]) => {
        const [y, m, d] = date.split('-').map(Number);
        const label = new Date(y, m - 1, d).toLocaleDateString('es-ES', {
          weekday: 'long', day: 'numeric', month: 'long',
        });
        return { date, label, appts };
      });
  });

  async selectAgendaMember(m: IAgendaMember): Promise<void> {
    this.agendaSelectedMember.set({ id: m.id, name: m.name, profileImage: m.profileImage, profession: m.profession });
    this.memberAppts.set([]);
    this.memberAgendaLoading.set(true);
    const res = await this.svc.getMemberAgenda(m.id);
    this.memberAppts.set(res?.appointments ?? []);
    this.memberAgendaLoading.set(false);
  }

  backToAgendaMembers(): void {
    this.agendaSelectedMember.set(null);
    this.memberAppts.set([]);
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
  readonly paymentSections  = PAYMENT_SECTIONS;
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
    const raw = m?.credentials ?? {};
    const parsed: Record<string, string> = typeof raw === 'string' ? JSON.parse(raw) : raw;
    this.paymentFormData.set({ ...parsed });
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
    if (config.fields.length > 0) {
      const missing = config.fields.some(f => f.type !== 'select' && !creds[f.key]?.trim() || f.type === 'select' && !creds[f.key]);
      if (missing) { this.showPaymentFeedback('Todos los campos son obligatorios.', 'error'); return; }
    }
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

  // ── MercadoPago Connect (nuestro botón) para empresa ──
  mpConnecting = signal(false);

  get mpConnectUserId(): string | null {
    return (this.getPaymentMethod('mercadopago_connect')?.credentials as any)?.mpUserId ?? null;
  }

  // Inicia el OAuth de MercadoPago: pide el link, guarda el state (CSRF) y el contexto, y redirige.
  async connectCompanyMercadoPago(): Promise<void> {
    this.mpConnecting.set(true);
    try {
      const res: any = await firstValueFrom(
        this.http.get(`${environment.apiUrl}/company/payment-methods/mp-connect/oauth-url`)
      );
      sessionStorage.setItem('mp_oauth_state', res.state);
      sessionStorage.setItem('mp_oauth_context', 'company');
      window.location.href = res.url;
    } catch {
      this.showPaymentFeedback('No se pudo iniciar la conexión con MercadoPago.', 'error');
      this.mpConnecting.set(false);
    }
  }

  // ── Ruteo de pagos: a la empresa o a cada profesional ──
  paymentRouting       = signal<'company' | 'professional'>('company');
  paymentRoutingSaving = signal(false);

  async savePaymentRouting(routing: 'company' | 'professional'): Promise<void> {
    if (this.paymentRoutingSaving() || this.paymentRouting() === routing) return;
    const previous = this.paymentRouting();
    this.paymentRouting.set(routing);
    this.paymentRoutingSaving.set(true);
    const result = await this.svc.savePaymentRouting(routing);
    this.paymentRoutingSaving.set(false);
    if (result.success) {
      this.showPaymentFeedback('Preferencia de cobro actualizada.', 'success');
    } else {
      this.paymentRouting.set(previous);
      this.showPaymentFeedback(result.message ?? 'Error al guardar.', 'error');
    }
  }

  // ── Recordatorio ──
  reminderPref     = signal<'1h_before' | '7h30_same_day' | '24h_before'>('24h_before');
  reminderSelected = signal<'1h_before' | '7h30_same_day' | '24h_before'>('24h_before');
  reminderSaving   = signal(false);
  reminderMsg      = signal<{ type: 'success' | 'error'; text: string } | null>(null);

  readonly reminderOptions: { value: '1h_before' | '7h30_same_day' | '24h_before'; label: string; desc: string }[] = [
    { value: '1h_before',     label: '1 hora antes',          desc: 'Se envía 1 hora antes del inicio de la cita.' },
    { value: '7h30_same_day', label: '7:30 AM del mismo día', desc: 'Se envía a las 7:30 AM del día de la cita.' },
    { value: '24h_before',    label: '24 horas antes',         desc: 'Se envía a la misma hora del día anterior.' },
  ];

  async saveReminderPref(): Promise<void> {
    const pref = this.reminderSelected();
    this.reminderSaving.set(true);
    this.reminderMsg.set(null);
    const result = await this.svc.saveReminderPreference(pref);
    this.reminderSaving.set(false);
    if (result.success) {
      this.reminderPref.set(pref);
      this.svc.patchCompany({ reminderPreference: pref });
      this.reminderMsg.set({ type: 'success', text: 'Preferencia guardada.' });
    } else {
      this.reminderMsg.set({ type: 'error', text: result.message ?? 'Error al guardar.' });
    }
    setTimeout(() => this.reminderMsg.set(null), 3000);
  }

  // ── Planes ──
  subStatus     = signal<ICompanySubStatus>({ hasPlan: false });
  isCheckingOut = signal<'team' | 'pro_max' | null>(null);
  planError     = signal('');

  // ── WhatsApp quota ──
  waQuota          = signal<{ waMessagesSent: number; waMessagesLimit: number; subscriptionEndDate: string | null; scope: string } | null>(null);
  waAddonSaving    = signal(false);
  waAddonMsg       = signal<{ type: 'success' | 'error'; text: string } | null>(null);
  waAddonPanelOpen = signal(false);
  waAddonBlocks    = signal(1);

  readonly waUsagePct = computed(() => {
    const q = this.waQuota();
    if (!q || q.waMessagesLimit === 0) return 0;
    return Math.min(100, Math.round((q.waMessagesSent / q.waMessagesLimit) * 100));
  });

  readonly waAddonMessages = computed(() => this.waAddonBlocks() * 50);
  readonly waAddonTotal    = computed(() =>
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })
      .format(this.waAddonBlocks() * 5000)
  );

  waAddonStepDown(): void {
    if (this.waAddonBlocks() > 1) this.waAddonBlocks.update(b => b - 1);
  }

  waAddonStepUp(): void {
    if (this.waAddonBlocks() < 10) this.waAddonBlocks.update(b => b + 1);
  }

  async checkoutWaAddon(): Promise<void> {
    this.waAddonSaving.set(true);
    this.waAddonMsg.set(null);
    const result = await this.svc.checkoutWaAddon(this.waAddonBlocks());
    this.waAddonSaving.set(false);
    if (result.success && result.url) {
      window.location.href = result.url;
    } else {
      this.waAddonMsg.set({ type: 'error', text: result.message ?? 'No se pudo iniciar el pago.' });
      setTimeout(() => this.waAddonMsg.set(null), 4000);
    }
  }

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
      return { month: MONTH_LABELS[d.getMonth()], key, revenue: found?.revenue ?? 0, appointments: found?.appointments ?? 0, paid: found?.paid ?? 0, cancelled: found?.cancelled ?? 0, refunded: found?.refunded ?? 0 };
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
  readonly totalCancelled12m = computed(() => this.monthlyData().reduce((s, m) => s + m.cancelled, 0));
  readonly totalRefunded12m  = computed(() => this.monthlyData().reduce((s, m) => s + m.refunded, 0));
  /** Pendientes reales: total menos pagadas menos canceladas. */
  readonly totalPending12m   = computed(() => this.totalApts12m() - this.totalPaid12m() - this.totalCancelled12m());

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
    const [dash, invs, sub, agenda, waQ] = await Promise.all([
      this.svc.getDashboard(),
      this.svc.getInvitations(),
      this.svc.getSubscriptionStatus(),
      this.svc.getAgenda(this.agendaDate()),
      this.svc.getWaQuota(),
    ]);
    this.loadPaymentMethods();
    this.loadServiceCategories();
    this.members.set(dash.members);
    this.totals.set(dash.totals);
    this.monthly.set(dash.monthly);
    this.invitations.set(invs);
    this.subStatus.set(sub);
    this.agendaMembers.set(agenda.members);
    this.waQuota.set(waQ);
    const pref = this.company()?.reminderPreference;
    if (pref) { this.reminderPref.set(pref); this.reminderSelected.set(pref); }
    this.paymentRouting.set(this.company()?.paymentRouting ?? 'company');
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

    // Ofrece el tutorial a las empresas que aún no lo completaron.
    this.tour.offerIfPending({
      steps: this.tourSteps,
      alreadyCompleted: !!this.company()?.onboardingCompleted,
      navigate: (step) => { if (step.tab) this.selectTab(step.tab as ActiveTab); },
      onComplete: () => this.markOnboardingDone(),
    });
  }

  // ── Categorías de servicios (compartidas por el equipo, tope 5) ──
  readonly maxCategories = 5;
  svcCategories     = signal<IServiceCategory[]>([]);
  newSvcCatName     = signal('');
  svcCatError       = signal('');
  svcCatSaving      = signal(false);
  svcCatEditingId   = signal<string | null>(null);
  svcCatEditingName = signal('');
  svcCatDeletingId  = signal<string | null>(null);

  private async loadServiceCategories(): Promise<void> {
    this.svcCategories.set(await this.svc.getServiceCategories());
  }

  async onCreateServiceCategory(): Promise<void> {
    const name = this.newSvcCatName().trim();
    if (!name || this.svcCatSaving()) return;
    this.svcCatSaving.set(true);
    this.svcCatError.set('');
    const result = await this.svc.createServiceCategory(name);
    this.svcCatSaving.set(false);
    if (result.success && result.category) {
      this.svcCategories.update(list =>
        [...list, result.category!].sort((a, b) => a.name.localeCompare(b.name))
      );
      this.newSvcCatName.set('');
    } else {
      this.svcCatError.set(result.message ?? 'Error al crear la categoría.');
    }
  }

  startEditServiceCategory(cat: IServiceCategory): void {
    this.svcCatError.set('');
    this.svcCatDeletingId.set(null);
    this.svcCatEditingId.set(cat.id);
    this.svcCatEditingName.set(cat.name);
  }

  async onSaveServiceCategory(): Promise<void> {
    const id = this.svcCatEditingId();
    const name = this.svcCatEditingName().trim();
    if (!id || !name || this.svcCatSaving()) return;
    this.svcCatSaving.set(true);
    this.svcCatError.set('');
    const result = await this.svc.updateServiceCategory(id, name);
    this.svcCatSaving.set(false);
    if (result.success && result.category) {
      this.svcCategories.update(list =>
        list.map(c => c.id === id ? result.category! : c).sort((a, b) => a.name.localeCompare(b.name))
      );
      this.svcCatEditingId.set(null);
    } else {
      this.svcCatError.set(result.message ?? 'Error al actualizar la categoría.');
    }
  }

  async onDeleteServiceCategory(id: string): Promise<void> {
    if (this.svcCatSaving()) return;
    this.svcCatSaving.set(true);
    this.svcCatError.set('');
    const result = await this.svc.deleteServiceCategory(id);
    this.svcCatSaving.set(false);
    if (result.success) {
      this.svcCategories.update(list => list.filter(c => c.id !== id));
      this.svcCatDeletingId.set(null);
    } else {
      this.svcCatError.set(result.message ?? 'Error al eliminar la categoría.');
    }
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

  readonly planLabel = planLabel;

  logout(): void {
    this.svc.logout();
    this.router.navigate(['/login']);
  }

  // ── Privacidad / datos de la empresa (Ley 21.719) ──────────────────────────────
  // Tanto descargar como eliminar reconfirman la contraseña en un mismo modal.
  exportMsg     = signal<{ type: 'success' | 'error'; text: string } | null>(null);

  confirmIntent = signal<'export' | 'delete' | null>(null);
  confirmBusy   = signal(false);
  confirmError  = signal<string | null>(null);

  openExport(): void { this.openConfirm('export'); }
  openDeleteModal(): void { this.openConfirm('delete'); }

  private openConfirm(intent: 'export' | 'delete'): void {
    this.confirmError.set(null);
    this.confirmIntent.set(intent);
  }

  closeConfirm(): void {
    if (this.confirmBusy()) return;
    this.confirmIntent.set(null);
  }

  async submitConfirm(password: string): Promise<void> {
    if (!password) {
      this.confirmError.set('Ingresa la contraseña de la empresa para confirmar.');
      return;
    }
    this.confirmBusy.set(true);
    this.confirmError.set(null);

    if (this.confirmIntent() === 'export') {
      const result = await this.svc.exportData(password);
      this.confirmBusy.set(false);
      if (result.success) {
        this.confirmIntent.set(null);
        this.exportMsg.set({ type: 'success', text: 'Descarga iniciada. Revisa tu carpeta de descargas.' });
        setTimeout(() => this.exportMsg.set(null), 5000);
      } else {
        this.confirmError.set(result.message ?? 'No se pudieron exportar los datos.');
      }
      return;
    }

    const result = await this.svc.deleteAccount(password);
    if (result.success) {
      this.svc.logout();
      this.router.navigate(['/login']);
    } else {
      this.confirmBusy.set(false);
      this.confirmError.set(result.message ?? 'No se pudo eliminar la empresa.');
    }
  }
}
