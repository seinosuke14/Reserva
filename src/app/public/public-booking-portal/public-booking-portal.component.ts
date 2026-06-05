import { Component, signal, computed, inject, effect, OnInit, OnDestroy, PLATFORM_ID } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { CommonModule, DOCUMENT, isPlatformBrowser } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, Subscription } from 'rxjs';

import { BookingStepIndicatorComponent } from '../components/booking-step-indicator/booking-step-indicator.component';
import { BookingDatetimeSelectorComponent } from '../components/booking-datetime-selector/booking-datetime-selector.component';
import { BookingFormComponent } from '../components/booking-form/booking-form.component';
import { BookingActionsComponent } from '../components/booking-actions/booking-actions.component';
import { BookingFooterComponent } from '../components/booking-footer/booking-footer.component';
import { BookingProfileViewComponent } from '../components/booking-profile-view/booking-profile-view.component';
import { BookingPaymentStepComponent } from '../components/booking-payment-step/booking-payment-step.component';
import { BookingConfirmedComponent } from '../components/booking-confirmed/booking-confirmed.component';

import { formatCLP, formatDateLong } from '../../helpers/formatters';
import { IPublicService, IDayAvailability, ITimeSlot, IPublicPaymentMethod } from '../../helpers/models';
import { AuthService } from '../../core/services/auth.service';
import { CompanyService } from '../../core/services/company.service';
import { QuoteService, IQuoteTokenData } from '../../core/services/quote.service';
import { chileanPhoneValidator, strictEmailValidator } from '../../core/validators/custom-validators';
import { environment } from '../../../environments/environment';

type EmailCheckState = 'idle' | 'checking' | 'exists' | 'not-found';
type LoadState = 'loading' | 'ready' | 'error';

