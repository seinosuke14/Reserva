import { Component, inject, signal, computed, OnInit, OnDestroy, PLATFORM_ID } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { CommonModule, DOCUMENT, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { firstValueFrom, Subscription } from 'rxjs';

import {
  CompanyService,
  ICompanyBrand,
  ICompanyPublicPage,
  ICompanyPublicMember,
  ICompanyPublicService,
  ICompanyPublicPaymentMethod,
  ICompanyPublicReview,
} from '../../core/services/company.service';
import { AuthService } from '../../core/services/auth.service';
import { BookingStepIndicatorComponent } from '../components/booking-step-indicator/booking-step-indicator.component';
import { BookingDatetimeSelectorComponent } from '../components/booking-datetime-selector/booking-datetime-selector.component';
import { BookingFormComponent } from '../components/booking-form/booking-form.component';
import { BookingActionsComponent } from '../components/booking-actions/booking-actions.component';
import { IDayAvailability, ITimeSlot } from '../../helpers/models';
import { formatCLP, formatDateLong } from '../../helpers/formatters';
import { chileanPhoneValidator, strictEmailValidator } from '../../core/validators/custom-validators';
import { environment } from '../../../environments/environment';

type EmailCheckState = 'idle' | 'checking' | 'exists' | 'not-found';

interface IPaymentMethodView {
  provider: 'flow' | 'transfer';
  transferInfo?: {
    bankName: string; accountType: string; accountNumber: string;
    rut: string; holderName: string; email: string;
  };
}

@Component({
  selector: 'app-company-public-page',
  standalone: true,
  imports: [
    CommonModule, RouterModule, ReactiveFormsModule,
    BookingStepIndicatorComponent,
    BookingDatetimeSelectorComponent,
    BookingFormComponent,
    BookingActionsComponent,
  ],
  templateUrl: './company-public-page.component.html',
  styleUrls: ['./company-public-page.component.scss'],
})
export class CompanyPublicPageComponent implements OnInit, OnDestroy {
  private readonly svc        = inject(CompanyService);
  private readonly route      = inject(ActivatedRoute);
  private readonly router     = inject(Router);
  private readonly http       = inject(HttpClient);
  private readonly fb         = inject(FormBuilder);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document   = inject(DOCUMENT);
  readonly auth               = inject(AuthService);
  private readonly titleSvc   = inject(Title);
  private readonly metaSvc    = inject(Meta);

  readonly formatCLP  = formatCLP;
  readonly formatDate = formatDateLong;

  // ── Page state ───────────────────────────────────────────────────────────────
  state = signal<'loading' | 'ready' | 'error'>('loading');
  data  = signal<ICompanyPublicPage | null>(null);

  readonly portalBgStyle = computed(() => {
    const c = this.data()?.company;
    if (!c) return {};
    if (c.backgroundType === 'image' && c.backgroundImage)
      return { 'background-image': `url(${c.backgroundImage})`, 'background-size': 'cover', 'background-position': 'center' };
    return { 'background-color': c.backgroundColor ?? '#f8fafc' };
  });

  readonly headingFontStyle = computed(() => {
    const f = this.data()?.company?.headingFont;
    return f ? { 'font-family': `${f}, sans-serif` } : {};
  });

  readonly bodyFontStyle = computed(() => {
    const f = this.data()?.company?.bodyFont;
    return f ? { 'font-family': `${f}, sans-serif` } : {};
  });

  // ── Booking state ────────────────────────────────────────────────────────────
  viewMode        = signal<'profile' | 'booking'>('profile');
  bookingMember   = signal<ICompanyPublicMember | null>(null);
  bookingService  = signal<ICompanyPublicService | null>(null);
  step            = signal<1 | 2 | 3>(1);

  availability    = signal<IDayAvailability[]>([]);
  availLoading    = signal(false);
  selectedDate    = signal('');
  selectedHour    = signal<string | null>(null);

  paymentMethods  = signal<IPaymentMethodView[]>([]);
  selectedPayment = signal<IPaymentMethodView | null>(null);
  copiedTransfer  = signal(false);
  acceptedTerms   = signal(false);

  selectedServiceId  = signal<string | null>(null);

  isSubmitting       = signal(false);
  isBooked           = signal(false);
  bookingRef         = signal('');
  bookedAppointmentId = signal('');

  emailCheckState = signal<EmailCheckState>('idle');
  private emailDebounce: ReturnType<typeof setTimeout> | null = null;
  private sub: Subscription | null = null;

  readonly form = this.fb.group({
    name:  ['', [Validators.required, Validators.minLength(3), Validators.maxLength(60), Validators.pattern(/^[A-Za-zÀ-ÿñÑ]+(\s[A-Za-zÀ-ÿñÑ]+)*$/)]],
    email: ['', [Validators.required, Validators.maxLength(254), strictEmailValidator]],
    phone: ['+569', [Validators.required, chileanPhoneValidator]],
    notes: ['', [Validators.maxLength(200)]],
  });

  private readonly _formStatus = toSignal(this.form.statusChanges, { initialValue: this.form.status });
  get f() { return this.form.controls; }

  readonly isGuest       = computed(() => this.auth.currentRole() === 'guest' && !this.svc.isAuthenticated());
  readonly showLoginHint = computed(() => this.emailCheckState() === 'exists' && this.isGuest());

  readonly filteredAvailability = computed((): IDayAvailability[] => {
    const service = this.bookingService();
    const avail   = this.availability();
    if (!service) return avail;

    const todayStr = new Date().toISOString().slice(0, 10);

    return avail.map(day => {
      const isToday      = day.date === todayStr;
      const slotDur      = this._inferSlotDuration(day.slots);
      const blocksNeeded = Math.ceil(service.duration / slotDur);

      const withPast = day.slots.map(slot => {
        if (isToday && this._isSlotPast(slot.time)) return { ...slot, available: false };
        return slot;
      });

      if (blocksNeeded <= 1) return { ...day, slots: withPast };

      const slotMap = new Map(withPast.map(s => [s.time, s.available]));
      const filteredSlots = withPast.map(slot => {
        if (!slot.available) return slot;
        const [h, m]   = slot.time.split(':').map(Number);
        const startMin = h * 60 + m;
        let canBook    = true;
        for (let b = 1; b < blocksNeeded; b++) {
          const nextMin  = startMin + b * slotDur;
          const nextTime = `${String(Math.floor(nextMin / 60)).padStart(2, '0')}:${String(nextMin % 60).padStart(2, '0')}`;
          if (!slotMap.get(nextTime)) { canBook = false; break; }
        }
        return canBook ? slot : { ...slot, available: false };
      });
      return { ...day, slots: filteredSlots };
    });
  });

  private _isSlotPast(slotTime: string): boolean {
    const [h, m] = slotTime.split(':').map(Number);
    const slot   = new Date();
    slot.setHours(h, m, 0, 0);
    return slot < new Date();
  }

  private _inferSlotDuration(slots: ITimeSlot[]): number {
    if (slots.length < 2) return 30;
    const [h1, m1] = slots[0].time.split(':').map(Number);
    const [h2, m2] = slots[1].time.split(':').map(Number);
    return (h2 * 60 + m2) - (h1 * 60 + m1);
  }

  readonly canProceed = computed(() => {
    if (this.step() === 1) return !!this.selectedHour();
    if (this.step() === 2) return this._formStatus() === 'VALID';
    if (this.step() === 3) return !!this.selectedPayment() && this.acceptedTerms();
    return false;
  });

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  async ngOnInit(): Promise<void> {
    const slug = this.route.snapshot.paramMap.get('slug') ?? '';
    const res  = await this.svc.getPublicPage(slug);
    if (res) {
      this.data.set(res);
      this._loadFontIfNeeded(res.company.headingFont);
      this._loadFontIfNeeded(res.company.bodyFont);
      const methods = this._buildPaymentMethods(res.paymentMethods ?? []);
      this.paymentMethods.set(methods);
      if (methods.length === 1) this.selectedPayment.set(methods[0]);
      this.state.set('ready');
      this._setMeta(res.company);
    } else {
      this.state.set('error');
    }

    // Pre-rellena el form si hay sesión (profesional o empresa)
    const user = this.auth.currentUser();
    if (user) {
      this.form.patchValue({ name: user.name, email: user.email, phone: this._normalizePhone(user.phone ?? '') });
    }

    this.sub = this.f['email'].valueChanges.subscribe(email => {
      if (!email || this.f['email'].invalid || !this.isGuest()) {
        this.emailCheckState.set('idle'); return;
      }
      if (this.emailDebounce) clearTimeout(this.emailDebounce);
      this.emailCheckState.set('checking');
      this.emailDebounce = setTimeout(async () => {
        const exists = await this.auth.checkEmailExists(email);
        this.emailCheckState.set(exists ? 'exists' : 'not-found');
      }, 700);
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    if (this.emailDebounce) clearTimeout(this.emailDebounce);
  }

  // ── Actions ──────────────────────────────────────────────────────────────────

  async book(member: ICompanyPublicMember, service: ICompanyPublicService): Promise<void> {
    this.bookingMember.set(member);
    this.bookingService.set(service);
    this.step.set(1);
    this.selectedHour.set(null);
    this.viewMode.set('booking');
    if (member.slug) {
      this.availLoading.set(true);
      try {
        const data: any = await firstValueFrom(
          this.http.get(`${environment.apiUrl}/public/professionals/${member.slug}/availability`)
        );
        this.availability.set(data.availability ?? []);
        if (data.availability?.length) this.selectedDate.set(data.availability[0].date);
      } finally { this.availLoading.set(false); }
    }
  }

  backToProfile(): void {
    this.viewMode.set('profile');
    this.bookingMember.set(null);
    this.bookingService.set(null);
    this.selectedHour.set(null);
    this.step.set(1);
    this.isBooked.set(false);
    this.bookingRef.set('');
    this.acceptedTerms.set(false);
  }

  selectDate(date: string): void { this.selectedDate.set(date); this.selectedHour.set(null); }
  selectHour(time: string): void { this.selectedHour.set(time); }
  selectPayment(method: IPaymentMethodView): void { this.selectedPayment.set(method); }

  goBack(): void {
    const s = this.step();
    if (s === 1) this.backToProfile();
    else this.step.set((s - 1) as 1 | 2 | 3);
  }

  goNext(): void {
    const s = this.step();
    if (s < 3 && this.canProceed()) this.step.set((s + 1) as 1 | 2 | 3);
  }

  goToLogin(): void {
    this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
  }

  goToSurvey(): void {
    this.router.navigate(['/reservar/encuesta'], { queryParams: { appointmentId: this.bookedAppointmentId() } });
  }

  toggleServiceReviews(serviceId: string): void {
    this.selectedServiceId.update(cur => cur === serviceId ? null : serviceId);
  }

  reviewStars(rating: number): string[] {
    return Array.from({ length: 5 }, (_, i) => i < rating ? 'filled' : 'empty');
  }

  formatReviewDate(iso: string): string {
    return new Date(iso).toLocaleDateString('es-CL', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  async confirmBooking(): Promise<void> {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    if (!this.selectedPayment()) return;
    this.isSubmitting.set(true);
    try {
      const { name, email, phone, notes } = this.form.value;
      const res: any = await firstValueFrom(
        this.http.post(`${environment.apiUrl}/public/book`, {
          slug:            this.bookingMember()?.slug,
          serviceId:       this.bookingService()!.id,
          termsAcceptedAt: new Date().toISOString(),
          date:            this.selectedDate(),
          time:            this.selectedHour(),
          name, email, phone, notes,
          paymentProvider: this.selectedPayment()!.provider,
        })
      );
      if (this.selectedPayment()!.provider === 'transfer') {
        this.bookingRef.set(res.bookingRef ?? '');
        this.bookedAppointmentId.set(res.appointmentId ?? '');
        this.isBooked.set(true);
      } else if (res.url) {
        this.document.defaultView!.location.href = res.url;
      } else {
        this.bookingRef.set(res.bookingRef ?? '');
        this.isBooked.set(true);
      }
    } catch (err: any) {
      alert(err?.error?.message ?? 'No se pudo confirmar la reserva. Intenta de nuevo.');
    } finally { this.isSubmitting.set(false); }
  }

  copyTransferData(amount?: number): void {
    const info = this.selectedPayment()?.transferInfo;
    if (!info) return;
    const lines = [
      `Banco: ${info.bankName}`,
      `Tipo de cuenta: ${info.accountType}`,
      `Número de cuenta: ${info.accountNumber}`,
      `RUT: ${info.rut}`,
      `Nombre: ${info.holderName}`,
      `Email: ${info.email}`,
    ];
    if (amount != null) lines.push(`Monto: ${this.formatCLP(amount)}`);
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      this.copiedTransfer.set(true);
      setTimeout(() => this.copiedTransfer.set(false), 2500);
    });
  }

  getWhatsappLink(): string {
    const service = this.bookingService()?.name ?? '';
    const date    = this.selectedDate() ? this.formatDate(this.selectedDate()) : '';
    const hour    = this.selectedHour() ?? '';
    const name    = this.form.value.name ?? '';
    const msg     = encodeURIComponent(
      `Hola! Soy ${name}, he realizado una transferencia por la reserva de ${service} el ${date} a las ${hour}. Adjunto comprobante.`
    );
    const companyEmail = this.selectedPayment()?.transferInfo?.email ?? '';
    return `mailto:${companyEmail}?subject=Comprobante%20de%20transferencia&body=${msg}`;
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private _setMeta(company: ICompanyBrand): void {
    const title = `${company.name} · Reserva tu Hora Online | Agenda Citas | Lets Reserve`;
    const desc  = `Reserva tu hora con ${company.name} online. Agenda citas, consulta horarios disponibles y reserva en un clic. Sistema de agendamiento online en Lets Reserve.`;
    const image = company.backgroundImage ?? 'https://letsreserve.cl/letsReserve.png';
    this.titleSvc.setTitle(title);
    this.metaSvc.updateTag({ name: 'description', content: desc });
    this.metaSvc.updateTag({ property: 'og:title', content: title });
    this.metaSvc.updateTag({ property: 'og:description', content: desc });
    this.metaSvc.updateTag({ property: 'og:image', content: image });
    this.metaSvc.updateTag({ property: 'og:url', content: `https://letsreserve.cl/empresa/${this.route.snapshot.paramMap.get('slug')}` });
    this.metaSvc.updateTag({ name: 'twitter:title', content: title });
    this.metaSvc.updateTag({ name: 'twitter:description', content: desc });
    this.metaSvc.updateTag({ name: 'twitter:image', content: image });
  }

  private _buildPaymentMethods(raw: ICompanyPublicPaymentMethod[]): IPaymentMethodView[] {
    return raw.map(m => {
      if (m.provider === 'transfer') {
        const raw = m.credentials;
        const c: Record<string, string> = typeof raw === 'string' ? JSON.parse(raw) : raw;
        return {
          provider: 'transfer' as const,
          transferInfo: {
            bankName: c['bankName'] ?? '',
            accountType: c['accountType'] ?? '',
            accountNumber: c['accountNumber'] ?? '',
            rut: c['rut'] ?? '',
            holderName: c['holderName'] ?? '',
            email: c['email'] ?? '',
          },
        };
      }
      return { provider: m.provider };
    });
  }

  private _loadFontIfNeeded(family: string | null | undefined): void {
    if (!family || !isPlatformBrowser(this.platformId)) return;
    const id = `gfont-co-${family.replace(/\s+/g, '-').toLowerCase()}`;
    if (this.document.getElementById(id)) return;
    const link = this.document.createElement('link');
    link.id = id; link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${family.replace(/\s+/g, '+')}:wght@300;400;500;600;700&display=swap`;
    this.document.head.appendChild(link);
  }

  private _normalizePhone(value: string): string {
    const digits = value.replace(/\D/g, '').replace(/^569/, '');
    return '+569' + digits.slice(0, 8);
  }
}
