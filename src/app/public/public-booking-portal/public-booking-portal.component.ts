import { Component, signal, computed, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, Subscription } from 'rxjs';

import { BookingStepIndicatorComponent } from '../components/booking-step-indicator/booking-step-indicator.component';
import { BookingDatetimeSelectorComponent } from '../components/booking-datetime-selector/booking-datetime-selector.component';
import { BookingFormComponent } from '../components/booking-form/booking-form.component';
import { BookingActionsComponent } from '../components/booking-actions/booking-actions.component';
import { BookingFooterComponent } from '../components/booking-footer/booking-footer.component';

import { formatCLP, formatDateLong } from '../../helpers/formatters';
import { IPublicService, IDayAvailability, IPublicPaymentMethod } from '../../helpers/models';
import { AuthService } from '../../core/services/auth.service';
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
    BookingFooterComponent
  ],
  templateUrl: './public-booking-portal.component.html',
  styleUrl: './public-booking-portal.component.scss'
})
export class PublicBookingPortalComponent implements OnInit, OnDestroy {
  private readonly fb     = inject(FormBuilder);
  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly http   = inject(HttpClient);
  readonly auth           = inject(AuthService);
  readonly formatCLP      = formatCLP;
  readonly formatDate     = formatDateLong;

  // ─── Perfil del profesional ─────────────────────────────────────────────────
  readonly loadState    = signal<LoadState>('loading');
  readonly professional = signal<{ id: string; name: string; slug: string; specialty: string; phone: string; description?: string; ratingAvg?: number; ratingCount?: number } | null>(null);

  readonly stars = [1, 2, 3, 4, 5];
  readonly services     = signal<IPublicService[]>([]);
  readonly availability = signal<IDayAvailability[]>([]);
  readonly paymentMethods = signal<IPublicPaymentMethod[]>([]);

  // ─── Modo de vista ──────────────────────────────────────────────────────────
  readonly viewMode        = signal<'profile' | 'checkout'>('profile');

  // ─── Stepper (3 pasos en checkout: Fecha, Datos, Pago) ─────────────────────
  readonly step            = signal<1 | 2 | 3>(1);
  readonly selectedService = signal<IPublicService | null>(null);
  readonly selectedDate    = signal<string>('');
  readonly selectedHour    = signal<string | null>(null);
  readonly selectedPayment = signal<IPublicPaymentMethod | null>(null);
  readonly isSubmitting    = signal(false);
  readonly isBooked        = signal(false);
  readonly bookingRef      = signal('');

  // ─── Email check ────────────────────────────────────────────────────────────
  readonly emailCheckState = signal<EmailCheckState>('idle');
  private emailDebounce: ReturnType<typeof setTimeout> | null = null;
  private sub: Subscription | null = null;

  // ─── Computed ───────────────────────────────────────────────────────────────
  readonly isGuest       = computed(() => this.auth.currentRole() === 'guest');
  readonly showLoginHint = computed(() => this.emailCheckState() === 'exists' && this.isGuest());

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
    name:  ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', Validators.required],
    notes: [''],
  });

  get f() { return this.form.controls; }

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  async ngOnInit(): Promise<void> {
    const slug = this.route.snapshot.paramMap.get('slug') ?? '';
    await this._loadProfile(slug);

    const user = this.auth.currentUser();
    if (user) {
      this.form.patchValue({ name: user.name, email: user.email, phone: user.phone ?? '' });
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
      this.professional.set(data.professional);
      this.services.set(data.services);
      this.availability.set(data.availability);
      this.paymentMethods.set(data.paymentMethods ?? []);

      if (data.availability.length > 0) {
        this.selectedDate.set(data.availability[0].date);
      }
      // Si solo hay un método de pago, preseleccionarlo
      if (data.paymentMethods?.length === 1) {
        this.selectedPayment.set(data.paymentMethods[0]);
      }
      this.loadState.set('ready');
    } catch (err: any) {
      if (err?.status === 404) {
        this.router.navigate(['/']);
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
    if (this.step() === 2) return this.form.valid;
    if (this.step() === 3) return !!this.selectedPayment();
    return false;
  });

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
      const res: any = await firstValueFrom(
        this.http.post(`${environment.apiUrl}/public/book`, {
          slug:      this.professional()?.slug,
          serviceId: this.selectedService()!.id,
          date:      this.selectedDate(),
          time:      this.selectedHour(),
          name, email, phone, notes,
          paymentProvider: provider,
        })
      );

      if (provider === 'transfer') {
        this.bookingRef.set(res.bookingRef ?? '');
        this.isBooked.set(true);
      } else if (res.url && res.token) {
        window.location.href = res.url;
      } else {
        this.bookingRef.set(res.bookingRef);
        this.isBooked.set(true);
      }
    } catch (err: any) {
      alert(err?.error?.message ?? 'No se pudo confirmar la reserva. Intenta de nuevo.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

}