@Component({
  selector: 'app-public-booking-portal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    BookingStepIndicatorComponent,
    BookingDatetimeSelectorComponent,
    BookingFormComponent,
    BookingActionsComponent,
    BookingFooterComponent,
    BookingProfileViewComponent,
    BookingPaymentStepComponent,
    BookingConfirmedComponent,
  ],
  templateUrl: './public-booking-portal.component.html',
  styleUrl: './public-booking-portal.component.scss'
})
export class PublicBookingPortalComponent implements OnInit, OnDestroy {
  private readonly fb         = inject(FormBuilder);
  private readonly route      = inject(ActivatedRoute);
  private readonly router     = inject(Router);
  private readonly http       = inject(HttpClient);
  private readonly quoteSvc   = inject(QuoteService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document   = inject(DOCUMENT);
  readonly auth               = inject(AuthService);
  private readonly company    = inject(CompanyService);
  private readonly titleSvc   = inject(Title);
  private readonly metaSvc    = inject(Meta);
  readonly formatCLP        = formatCLP;
  readonly formatDate       = formatDateLong;

  // ─── Perfil del profesional ─────────────────────────────────────────────────
  readonly loadState    = signal<LoadState>('loading');
  readonly professional = signal<{
    id: string; name: string; slug: string; specialty: string; phone: string;
    description?: string; ratingAvg?: number; ratingCount?: number;
    requiresQuote?:   boolean;
    profileImage?:    string | null;
    bannerImage?:     string | null;
    backgroundColor?: string | null;
    backgroundImage?: string | null;
    backgroundType?:  'color' | 'image';
    headingFont?:     string | null;
    bodyFont?:        string | null;
  } | null>(null);

  readonly stars = [1, 2, 3, 4, 5];
  readonly services       = signal<IPublicService[]>([]);
  readonly availability   = signal<IDayAvailability[]>([]);
  readonly paymentMethods = signal<IPublicPaymentMethod[]>([]);
  readonly reviews        = signal<any[]>([]);

  // ─── Modo de vista ──────────────────────────────────────────────────────────
  readonly viewMode        = signal<'profile' | 'checkout'>('profile');

  // ─── Stepper (3 pasos en checkout: Fecha, Datos, Pago) ─────────────────────
  readonly step            = signal<1 | 2 | 3>(1);
  readonly selectedService = signal<IPublicService | null>(null);
  readonly selectedDate    = signal<string>('');
  readonly selectedHour    = signal<string | null>(null);
  readonly selectedPayment = signal<IPublicPaymentMethod | null>(null);
  readonly isSubmitting    = signal(false);
  readonly isBooked           = signal(false);
  readonly bookingRef         = signal('');
  readonly bookedAppointmentId = signal('');
  readonly copiedTransfer       = signal(false);
  readonly acceptedClientTerms  = signal(false);

  // ─── Modo cotización ─────────────────────────────────────────────────────────
  readonly quoteData   = signal<IQuoteTokenData | null>(null);
  private  quoteToken  = '';

  readonly isQuoteMode = computed(() => !!this.quoteData());

  /** Duración a usar para filtrar slots: del servicio o de la cotización */
  private readonly _bookingDuration = computed(() => {
    const q = this.quoteData();
    if (q) return q.estimatedDuration;
    return this.selectedService()?.duration ?? null;
  });

  /** Precio efectivo: de la cotización o del servicio seleccionado */
  readonly bookingPrice = computed(() =>
    this.quoteData()?.estimatedPrice ?? this.selectedService()?.price ?? 0
  );

  /** Nombre del ítem reservado: ref de cotización o nombre del servicio */
  readonly bookingLabel = computed(() =>
    this.quoteData()
      ? `Cotización ${this.quoteData()!.quoteRef}`
      : (this.selectedService()?.name ?? '')
  );

  // ─── Email check ────────────────────────────────────────────────────────────
  readonly emailCheckState = signal<EmailCheckState>('idle');
  private emailDebounce: ReturnType<typeof setTimeout> | null = null;
  private sub: Subscription | null = null;

  // ─── Estilos dinámicos del portal ──────────────────────────────────────────
  readonly portalBgStyle = computed((): Record<string, string> => {
    const p = this.professional();
    if (!p) return {};
    if (p.backgroundType === 'image' && p.backgroundImage) {
      return {
        'background-image':      `url(${p.backgroundImage})`,
        'background-size':       'cover',
        'background-position':   'center',
        'background-attachment': 'fixed',
      };
    }
    if (p.backgroundColor) return { 'background-color': p.backgroundColor };
    return {};
  });

  readonly headingFontStyle = computed((): Record<string, string> => {
    const f = this.professional()?.headingFont;
    return f ? { 'font-family': `${f}, sans-serif` } : {};
  });

  readonly bodyFontStyle = computed((): Record<string, string> => {
    const f = this.professional()?.bodyFont;
    return f ? { 'font-family': `${f}, sans-serif` } : {};
  });

  private _setMeta(prof: { name: string; specialty: string; profileImage?: string | null; bannerImage?: string | null }, slug: string): void {
    const title = `${prof.name} · ${prof.specialty} | Reserva tu Hora Online | Lets Reserve`;
    const desc  = `Reserva tu cita con ${prof.name} (${prof.specialty}) online. Agenda tu hora, consulta disponibilidad y confirma tu reserva en segundos. Sistema de agendamiento Lets Reserve.`;
    const image = prof.bannerImage ?? prof.profileImage ?? 'https://letsreserve.cl/letsReserve.png';
    this.titleSvc.setTitle(title);
    this.metaSvc.updateTag({ name: 'description', content: desc });
    this.metaSvc.updateTag({ property: 'og:title', content: title });
    this.metaSvc.updateTag({ property: 'og:description', content: desc });
    this.metaSvc.updateTag({ property: 'og:image', content: image });
    this.metaSvc.updateTag({ property: 'og:url', content: `https://letsreserve.cl/reservar/${slug}` });
    this.metaSvc.updateTag({ name: 'twitter:title', content: title });
    this.metaSvc.updateTag({ name: 'twitter:description', content: desc });
    this.metaSvc.updateTag({ name: 'twitter:image', content: image });
  }

  private _loadFont(family: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const id = `gfont-portal-${family.replace(/\s+/g, '-').toLowerCase()}`;
    if (this.document.getElementById(id)) return;
    const link = this.document.createElement('link');
    link.id   = id;
    link.rel  = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${family.replace(/\s+/g, '+')}:wght@300;400;500;600;700&display=swap`;
    this.document.head.appendChild(link);
  }

  // ─── Computed ───────────────────────────────────────────────────────────────
  readonly isGuest       = computed(() => this.auth.currentRole() === 'guest' && !this.company.isAuthenticated());
  readonly showLoginHint = computed(() => this.emailCheckState() === 'exists' && this.isGuest());

  /**
   * Disponibilidad filtrada según la duración del servicio seleccionado.
   * Un slot solo está disponible si hay suficientes bloques consecutivos libres
   * para completar el servicio (ej: 90min = 3 bloques de 30min seguidos).
   */
  readonly filteredAvailability = computed((): IDayAvailability[] => {
    const duration = this._bookingDuration();
    const avail    = this.availability();
    if (!duration) return avail;

    const _d = new Date();
    const todayStr = `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, '0')}-${String(_d.getDate()).padStart(2, '0')}`;

    return avail.map(day => {
      const isToday  = day.date === todayStr;
      const slotDur  = this._inferSlotDuration(day.slots);
      const blocksNeeded = Math.ceil(duration / slotDur);

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

  /** Resumen del horario laboral derivado de la disponibilidad (ej: "Lun - Vie · 09:00 - 18:00") */
  readonly scheduleSummary = computed(() => {
    const avail = this.availability();
    if (!avail.length) return '';
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const workDays: number[] = [];
    let firstSlot = '23:59';
    let lastSlot = '00:00';
    for (const day of avail) {
      const d = new Date(day.date + 'T12:00:00');
      const dow = d.getDay();
      if (!workDays.includes(dow)) workDays.push(dow);
      for (const s of day.slots) {
        if (s.time < firstSlot) firstSlot = s.time;
        if (s.time > lastSlot) lastSlot = s.time;
      }
    }
    workDays.sort((a, b) => a - b);
    if (!workDays.length) return '';
    const first = dayNames[workDays[0]];
    const last = dayNames[workDays[workDays.length - 1]];
    const daysLabel = workDays.length === 1 ? first : `${first} - ${last}`;
    return `${daysLabel} · ${firstSlot} - ${lastSlot}`;
  });

  // ─── Form ───────────────────────────────────────────────────────────────────
  readonly form = this.fb.group({
    name:  ['', [Validators.required, Validators.minLength(3), Validators.maxLength(60), Validators.pattern(/^[A-Za-zÀ-ÿñÑ]+(\s[A-Za-zÀ-ÿñÑ]+)*$/)]],
    email: ['', [Validators.required, Validators.maxLength(254), strictEmailValidator]],
    phone: ['+569', [Validators.required, chileanPhoneValidator]],
    notes: ['', [Validators.maxLength(200)]],
  });

  // form.valid no es una signal — toSignal hace que canProceed reaccione cuando el formulario se valida
  private readonly _formStatus = toSignal(this.form.statusChanges, { initialValue: this.form.status });

  get f() { return this.form.controls; }

  constructor() {
    effect(() => {
      const user    = this.auth.currentUser();
      const company = this.company.currentCompany();
      if (user) {
        this.form.patchValue({ name: user.name, email: user.email, phone: this._normalizePhone(user.phone ?? '') });
      } else if (company) {
        this.form.patchValue({ name: company.name, email: company.email });
      } else {
        this.form.reset({ name: '', email: '', phone: '+569', notes: '' });
      }
    });
  }

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  async ngOnInit(): Promise<void> {
    const slug = this.route.snapshot.paramMap.get('slug') ?? '';
    this.quoteToken = this.route.snapshot.queryParamMap.get('quote') ?? '';

    // Si viene con token de cotización, cargarlo primero
    if (this.quoteToken) {
      try {
        const qData = await this.quoteSvc.getQuoteByToken(this.quoteToken);
        this.quoteData.set(qData);
      } catch {
        // Token inválido o expirado — continúa sin modo cotización
        this.quoteToken = '';
      }
    }

    await this._loadProfile(slug);

    // Pre-llenar formulario con datos del cliente de la cotización
    if (this.quoteData()) {
      const q = this.quoteData()!;
      this.form.patchValue({ name: q.customerName, email: q.customerEmail, phone: q.customerPhone });
      this.viewMode.set('checkout');
    }

    this.sub = this.f['email'].valueChanges.subscribe(email => {
      if (!email || this.f['email'].invalid || !this.isGuest()) {
        this.emailCheckState.set('idle');
        return;
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

  // ─── Carga de datos ──────────────────────────────────────────────────────────

  private async _loadProfile(slug: string): Promise<void> {
    try {
      const data: any = await firstValueFrom(
        this.http.get(`${environment.apiUrl}/public/professionals/${slug}`)
      );

      if (data.companyRedirect) {
        this.loadState.set('ready');
        if (data.companySlug) {
          this.router.navigate(['/empresa', data.companySlug], { replaceUrl: true });
        } else {
          this.loadState.set('error');
        }
        return;
      }

      this.professional.set(data.professional);
      if (data.professional.headingFont) this._loadFont(data.professional.headingFont);
      if (data.professional.bodyFont)    this._loadFont(data.professional.bodyFont);
      this.services.set(data.services);
      this.availability.set(data.availability);
      this.reviews.set(data.reviews ?? []);
      const visibleMethods: IPublicPaymentMethod[] = (data.paymentMethods ?? [])
        .filter((m: IPublicPaymentMethod) => m.provider !== 'webpay' && m.provider !== 'mercadopago');
      this.paymentMethods.set(visibleMethods);

      if (data.availability.length > 0) {
        this.selectedDate.set(data.availability[0].date);
      }
      // Si solo hay un método de pago, preseleccionarlo
      if (visibleMethods.length === 1) {
        this.selectedPayment.set(visibleMethods[0]);
      }
      this.loadState.set('ready');
      this._setMeta(data.professional, slug);
    } catch (err: any) {
      if (err?.status === 404) {
        this.router.navigate(['/app']);
      } else {
        this.loadState.set('error');
      }
    }
  }

  // ─── Acciones ───────────────────────────────────────────────────────────────

  selectService(service: IPublicService): void {
    this.selectedService.set(service);
    this.step.set(1);
    this.selectedHour.set(null);
    this.viewMode.set('checkout');
  }

  backToProfile(): void {
    this.viewMode.set('profile');
    this.selectedService.set(null);
    this.selectedHour.set(null);
    this.step.set(1);
  }

  selectDate(date: string): void {
    this.selectedDate.set(date);
    this.selectedHour.set(null);
  }

  selectHour(time: string): void {
    this.selectedHour.set(time);
  }

  selectPayment(method: IPublicPaymentMethod): void {
    this.selectedPayment.set(method);
  }

  goBack(): void {
    const current = this.step();
    if (current === 1) {
      this.backToProfile();
    } else {
      this.step.set((current - 1) as 1 | 2 | 3);
    }
  }

  goNext(): void {
    const current = this.step();
    if (current < 3 && this.canProceed()) this.step.set((current + 1) as 1 | 2 | 3);
  }

  readonly canProceed = computed(() => {
    if (this.step() === 1) return !!this.selectedHour();
    if (this.step() === 2) return this._formStatus() === 'VALID';
    if (this.step() === 3) return !!this.selectedPayment() && this.acceptedClientTerms();
    return false;
  });

  goToLogin(): void {
    this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
  }

  goToQuote(): void {
    const slug = this.professional()?.slug ?? this.route.snapshot.paramMap.get('slug') ?? '';
    this.router.navigate(['/cotizar', slug]);
  }

  private _normalizePhone(value: string): string {
    const digits = value.replace(/\D/g, '').replace(/^569/, '');
    return '+569' + digits.slice(0, 8);
  }

  getWhatsappLink(): string {
    const phone = this.professional()?.phone?.replace(/\D/g, '') ?? '';
    const service = this.selectedService()?.name ?? '';
    const date = this.selectedDate() ? this.formatDate(this.selectedDate()) : '';
    const hour = this.selectedHour() ?? '';
    const name = this.form.value.name ?? '';
    const msg = encodeURIComponent(
      `Hola! Soy ${name}, he realizado una transferencia por la reserva de ${service} el ${date} a las ${hour}. Adjunto comprobante.`
    );
    return `https://wa.me/${phone}?text=${msg}`;
  }

  copyTransferData(amount: number = 0): void {
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

  async confirmBooking(): Promise<void> {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    if (!this.selectedPayment()) return;

    const provider = this.selectedPayment()!.provider;

    // Para transferencia, no llamamos a la API de pago, solo creamos la cita
    if (provider === 'transfer') {
      await this._createBooking('transfer');
      return;
    }

    // Para webpay y mercadopago, flujo con redirección
    await this._createBooking(provider);
  }

  private async _createBooking(provider: string): Promise<void> {
    this.isSubmitting.set(true);
    try {
      const { name, email, phone, notes } = this.form.value;
      const body: Record<string, any> = {
        slug:            this.professional()?.slug,
        termsAcceptedAt: new Date().toISOString(),
        date:     this.selectedDate(),
        time:     this.selectedHour(),
        name, email, phone, notes,
        paymentProvider: provider,
      };

      if (this.quoteToken) {
        body['quoteToken'] = this.quoteToken;
      } else {
        body['serviceId'] = this.selectedService()!.id;
      }

      const res: any = await firstValueFrom(
        this.http.post(`${environment.apiUrl}/public/book`, body)
      );

      if (provider === 'transfer') {
        this.bookingRef.set(res.bookingRef ?? '');
        this.bookedAppointmentId.set(res.appointmentId ?? '');
        this.isBooked.set(true);
      } else if (res.url && res.token) {
        this.document.defaultView!.location.href = res.url;
      } else {
        this.bookingRef.set(res.bookingRef);
        this.bookedAppointmentId.set(res.appointmentId ?? '');
        this.isBooked.set(true);
      }
    } catch (err: any) {
      alert(err?.error?.message ?? 'No se pudo confirmar la reserva. Intenta de nuevo.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

}
