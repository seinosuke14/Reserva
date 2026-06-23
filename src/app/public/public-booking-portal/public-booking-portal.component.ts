import { Component, signal, computed, inject, effect, OnInit, OnDestroy } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { CommonModule, DOCUMENT } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { BookingStepIndicatorComponent } from '../components/booking-step-indicator/booking-step-indicator.component';
import { BookingDatetimeSelectorComponent } from '../components/booking-datetime-selector/booking-datetime-selector.component';
import { BookingFormComponent } from '../components/booking-form/booking-form.component';
import { BookingActionsComponent } from '../components/booking-actions/booking-actions.component';
import { BookingFooterComponent } from '../components/booking-footer/booking-footer.component';
import { BookingProfileViewComponent } from '../components/booking-profile-view/booking-profile-view.component';
import { BookingPaymentStepComponent } from '../components/booking-payment-step/booking-payment-step.component';
import { BookingConfirmedComponent } from '../components/booking-confirmed/booking-confirmed.component';
import { NameChangeConfirmComponent } from '../../components/name-change-confirm/name-change-confirm.component';

import { formatCLP, formatDateLong, withVat } from '../../helpers/formatters';
import { IPublicService, IServiceCategory, IDayAvailability, IPublicPaymentMethod } from '../../helpers/models';
import { filterAvailabilityByDuration } from '../../helpers/availability-utils';
import { brandBgStyle, fontFamilyStyle } from '../../helpers/brand-styles';
import { buildBookingForm, normalizePhone, buildTransferText, transferReceiptMessage, EmailChecker } from '../../helpers/booking-utils';
import { setSocialMeta } from '../../helpers/seo';
import { AuthService } from '../../core/services/auth.service';
import { CompanyService } from '../../core/services/company.service';
import { FontLoaderService } from '../../core/services/font-loader.service';
import { MetaPixelService } from '../../core/services/meta-pixel.service';
import { QuoteService, IQuoteTokenData } from '../../core/services/quote.service';
import { environment } from '../../../environments/environment';

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
    NameChangeConfirmComponent,
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
  private readonly fontLoader = inject(FontLoaderService);
  private readonly pixel      = inject(MetaPixelService);
  private readonly document   = inject(DOCUMENT);
  readonly auth               = inject(AuthService);
  private readonly company    = inject(CompanyService);
  private readonly titleSvc   = inject(Title);
  private readonly metaSvc    = inject(Meta);
  readonly formatCLP        = formatCLP;
  readonly formatDate       = formatDateLong;
  readonly withVat          = withVat;

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
  readonly categories     = signal<IServiceCategory[]>([]);
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
  private readonly emailChecker = new EmailChecker();
  readonly emailCheckState      = this.emailChecker.state;

  // Nombre guardado en BD para el correo ingresado (cliente recurrente).
  readonly storedCustomerName = signal<string | null>(null);
  // Confirmación pendiente de cambio de nombre (from = guardado, to = nuevo).
  readonly pendingNameChange  = signal<{ from: string; to: string } | null>(null);

  // ─── Estilos dinámicos del portal ──────────────────────────────────────────
  readonly portalBgStyle    = computed(() => brandBgStyle(this.professional(), { fixed: true }));
  readonly headingFontStyle = computed(() => fontFamilyStyle(this.professional()?.headingFont));
  readonly bodyFontStyle    = computed(() => fontFamilyStyle(this.professional()?.bodyFont));

  private _setMeta(prof: { name: string; specialty: string; profileImage?: string | null; bannerImage?: string | null }, slug: string): void {
    setSocialMeta(this.titleSvc, this.metaSvc, {
      title:       `${prof.name} · ${prof.specialty} | Reserva tu Hora Online | Lets Reserve`,
      description: `Reserva tu cita con ${prof.name} (${prof.specialty}) online. Agenda tu hora, consulta disponibilidad y confirma tu reserva en segundos. Sistema de agendamiento Lets Reserve.`,
      image:       prof.bannerImage ?? prof.profileImage ?? 'https://www.letsreserve.cl/letsReserve.png',
      url:         `https://www.letsreserve.cl/reservar/${slug}`,
    }, this.document);
  }

  // ─── Computed ───────────────────────────────────────────────────────────────
  readonly isGuest       = computed(() => this.auth.currentRole() === 'guest' && !this.company.isAuthenticated());
  readonly showLoginHint = computed(() => this.emailCheckState() === 'exists' && this.isGuest());

  /**
   * Disponibilidad filtrada según la duración del servicio seleccionado.
   * Ver helpers/availability-utils.ts.
   */
  readonly filteredAvailability = computed((): IDayAvailability[] =>
    filterAvailabilityByDuration(this.availability(), this._bookingDuration())
  );

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
  readonly form = buildBookingForm(this.fb);

  // form.valid no es una signal — toSignal hace que canProceed reaccione cuando el formulario se valida
  private readonly _formStatus = toSignal(this.form.statusChanges, { initialValue: this.form.status });

  get f() { return this.form.controls; }

  constructor() {
    effect(() => {
      const user    = this.auth.currentUser();
      const company = this.company.currentCompany();
      if (user) {
        this.form.patchValue({ name: user.name, email: user.email, phone: normalizePhone(user.phone ?? '') });
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

    this.emailChecker.watch(
      this.f['email'],
      () => this.isGuest(),
      email => this.auth.checkEmailExists(email),
      email => this._prefillFromEmail(email),
    );
  }

  ngOnDestroy(): void {
    this.emailChecker.destroy();
  }

  /**
   * Busca el cliente recurrente (mismo profesional + email) y guarda su nombre para
   * detectar cambios. Autocompleta el nombre solo si está vacío: si el cliente ya
   * escribió uno, se respeta.
   */
  private async _prefillFromEmail(email: string): Promise<void> {
    const slug = this.professional()?.slug;
    if (!slug) return;

    try {
      const res: any = await firstValueFrom(
        this.http.get(`${environment.apiUrl}/public/customer-lookup`, { params: { slug, email } })
      );
      if (!res?.found) { this.storedCustomerName.set(null); return; }
      this.storedCustomerName.set(res.name ?? null);

      const nameCtrl = this.f['name'];
      if (!nameCtrl.value?.trim() && res.name) nameCtrl.setValue(res.name);
    } catch {
      // Autocompletado best-effort: si falla, el cliente llena los datos manualmente.
    }
  }

  /** True si el cliente recurrente ingresó un nombre distinto al que tiene guardado. */
  private _nameChangePending(): boolean {
    const stored  = this.storedCustomerName()?.trim();
    const entered = (this.f['name'].value ?? '').trim();
    return !!stored && !!entered && stored.toLowerCase() !== entered.toLowerCase();
  }

  /** El cliente confirma cambiar el nombre asociado a su correo: continúa al pago. */
  confirmNameChange(): void {
    this.storedCustomerName.set((this.f['name'].value ?? '').trim());
    this.pendingNameChange.set(null);
    this.step.set(3);
    this._trackStep(3);
  }

  /** El cliente prefiere mantener el nombre que suele usar: lo restaura y continúa. */
  keepStoredName(): void {
    const stored = this.storedCustomerName();
    if (stored) this.f['name'].setValue(stored);
    this.pendingNameChange.set(null);
    this.step.set(3);
    this._trackStep(3);
  }

  /**
   * Embudo (Meta Pixel): dispara el evento al ENTRAR a cada paso, para medir
   * hasta dónde llega el usuario. Paso 2 = llegó a datos; paso 3 = llegó a pago.
   */
  private _trackStep(step: 1 | 2 | 3): void {
    if (step === 2) {
      this.pixel.track('AddBookingInfo', {
        content_name: this.bookingLabel(),
        value:        this.bookingPrice(),
        currency:     'CLP',
      });
    } else if (step === 3) {
      this.pixel.track('InitiateCheckout', {
        content_name:   this.bookingLabel(),
        value:          this.bookingPrice(),
        currency:       'CLP',
        payment_method: this.selectedPayment()?.provider,
      });
    }
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
      this.fontLoader.load(data.professional.headingFont);
      this.fontLoader.load(data.professional.bodyFont);
      this.services.set(data.services);
      this.categories.set(data.categories ?? []);
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

      // Embudo de reserva (Meta Pixel): el visitante llegó al perfil del profesional.
      this.pixel.track('ViewContent', {
        content_type: 'professional',
        content_name: data.professional.name,
        content_ids:  [slug],
        specialty:    data.professional.specialty,
      });
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

    // Embudo: eligió un servicio (de quién, qué y a qué precio).
    this.pixel.track('AddToCart', {
      content_type: 'service',
      content_name: service.name,
      content_ids:  [service.id],
      value:        service.price ?? 0,
      currency:     'CLP',
      professional: this.professional()?.name,
    });
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

    // Embudo: eligió una fecha.
    this.pixel.track('SelectBookingDate', {
      date,
      content_name: this.bookingLabel(),
      professional: this.professional()?.name,
    });
  }

  selectHour(time: string): void {
    this.selectedHour.set(time);

    // Embudo: eligió una hora.
    this.pixel.track('SelectBookingTime', {
      date:         this.selectedDate(),
      time,
      content_name: this.bookingLabel(),
      value:        this.bookingPrice(),
      currency:     'CLP',
    });
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
    if (current >= 3 || !this.canProceed()) return;

    // Al salir del paso de datos, si el cliente recurrente cambió su nombre habitual,
    // pedir confirmación antes de continuar (el cambio se guarda al reservar).
    if (current === 2 && this._nameChangePending()) {
      this.pendingNameChange.set({
        from: this.storedCustomerName()!.trim(),
        to:   (this.f['name'].value ?? '').trim(),
      });
      return;
    }

    const next = (current + 1) as 1 | 2 | 3;
    this.step.set(next);
    this._trackStep(next);
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

  getWhatsappLink(): string {
    const phone = this.professional()?.phone?.replace(/\D/g, '') ?? '';
    const service = this.selectedService()?.name ?? '';
    const date = this.selectedDate() ? this.formatDate(this.selectedDate()) : '';
    const hour = this.selectedHour() ?? '';
    const name = this.form.value.name ?? '';
    const msg = encodeURIComponent(transferReceiptMessage(name, service, date, hour));
    return `https://wa.me/${phone}?text=${msg}`;
  }

  copyTransferData(amount: number = 0): void {
    const info = this.selectedPayment()?.transferInfo;
    if (!info) return;

    navigator.clipboard.writeText(buildTransferText(info, amount)).then(() => {
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

      // Reserva creada con éxito → evento de conversión Schedule (Meta Pixel).
      // Se dispara para todos los métodos; el Purchase (pago real) se registra
      // luego en payment-result. sendBeacon hace que llegue aun si redirigimos.
      this.pixel.track('Schedule', { value: this.bookingPrice(), currency: 'CLP' });

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

      // Confirmación in-page (transferencia o pago sin redirección): llegó a la
      // pantalla de agradecimiento. El flujo con redirección lo registra
      // payment-result al volver. Métrica de embudo "llegó hasta el final".
      if (this.isBooked()) {
        this.pixel.track('BookingThankYou', {
          value:    this.bookingPrice(),
          currency: 'CLP',
          payment:  provider,
        });
      }
    } catch (err: any) {
      alert(err?.error?.message ?? 'No se pudo confirmar la reserva. Intenta de nuevo.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

}
