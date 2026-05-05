import { Component, signal, computed, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { trigger, style, animate, transition } from '@angular/animations';
import { firstValueFrom } from 'rxjs';
import { formatCLP } from '../../helpers/formatters';
import { environment } from '../../../environments/environment';
import { WorkScheduleService, jsToDow } from '../../core/services/work-schedule.service';
import { ScheduleBlockService } from '../../core/services/schedule-block.service';

interface IPaymentHistory {
  id: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending' | 'cancelled';
  service: string;
  appointmentId?: string | null;
}

type EffectiveStatus = 'paid' | 'pending' | 'cancelled';

interface IPaymentRow extends IPaymentHistory {
  effectiveStatus: EffectiveStatus;
}

interface IAppointment {
  id: string;
  date: string;
  time: string;
  paymentStatus: 'Pagado' | 'Pendiente' | 'Cancelado';
  notes: string | null;
  service: { id: string; name: string; duration?: number } | null;
}

interface ICustomer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  lastAppointment: string | null;
  status: 'paid' | 'debt';
  debtAmount?: number;
  notes: string;
  paymentHistory: IPaymentHistory[];
  appointments: IAppointment[];
}

interface IService {
  id: string;
  name: string;
  duration: number;
  price: number;
}

interface IAllAppointment {
  id: string;
  date: string;
  time: string;
  paymentStatus: 'Pagado' | 'Pendiente' | 'Cancelado';
  service: { id: string; name: string; duration?: number };
}

@Component({
  selector: 'app-customer-directory',
  imports: [CommonModule, FormsModule],
  templateUrl: './customer-directory.component.html',
  animations: [
    trigger('slidePanel', [
      transition(':enter', [style({ transform: 'translateX(100%)' }), animate('250ms ease-out', style({ transform: 'translateX(0)' }))]),
      transition(':leave', [animate('200ms ease-in', style({ transform: 'translateX(100%)' }))])
    ]),
    trigger('backdrop', [
      transition(':enter', [style({ opacity: 0 }), animate('200ms', style({ opacity: 1 }))]),
      transition(':leave', [animate('150ms', style({ opacity: 0 }))])
    ])
  ]
})
export class CustomerDirectoryComponent implements OnInit, OnDestroy {
  private readonly http     = inject(HttpClient);
  private readonly workSvc  = inject(WorkScheduleService);
  private readonly blockSvc = inject(ScheduleBlockService);
  readonly formatCLP = formatCLP;
  readonly toNumber  = Number;

  readonly today = new Date().toISOString().slice(0, 10);

  customers        = signal<ICustomer[]>([]);
  searchTerm       = signal('');
  statusFilter     = signal<'todos' | 'paid' | 'debt'>('todos');
  sortBy           = signal<'name' | 'sessions' | 'debt'>('name');
  selectedCustomer = signal<ICustomer | null>(null);
  isLoading        = signal(true);
  errorMsg         = signal<string | null>(null);
  showHistory      = signal(false);
  showPayments     = signal(false);
  historyFrom      = signal<string>('');
  historyTo        = signal<string>('');
  aptTab           = signal<'recientes' | 'todas'>('recientes');

  isMobile = signal(window.innerWidth < 768);
  private readonly _resizeListener = () => this.isMobile.set(window.innerWidth < 768);

  // ── Modal Agendar ─────────────────────────────────────────────
  private readonly services        = signal<IService[]>([]);
  private readonly allAppointments = signal<IAllAppointment[]>([]);

  readonly showBookingModal = signal(false);
  readonly bk_serviceId    = signal('');
  readonly bk_date         = signal('');
  readonly bk_time         = signal('');
  readonly bk_notes        = signal('');
  readonly bk_status       = signal<'Pendiente' | 'Pagado'>('Pendiente');
  readonly bk_error        = signal('');
  readonly bk_submitting   = signal(false);

  readonly bk_services = this.services.asReadonly();

  readonly bk_availableSlots = computed(() => {
    const dateStr = this.bk_date();
    if (!dateStr) return [];

    const date     = new Date(dateStr + 'T00:00:00');
    const dow      = jsToDow(date.getDay());
    const allSlots = this.workSvc.generateSlots(dow);
    const slotDur  = this.workSvc.getSlotDuration(dow);

    // Slots ocupados por citas existentes (inicio + continuaciones)
    const dayAppts = this.allAppointments().filter(
      a => a.date === dateStr && a.paymentStatus !== 'Cancelado'
    );
    const occupied = new Set<string>();
    for (const apt of dayAppts) {
      const blocks = Math.ceil((apt.service?.duration ?? slotDur) / slotDur);
      const [h, m] = apt.time.split(':').map(Number);
      let cursor   = h * 60 + m;
      for (let b = 0; b < blocks; b++) {
        occupied.add(
          `${String(Math.floor(cursor / 60) % 24).padStart(2, '0')}:${String(cursor % 60).padStart(2, '0')}`
        );
        cursor += slotDur;
      }
    }

    // Bloques que necesita el servicio seleccionado
    const newService = this.services().find(s => s.id === this.bk_serviceId());
    const newBlocks  = Math.ceil((newService?.duration ?? slotDur) / slotDur);

    const isToday    = dateStr === this.today;
    const nowMinutes = isToday ? new Date().getHours() * 60 + new Date().getMinutes() : -1;

    return allSlots.filter(slot => {
      const [h, m] = slot.split(':').map(Number);
      if (isToday && h * 60 + m <= nowMinutes) return false;
      if (occupied.has(slot) || this.blockSvc.isBlocked(date, slot)) return false;
      let cursor = h * 60 + m + slotDur;
      for (let b = 1; b < newBlocks; b++) {
        const cont = `${String(Math.floor(cursor / 60) % 24).padStart(2, '0')}:${String(cursor % 60).padStart(2, '0')}`;
        if (occupied.has(cont) || this.blockSvc.isBlocked(date, cont)) return false;
        cursor += slotDur;
      }
      return true;
    });
  });
  // ─────────────────────────────────────────────────────────────

