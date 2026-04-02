import { Component, signal, computed, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { trigger, style, animate, transition } from '@angular/animations';
import { firstValueFrom, Subscription } from 'rxjs';

import { formatCLP } from '../../helpers/formatters';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

export interface IPublicService {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
}

export interface ITimeSlot {
  time: string;
  available: boolean;
}

export interface IDayAvailability {
  date: string;
  slots: ITimeSlot[];
}

type EmailCheckState = 'idle' | 'checking' | 'exists' | 'not-found';
type LoadState = 'loading' | 'ready' | 'error';
type CalCellState = 'empty' | 'past' | 'unavailable' | 'available' | 'full';
type CalCell = { dateStr: string | null; day: number; state: CalCellState };

@Component({
  selector: 'app-public-booking-portal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './public-booking-portal.component.html',
  styleUrl: './public-booking-portal.component.scss',
  animations: [
    trigger('fadeSlide', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('300ms cubic-bezier(0.4,0,0.2,1)', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('180ms ease-in', style({ opacity: 0, transform: 'translateY(-8px)' }))
      ])
    ]),
    trigger('pulse', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.95)' }),
        animate('200ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))
      ])
    ])
  ]
})
export class PublicBookingPortalComponent implements OnInit, OnDestroy {
  private readonly fb     = inject(FormBuilder);
  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly http   = inject(HttpClient);
  readonly auth           = inject(AuthService);
  readonly formatCLP      = formatCLP;

  // ─── Perfil del profesional (cargado desde la API) ──────────────────────────
  readonly loadState    = signal<LoadState>('loading');
  readonly professional = signal<{ id: string; name: string; slug: string; specialty: string; phone: string } | null>(null);
  readonly services     = signal<IPublicService[]>([]);
  readonly availability = signal<IDayAvailability[]>([]);

  // ─── Stepper ────────────────────────────────────────────────────────────────
  readonly step            = signal<1 | 2 | 3>(1);
  readonly selectedService = signal<IPublicService | null>(null);
  readonly selectedDate    = signal<string>('');
  readonly selectedHour    = signal<string | null>(null);
  readonly isSubmitting    = signal(false);
  readonly isBooked        = signal(false);
  readonly bookingRef      = signal('');

  // ─── Email check ────────────────────────────────────────────────────────────
  readonly emailCheckState = signal<EmailCheckState>('idle');
  private emailDebounce: ReturnType<typeof setTimeout> | null = null;
  private sub: Subscription | null = null;

  // ─── Computed ───────────────────────────────────────────────────────────────
  readonly today         = new Date().toISOString().slice(0, 10);
  readonly isGuest       = computed(() => this.auth.currentRole() === 'guest');
  readonly showLoginHint = computed(() => this.emailCheckState() === 'exists' && this.isGuest());
  readonly canGoToStep2  = computed(() => !!this.selectedService());
  readonly canGoToStep3  = computed(() => !!this.selectedHour());

  /** Todos los slots del día seleccionado (disponibles y ocupados) */
  readonly daySlots = computed(() => {
    const day = this.availability().find(d => d.date === this.selectedDate());
    return day ? day.slots : [];
  });

  // ─── Calendario mensual ─────────────────────────────────────────────────────
  readonly calendarMonth = signal(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  readonly calendarMonthLabel = computed(() =>
    this.calendarMonth().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
  );

  readonly isPrevMonthDisabled = computed(() => {
    const now = new Date();
    const cm  = this.calendarMonth();
    return cm.getFullYear() === now.getFullYear() && cm.getMonth() === now.getMonth();
  });

  readonly calendarGrid = computed(() => {
    const first       = this.calendarMonth();
    const year        = first.getFullYear();
    const month       = first.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let   startDow    = first.getDay();
    startDow = startDow === 0 ? 6 : startDow - 1; // 0=Lun … 6=Dom

    const availMap = new Map(this.availability().map(d => [d.date, d]));
    const grid: CalCell[] = [];

    for (let i = 0; i < startDow; i++) grid.push({ dateStr: null, day: 0, state: 'empty' });

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      let state: CalCellState;
      if (dateStr < this.today) {
        state = 'past';
      } else {
        const avail = availMap.get(dateStr);
        if (!avail)                               state = 'unavailable';
        else if (avail.slots.some(s => s.available)) state = 'available';
        else                                      state = 'full';
      }
      grid.push({ dateStr, day: d, state });
    }

    while (grid.length % 7 !== 0) grid.push({ dateStr: null, day: 0, state: 'empty' });
    return grid;
  });

  prevCalMonth(): void {
    if (this.isPrevMonthDisabled()) return;
    const d = this.calendarMonth();
    this.calendarMonth.set(new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }

  nextCalMonth(): void {
    const d = this.calendarMonth();
    this.calendarMonth.set(new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }

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

    // Autocompletar si está logueado
    const user = this.auth.currentUser();
    if (user) {
      this.form.patchValue({ name: user.name, email: user.email, phone: user.phone ?? '' });
    }

    // Verificar email con debounce (solo invitados)
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
      // Preseleccionar el primer día disponible
      if (data.availability.length > 0) {
        this.selectedDate.set(data.availability[0].date);
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
  }

  selectDate(date: string): void {
    this.selectedDate.set(date);
    this.selectedHour.set(null);
  }

  selectHour(time: string): void {
    this.selectedHour.set(time);
  }

  goTo(step: 1 | 2 | 3): void {
    this.step.set(step);
  }

  async confirmBooking(): Promise<void> {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
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
        })
      );

      // Redirigir a Webpay para que el cliente pague
      if (res.url && res.token) {
        window.location.href = res.url;
      } else {
        // Fallback si no viene URL (no debería pasar)
        this.bookingRef.set(res.bookingRef);
        this.isBooked.set(true);
      }
    } catch (err: any) {
      alert(err?.error?.message ?? 'No se pudo confirmar la reserva. Intenta de nuevo.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  // ─── Helpers de formato ──────────────────────────────────────────────────────

  formatDate(dateStr: string): string {
    return new Intl.DateTimeFormat('es-ES', {
      weekday: 'long', day: 'numeric', month: 'long'
    }).format(new Date(dateStr + 'T12:00:00'));
  }

  formatShortDay(dateStr: string): string {
    return new Intl.DateTimeFormat('es-ES', { weekday: 'short' })
      .format(new Date(dateStr + 'T12:00:00'))
      .toUpperCase();
  }

  formatDayNumber(dateStr: string): number {
    return new Date(dateStr + 'T12:00:00').getDate();
  }

  formatMonth(dateStr: string): string {
    return new Intl.DateTimeFormat('es-ES', { month: 'short' })
      .format(new Date(dateStr + 'T12:00:00'))
      .toUpperCase();
  }
}
