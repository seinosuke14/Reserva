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
  status: 'paid' | 'pending';
  service: string;
}

interface IAppointment {
  id: string;
  date: string;   // 'YYYY-MM-DD'
  time: string;   // 'HH:mm'
  paymentStatus: 'Pagado' | 'Pendiente' | 'Cancelado';
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
  standalone: true,
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
  readonly formatCLP    = formatCLP;

  readonly today = new Date().toISOString().slice(0, 10);

  customers        = signal<ICustomer[]>([]);
  searchTerm       = signal('');
  selectedCustomer = signal<ICustomer | null>(null);
  isLoading        = signal(true);
  errorMsg         = signal<string | null>(null);

  readonly filteredCustomers = computed(() => {
    const term = this.searchTerm().toLowerCase();
    if (!term) return this.customers();
    return this.customers().filter(c =>
      c.name.toLowerCase().includes(term) ||
      (c.email ?? '').toLowerCase().includes(term)
    );
  });

  /** Devuelve la próxima cita futura (o la más reciente si no hay futuras) */
  nextAppointment(customer: ICustomer): IAppointment | null {
    const active = customer.appointments?.filter(a => a.paymentStatus !== 'Cancelado') ?? [];
    if (!active.length) return null;
    const today = new Date().toISOString().slice(0, 10);
    const future = active.filter(a => a.date >= today);
    return future.length ? future[0] : active[active.length - 1];
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