  openCustomer(customer: ICustomer): void {
    this.selectedCustomer.set(customer);
    this.showHistory.set(false);
    this.showPayments.set(false);
    this.historyFrom.set('');
    this.historyTo.set('');
    this.aptTab.set('recientes');
  }

  closeCustomer(): void {
    this.selectedCustomer.set(null);
    this.showHistory.set(false);
    this.showPayments.set(false);
    this.historyFrom.set('');
    this.historyTo.set('');
  }

  clearHistoryFilters(): void {
    this.historyFrom.set('');
    this.historyTo.set('');
  }

  readonly filteredCustomers = computed(() => {
    const term   = this.searchTerm().toLowerCase();
    const filter = this.statusFilter();
    const sort   = this.sortBy();

    let result = this.customers().filter(c => {
      if (filter !== 'todos' && c.status !== filter) return false;
      if (!term) return true;
      return c.name.toLowerCase().includes(term) || (c.email ?? '').toLowerCase().includes(term);
    });

    if (sort === 'name') {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === 'sessions') {
      result = [...result].sort((a, b) => (b.appointments?.length ?? 0) - (a.appointments?.length ?? 0));
    } else if (sort === 'debt') {
      result = [...result].sort((a, b) => Number(b.debtAmount ?? 0) - Number(a.debtAmount ?? 0));
    }

    return result;
  });

