import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { CommonModule, DOCUMENT } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';

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
import { IDayAvailability, ITransferInfo, IServiceCategory } from '../../helpers/models';
import { CategoryFilterChipsComponent } from '../../components/category-filter-chips/category-filter-chips.component';
import { formatCLP, formatDateLong, withVat } from '../../helpers/formatters';
import { filterAvailabilityByDuration } from '../../helpers/availability-utils';
import { brandBgStyle, fontFamilyStyle } from '../../helpers/brand-styles';
import { buildBookingForm, normalizePhone, buildTransferText, transferReceiptMessage, EmailChecker } from '../../helpers/booking-utils';
import { setSocialMeta } from '../../helpers/seo';
import { FontLoaderService } from '../../core/services/font-loader.service';
import { environment } from '../../../environments/environment';

interface IPaymentMethodView {
  provider: 'flow' | 'transfer' | 'khipu' | 'mercadopago';
  transferInfo?: ITransferInfo;
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
    CategoryFilterChipsComponent,
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
  private readonly fontLoader = inject(FontLoaderService);
  private readonly document   = inject(DOCUMENT);
  readonly auth               = inject(AuthService);
  private readonly titleSvc   = inject(Title);
  private readonly metaSvc    = inject(Meta);

  readonly formatCLP  = formatCLP;
  readonly withVat    = withVat;
  readonly formatDate = formatDateLong;

  // ── Page state ───────────────────────────────────────────────────────────────
  state = signal<'loading' | 'ready' | 'error'>('loading');
  data  = signal<ICompanyPublicPage | null>(null);

  readonly portalBgStyle    = computed(() => brandBgStyle(this.data()?.company, { fallbackColor: '#f8fafc' }));
  readonly headingFontStyle = computed(() => fontFamilyStyle(this.data()?.company?.headingFont));
  readonly bodyFontStyle    = computed(() => fontFamilyStyle(this.data()?.company?.bodyFont));

  // ── Filtro por categoría ─────────────────────────────────────────────────────
  selectedCategory = signal<string | null>(null);

  // Solo categorías con al menos un servicio asignado entre todos los miembros
  readonly usedCategories = computed((): IServiceCategory[] => {
    const members = this.data()?.members ?? [];
    return (this.data()?.categories ?? []).filter(c =>
      members.some(m => m.services.some(s => s.categoryId === c.id))
    );
  });

  readonly hasUncategorized = computed(() =>
    this.usedCategories().length > 0 &&
    (this.data()?.members ?? []).some(m => m.services.some(s => !s.categoryId))
  );

  // Miembros con sus servicios filtrados por categoría (oculta miembros sin resultados)
  readonly filteredMembers = computed((): ICompanyPublicMember[] => {
    const members = this.data()?.members ?? [];
    const filter = this.selectedCategory();
    if (filter === null) return members;
    return members
      .map(m => ({
        ...m,
        services: m.services.filter(s => filter === 'none' ? !s.categoryId : s.categoryId === filter),
      }))
      .filter(m => m.services.length > 0);
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

  private readonly emailChecker = new EmailChecker();
  readonly emailCheckState      = this.emailChecker.state;

  readonly form = buildBookingForm(this.fb);

  private readonly _formStatus = toSignal(this.form.statusChanges, { initialValue: this.form.status });
  get f() { return this.form.controls; }

  readonly isGuest       = computed(() => this.auth.currentRole() === 'guest' && !this.svc.isAuthenticated());
  readonly showLoginHint = computed(() => this.emailCheckState() === 'exists' && this.isGuest());

  readonly filteredAvailability = computed((): IDayAvailability[] =>
    filterAvailabilityByDuration(this.availability(), this.bookingService()?.duration ?? null)
  );

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
      this.fontLoader.load(res.company.headingFont);
      this.fontLoader.load(res.company.bodyFont);
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
      this.form.patchValue({ name: user.name, email: user.email, phone: normalizePhone(user.phone ?? '') });
    }

    this.emailChecker.watch(this.f['email'], () => this.isGuest(), email => this.auth.checkEmailExists(email));
  }

  ngOnDestroy(): void {
    this.emailChecker.destroy();
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
    navigator.clipboard.writeText(buildTransferText(info, amount)).then(() => {
      this.copiedTransfer.set(true);
      setTimeout(() => this.copiedTransfer.set(false), 2500);
    });
  }

  getWhatsappLink(): string {
    const service = this.bookingService()?.name ?? '';
    const date    = this.selectedDate() ? this.formatDate(this.selectedDate()) : '';
    const hour    = this.selectedHour() ?? '';
    const name    = this.form.value.name ?? '';
    const msg     = encodeURIComponent(transferReceiptMessage(name, service, date, hour));
    const companyEmail = this.selectedPayment()?.transferInfo?.email ?? '';
    return `mailto:${companyEmail}?subject=Comprobante%20de%20transferencia&body=${msg}`;
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private _setMeta(company: ICompanyBrand): void {
    setSocialMeta(this.titleSvc, this.metaSvc, {
      title:       `${company.name} · Reserva tu Hora Online | Agenda Citas | Lets Reserve`,
      description: `Reserva tu hora con ${company.name} online. Agenda citas, consulta horarios disponibles y reserva en un clic. Sistema de agendamiento online en Lets Reserve.`,
      image:       company.backgroundImage ?? 'https://letsreserve.cl/letsReserve.png',
      url:         `https://letsreserve.cl/empresa/${this.route.snapshot.paramMap.get('slug')}`,
    });
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

}
