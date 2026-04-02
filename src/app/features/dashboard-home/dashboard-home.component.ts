import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { formatCLP } from '../../helpers/formatters';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';

interface IAppointment {
  id: string;
  date: string;
  time: string;
  amount: number;
  paymentStatus: 'Pagado' | 'Pendiente' | 'Cancelado';
  customer: { id: string; name: string };
  service:  { id: string; name: string };
}

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-home.component.html',
})
export class DashboardHomeComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  readonly formatCLP    = formatCLP;
  readonly today        = new Date().toISOString().split('T')[0];

  todayAppointments = signal<IAppointment[]>([]);
  isLoading         = signal(true);
  copied            = signal(false);

  readonly bookingUrl = computed(() => {
    const slug = (this.auth.currentUser() as any)?.slug;
    return slug ? `${window.location.origin}/reservar/${slug}` : null;
  });

  async copyUrl(): Promise<void> {
    const url = this.bookingUrl();
    if (!url) return;
    await navigator.clipboard.writeText(url);
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2500);
  }

  readonly stats = computed(() => {
    const appts = this.todayAppointments();
    return {
      totalCitas:  appts.length,
      ingresos:    appts.filter(a => a.paymentStatus === 'Pagado').reduce((s, a) => s + +a.amount, 0),
      pendientes:  appts.filter(a => a.paymentStatus === 'Pendiente').length,
    };
  });

  async ngOnInit(): Promise<void> {
    try {
      const data = await firstValueFrom(
        this.http.get<IAppointment[]>(`${environment.apiUrl}/appointments`, {
          params: { date: this.today },
        })
      );
      this.todayAppointments.set(data);
    } finally {
      this.isLoading.set(false);
    }
  }
}