  totalPaid(customer: ICustomer): number {
    return (customer.paymentHistory ?? [])
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + Number(p.amount), 0);
  }

  private _sortByStatus(appointments: IAppointment[]): IAppointment[] {
    const priority: Record<string, number> = { Pendiente: 0, Pagado: 1, Cancelado: 2 };
    return [...appointments].sort((a, b) => {
      const diff = (priority[a.paymentStatus] ?? 3) - (priority[b.paymentStatus] ?? 3);
      return diff !== 0 ? diff : (b.date + b.time).localeCompare(a.date + a.time);
    });
  }

  recentAppointments(customer: ICustomer, limit = 5): IAppointment[] {
    return this._sortByStatus(customer.appointments ?? []).slice(0, limit);
  }

  allAppointmentsSorted(customer: ICustomer): IAppointment[] {
    return this._sortByStatus(customer.appointments ?? []);
  }

  nextAppointment(customer: ICustomer): IAppointment | null {
    const active = customer.appointments?.filter(a => a.paymentStatus !== 'Cancelado') ?? [];
    if (!active.length) return null;
    const today  = new Date().toISOString().slice(0, 10);
    const future = active.filter(a => a.date >= today);
    return future.length ? future[0] : active[active.length - 1];
  }

  hasAnyNotes(customer: ICustomer): boolean {
    return customer.appointments?.some(a => !!a.notes) ?? false;
  }

  recentNotes(customer: ICustomer, limit = 2): IAppointment[] {
    return (customer.appointments ?? [])
      .filter(a => !!a.notes)
      .slice()
      .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
      .slice(0, limit);
  }

  pastAppointments(customer: ICustomer): IAppointment[] {
    return (customer.appointments ?? [])
      .filter(a => a.date < this.today && a.paymentStatus !== 'Cancelado')
      .slice()
      .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  }

  sortedPaymentHistory(customer: ICustomer): IPaymentRow[] {
    const apptById = new Map<string, IAppointment>();
    for (const a of customer.appointments ?? []) apptById.set(a.id, a);

    const priority: Record<EffectiveStatus, number> = { pending: 0, paid: 1, cancelled: 2 };

    return (customer.paymentHistory ?? [])
      .map<IPaymentRow>(p => {
        let effective: EffectiveStatus = p.status;
        if (p.status === 'pending' && p.appointmentId) {
          const linked = apptById.get(p.appointmentId);
          if (linked?.paymentStatus === 'Cancelado') effective = 'cancelled';
          else if (linked?.paymentStatus === 'Pagado') effective = 'paid';
        }
        return { ...p, effectiveStatus: effective };
      })
      .sort((a, b) => {
        const diff = priority[a.effectiveStatus] - priority[b.effectiveStatus];
        return diff !== 0 ? diff : b.date.localeCompare(a.date);
      });
  }

  filteredPastAppointments(customer: ICustomer): IAppointment[] {
    const from = this.historyFrom();
    const to   = this.historyTo();
    return this.pastAppointments(customer).filter(a => {
      if (from && a.date < from) return false;
      if (to   && a.date > to)   return false;
      return true;
    });
  }

  upcomingAppointments(customer: ICustomer): IAppointment[] {
    return (customer.appointments ?? [])
      .filter(a => a.date >= this.today && a.paymentStatus !== 'Cancelado')
      .slice()
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  }

  formatAppointment(appt: IAppointment): string {
    const [y, m, d] = appt.date.split('-');
    return `${d}/${m}/${y} ${appt.time}`;
  }

  async ngOnInit(): Promise<void> {
    window.addEventListener('resize', this._resizeListener);
    try {
      const [customers, services] = await Promise.all([
        firstValueFrom(this.http.get<ICustomer[]>(`${environment.apiUrl}/customers`)),
        firstValueFrom(this.http.get<IService[]>(`${environment.apiUrl}/services`)),
        this.blockSvc.load(),
        this.workSvc.load(),
      ]);
      this.customers.set(customers);
      this.services.set(services);
    } catch {
      this.errorMsg.set('No se pudieron cargar los clientes.');
    } finally {
      this.isLoading.set(false);
    }
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this._resizeListener);
  }

  async updateAppointmentStatus(appointmentId: string, newStatus: 'Pagado' | 'Cancelado'): Promise<void> {
    try {
      await firstValueFrom(
        this.http.patch(`${environment.apiUrl}/appointments/${appointmentId}/status`, { paymentStatus: newStatus })
      );
      const currentSelected = this.selectedCustomer();
      if (currentSelected) {
        const updated = await firstValueFrom(
          this.http.get<ICustomer>(`${environment.apiUrl}/customers/${currentSelected.id}`)
        );
        this.selectedCustomer.set(updated);
        this.customers.update(list => list.map(c => c.id === updated.id ? updated : c));
      }
    } catch {
      this.errorMsg.set('Error al actualizar el estado de la cita.');
    }
  }

  // ── Modal Agendar: métodos ────────────────────────────────────

  async openBookingModal(): Promise<void> {
    // Cargar citas actuales para verificar conflictos
    try {
      const appts = await firstValueFrom(
        this.http.get<IAllAppointment[]>(`${environment.apiUrl}/appointments`)
      );
      this.allAppointments.set(appts);
    } catch { }

    this.bk_date.set(this.today);
    this.bk_serviceId.set(this.services()[0]?.id ?? '');
    this.bk_time.set('');
    this.bk_notes.set('');
    this.bk_status.set('Pendiente');
    this.bk_error.set('');
    this.showBookingModal.set(true);
  }

  closeBookingModal(): void {
    this.showBookingModal.set(false);
  }

  onBkServiceChange(id: string): void {
    this.bk_serviceId.set(id);
    if (!this.bk_availableSlots().includes(this.bk_time())) {
      this.bk_time.set('');
    }
  }

  onBkDateChange(value: string): void {
    this.bk_date.set(value);
    const date  = new Date(value + 'T00:00:00');
    const slots = this.workSvc.generateSlots(jsToDow(date.getDay()));
    if (!slots.includes(this.bk_time())) {
      this.bk_time.set('');
    }
  }

  async submitBooking(): Promise<void> {
    const customer = this.selectedCustomer();
    if (!customer) return;

    if (!this.bk_serviceId() || !this.bk_date() || !this.bk_time()) {
      this.bk_error.set('Completa los campos requeridos (servicio, fecha y hora).');
      return;
    }

    this.bk_submitting.set(true);
    this.bk_error.set('');

    try {
      const service = this.services().find(s => s.id === this.bk_serviceId());

      await firstValueFrom(
        this.http.post(`${environment.apiUrl}/appointments`, {
          date:          this.bk_date(),
          time:          this.bk_time(),
          amount:        Math.round(Number(service?.price ?? 0)),
          customerId:    customer.id,
          serviceId:     this.bk_serviceId(),
          paymentStatus: this.bk_status(),
          notes:         this.bk_notes().trim() || undefined,
        })
      );

      // Recargar el cliente por ID para tener sus citas actualizadas
      const updated = await firstValueFrom(
        this.http.get<ICustomer>(`${environment.apiUrl}/customers/${customer.id}`)
      );
      this.selectedCustomer.set(updated);
      this.customers.update(list => list.map(c => c.id === updated.id ? updated : c));

      this.showBookingModal.set(false);
    } catch (err: any) {
      this.bk_error.set(err?.error?.message ?? 'Error al crear la cita. Intenta de nuevo.');
    } finally {
      this.bk_submitting.set(false);
    }
  }
}
