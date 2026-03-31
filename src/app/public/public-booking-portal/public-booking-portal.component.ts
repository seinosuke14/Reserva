import { Component, signal, computed, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { trigger, style, animate, transition } from '@angular/animations';
import { Subscription } from 'rxjs';

import { MOCK_SERVICES, IService } from '../../data/mock-services';
import { MOCK_TIME_SLOTS } from '../../data/mock-time-slots';
import { formatCLP } from '../../helpers/formatters';
import { AuthService } from '../../core/services/auth.service';

type EmailCheckState = 'idle' | 'checking' | 'exists' | 'not-found';

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
  private readonly fb    = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  readonly auth          = inject(AuthService);
  readonly formatCLP     = formatCLP;

  // ─── Signals de estado del stepper ──────────────────────────────────────────
  readonly step            = signal<1 | 2 | 3>(1);
  readonly selectedService = signal<IService | null>(null);
  readonly selectedDate    = signal<Date>(this._tomorrow());
  readonly selectedHour    = signal<string | null>(null);
  readonly isSubmitting    = signal(false);
  readonly isBooked        = signal(false);
  readonly bookingRef      = signal('');
  readonly slug            = signal('');

  // ─── Email check ────────────────────────────────────────────────────────────
  readonly emailCheckState = signal<EmailCheckState>('idle');
  private emailDebounce: ReturnType<typeof setTimeout> | null = null;
  private sub: Subscription | null = null;

  // ─── Datos de la agenda ──────────────────────────────────────────────────────
  readonly activeServices = MOCK_SERVICES.filter(s => s.isActive);
  readonly availableSlots = MOCK_TIME_SLOTS.filter(s => !s.isOccupied);

  readonly days: Date[] = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    return d;
  });

  // ─── Computed ───────────────────────────────────────────────────────────────
  readonly isGuest        = computed(() => this.auth.currentRole() === 'guest');
  readonly showLoginHint  = computed(() => this.emailCheckState() === 'exists' && this.isGuest());
  readonly canGoToStep2   = computed(() => !!this.selectedService());
  readonly canGoToStep3   = computed(() => !!this.selectedHour());

  // ─── Form ───────────────────────────────────────────────────────────────────
  readonly form = this.fb.group({
    name:  ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', Validators.required],
    notes: [''],
  });

  get f() { return this.form.controls; }

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.slug.set(this.route.snapshot.paramMap.get('slug') ?? '');

    // Autocompletar datos si el usuario está logueado
    const user = this.auth.currentUser();
    if (user) {
      this.form.patchValue({ name: user.name, email: user.email, phone: user.phone ?? '' });
    }

    // Verificar email con debounce al escribir (solo para invitados)
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

  // ─── Acciones ───────────────────────────────────────────────────────────────

  selectService(service: IService): void {
    this.selectedService.set(service);
  }

  selectDate(date: Date): void {
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
    // TODO: conectar con POST /api/appointments
    await new Promise(r => setTimeout(r, 1500));
    this.isSubmitting.set(false);
    this.bookingRef.set('RES-' + Math.random().toString(36).substring(2, 8).toUpperCase());
    this.isBooked.set(true);
  }

  // ─── Helpers de formato ──────────────────────────────────────────────────────

  isSameDay(d1: Date, d2: Date): boolean {
    return d1.toDateString() === d2.toDateString();
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('es-ES', {
      weekday: 'long', day: 'numeric', month: 'long'
    }).format(date);
  }

  formatShortDay(date: Date): string {
    return date.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase();
  }

  formatMonth(date: Date): string {
    return date.toLocaleDateString('es-ES', { month: 'short' }).toUpperCase();
  }

  private _tomorrow(): Date {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d;
  }
}
