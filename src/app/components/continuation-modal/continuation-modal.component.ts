import { Component, inject, input, output, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { trigger, style, animate, transition } from '@angular/animations';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { formatCLP, withVat } from '../../helpers/formatters';
import { IService } from '../../helpers/models';
import { WorkScheduleService, jsToDow } from '../../core/services/work-schedule.service';

/** Cita de evaluación desde la que se agenda la continuación. */
export interface IEvaluationAppointment {
  id: string;
  customerName: string;
  date?: string;
}

interface IPaymentMethodLite {
  provider: string;
  isActive: boolean;
}

type BookingMode = 'online' | 'presencial' | 'transfer';

const ONLINE_PROVIDERS = ['webpay', 'mercadopago', 'flow', 'khipu', 'mercadopago_connect'];

const PROVIDER_LABELS: Record<string, string> = {
  webpay:              'Webpay',
  mercadopago:         'MercadoPago',
  flow:                'Flow',
  khipu:               'Khipu',
  mercadopago_connect: 'MercadoPago (botón de pago)',
};

@Component({
  selector: 'app-continuation-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './continuation-modal.component.html',
  styleUrls: ['./continuation-modal.component.scss'],
  animations: [
    trigger('backdrop', [
      transition(':enter', [style({ opacity: 0 }), animate('200ms', style({ opacity: 1 }))]),
      transition(':leave', [animate('150ms', style({ opacity: 0 }))]),
    ]),
    trigger('cardAnim', [
      transition(':enter', [style({ opacity: 0, transform: 'scale(0.95) translateY(10px)' }), animate('200ms ease-out', style({ opacity: 1, transform: 'scale(1) translateY(0)' }))]),
      transition(':leave', [animate('150ms ease-in', style({ opacity: 0, transform: 'scale(0.95)' }))]),
    ]),
  ],
})
export class ContinuationModalComponent implements OnInit {
  private readonly http    = inject(HttpClient);
  private readonly workSvc = inject(WorkScheduleService);

  readonly appointment = input.required<IEvaluationAppointment>();
  readonly close = output<void>();
  readonly saved = output<void>();

  readonly formatCLP = formatCLP;
  readonly withVat   = withVat;

  providerLabel(provider: string): string {
    return PROVIDER_LABELS[provider] ?? provider;
  }

  readonly loading  = signal(true);
  readonly saving   = signal(false);
  readonly error    = signal('');

  private readonly allServices    = signal<IService[]>([]);
  private readonly paymentMethods = signal<IPaymentMethodLite[]>([]);

  // Solo servicios reales activos (excluye los de categoría de cotización).
  readonly services = computed(() =>
    this.allServices().filter(s => s.isActive && !s.category?.isQuoteCategory)
  );

  readonly serviceId = signal('');
  readonly date      = signal('');
  readonly time      = signal('');
  readonly amount    = signal<number>(0);
  readonly bookingMode      = signal<BookingMode>('presencial');
  readonly paymentProvider  = signal('');

  readonly todayStr = this._toDateStr(new Date());

  // Modalidades disponibles según los métodos de pago activos del profesional.
  readonly onlineProviders = computed(() =>
    this.paymentMethods()
      .filter(m => m.isActive && ONLINE_PROVIDERS.includes(m.provider))
      .map(m => m.provider)
  );
  readonly hasOnline     = computed(() => this.onlineProviders().length > 0);
  readonly hasPresencial = computed(() => this.paymentMethods().some(m => m.isActive && m.provider === 'presencial'));
  readonly hasTransfer   = computed(() => this.paymentMethods().some(m => m.isActive && m.provider === 'transfer'));

  readonly noMethods = computed(() => !this.hasOnline() && !this.hasPresencial() && !this.hasTransfer());

  // Slots del día seleccionado según el horario laboral configurado.
  readonly availableSlots = computed(() => {
    const dateStr = this.date();
    if (!dateStr || dateStr < this.todayStr) return [];
    const d   = new Date(dateStr + 'T00:00:00');
    const dow = jsToDow(d.getDay());
    return this.workSvc.generateSlots(dow);
  });

  async ngOnInit(): Promise<void> {
    await Promise.all([this._loadServices(), this._loadPaymentMethods(), this.workSvc.load()]);
    // Preseleccionar modalidad disponible (prioriza presencial por ser el caso típico).
    if (this.hasPresencial())      this.bookingMode.set('presencial');
    else if (this.hasTransfer())   this.bookingMode.set('transfer');
    else if (this.hasOnline())     { this.bookingMode.set('online'); this.paymentProvider.set(this.onlineProviders()[0]); }
    this.loading.set(false);
  }

  private async _loadServices(): Promise<void> {
    try {
      const data = await firstValueFrom(this.http.get<IService[]>(`${environment.apiUrl}/services`));
      this.allServices.set(data);
    } catch { /* lista vacía */ }
  }

  private async _loadPaymentMethods(): Promise<void> {
    try {
      const data = await firstValueFrom(this.http.get<IPaymentMethodLite[]>(`${environment.apiUrl}/payment-methods`));
      this.paymentMethods.set(data);
    } catch { /* sin métodos */ }
  }

  onServiceChange(id: string): void {
    this.serviceId.set(id);
    const svc = this.services().find(s => s.id === id);
    if (svc) this.amount.set(Math.round(Number(svc.price)));
    // La hora puede haber cambiado de validez si cambia la duración; se re-elige.
    this.time.set('');
  }

  selectMode(mode: BookingMode): void {
    this.bookingMode.set(mode);
    if (mode === 'online' && !this.paymentProvider()) {
      this.paymentProvider.set(this.onlineProviders()[0] ?? '');
    }
  }

  get netAmount(): number { return Math.round(Number(this.amount()) || 0); }

  async submit(): Promise<void> {
    if (this.saving()) return;
    if (!this.serviceId() || !this.date() || !this.time() || this.netAmount <= 0) {
      this.error.set('Completa servicio, fecha, hora y un precio válido.');
      return;
    }
    if (this.bookingMode() === 'online' && !this.paymentProvider()) {
      this.error.set('Selecciona el medio de pago online.');
      return;
    }

    this.saving.set(true);
    this.error.set('');
    try {
      await firstValueFrom(
        this.http.post(`${environment.apiUrl}/appointments/${this.appointment().id}/continue`, {
          serviceId:       this.serviceId(),
          date:            this.date(),
          time:            this.time(),
          amount:          this.netAmount,
          bookingMode:     this.bookingMode(),
          paymentProvider: this.bookingMode() === 'online' ? this.paymentProvider() : undefined,
        })
      );
      this.saved.emit();
    } catch (err: any) {
      this.error.set(err?.error?.message ?? 'No se pudo agendar la continuación.');
    } finally {
      this.saving.set(false);
    }
  }

  private _toDateStr(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
