import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { trigger, style, animate, transition } from '@angular/animations';
import { firstValueFrom } from 'rxjs';
import { formatCLP } from '../../helpers/formatters';
import { environment } from '../../../environments/environment';

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
  date: string;   // 'YYYY-MM-DD'
  time: string;   // 'HH:mm'
  paymentStatus: 'Pagado' | 'Pendiente' | 'Cancelado';
  notes: string | null;
  service: { id: string; name: string } | null;
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
export class CustomerDirectoryComponent implements OnInit {
  private readonly http = inject(HttpClient);
  readonly formatCLP = formatCLP;
  readonly toNumber = Number;

  readonly today = new Date().toISOString().slice(0, 10);

  customers = signal<ICustomer[]>([]);
  searchTerm = signal('');
  statusFilter = signal<'todos' | 'paid' | 'debt'>('todos');
  sortBy = signal<'name' | 'sessions' | 'debt'>('name');
  selectedCustomer = signal<ICustomer | null>(null);
  isLoading = signal(true);
  errorMsg = signal<string | null>(null);
  showHistory = signal(false);
  showPayments = signal(false);
  historyFrom = signal<string>('');
  historyTo = signal<string>('');

  openCustomer(customer: ICustomer): void {
    this.selectedCustomer.set(customer);
    this.showHistory.set(false);
    this.showPayments.set(false);
    this.historyFrom.set('');
    this.historyTo.set('');
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
    const term = this.searchTerm().toLowerCase();
    const filter = this.statusFilter();
    const sort = this.sortBy();

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

  recentAppointments(customer: ICustomer, limit = 5): IAppointment[] {
    return [...(customer.appointments ?? [])]
      .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
      .slice(0, limit);
  }

  /** Devuelve la próxima cita futura (o la más reciente si no hay futuras) */
  nextAppointment(customer: ICustomer): IAppointment | null {
    const active = customer.appointments?.filter(a => a.paymentStatus !== 'Cancelado') ?? [];
    if (!active.length) return null;
    const today = new Date().toISOString().slice(0, 10);
    const future = active.filter(a => a.date >= today);
    return future.length ? future[0] : active[active.length - 1];
  }

  hasAnyNotes(customer: ICustomer): boolean {
    return customer.appointments?.some(a => !!a.notes) ?? false;
  }

  /** Notas ordenadas por fecha desc, solo las más recientes (máx 2) */
  recentNotes(customer: ICustomer, limit = 2): IAppointment[] {
    return (customer.appointments ?? [])
      .filter(a => !!a.notes)
      .slice()
      .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
      .slice(0, limit);
  }

  /** Citas pasadas (anteriores a hoy) ordenadas de la más reciente a la más antigua */
  pastAppointments(customer: ICustomer): IAppointment[] {
    return (customer.appointments ?? [])
      .filter(a => a.date < this.today && a.paymentStatus !== 'Cancelado')
      .slice()
      .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  }

  /**
   * Pagos con estado efectivo (cruzando con la cita asociada) y ordenados:
   * sin confirmar → aprobados → cancelados, por fecha desc dentro de cada grupo.
   * Una cita cancelada deja su PaymentHistory en 'pending', así que se reclasifica como 'cancelled'.
   */
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

  /** Citas pasadas filtradas por rango de fechas */
  filteredPastAppointments(customer: ICustomer): IAppointment[] {
    const from = this.historyFrom();
    const to = this.historyTo();
    return this.pastAppointments(customer).filter(a => {
      if (from && a.date < from) return false;
      if (to && a.date > to) return false;
      return true;
    });
  }

  /** Citas de hoy o futuras */
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
    try {
      const data = await firstValueFrom(
        this.http.get<ICustomer[]>(`${environment.apiUrl}/customers`)
      );
      this.customers.set(data);
    } catch {
      this.errorMsg.set('No se pudieron cargar los clientes.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async updateAppointmentStatus(appointmentId: string, newStatus: 'Pagado' | 'Cancelado'): Promise<void> {
    try {
      await firstValueFrom(
        this.http.patch(`${environment.apiUrl}/appointments/${appointmentId}/status`, { paymentStatus: newStatus })
      );

      // Recargar clientes para reflejar cambios
      const data = await firstValueFrom(
        this.http.get<ICustomer[]>(`${environment.apiUrl}/customers`)
      );
      this.customers.set(data);

      // Actualizar el cliente seleccionado con los datos nuevos
      const currentSelected = this.selectedCustomer();
      if (currentSelected) {
        const updatedCustomer = data.find(c => c.id === currentSelected.id);
        if (updatedCustomer) {
          this.selectedCustomer.set(updatedCustomer);
        }
      }
    } catch (err: any) {
      this.errorMsg.set('Error al actualizar el estado de la cita.');
    }
  }
}
