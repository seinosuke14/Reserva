import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MOCK_APPOINTMENTS } from '../../data/mock-appointments';
import { formatCLP } from '../../helpers/formatters';

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-home.component.html',
})
export class DashboardHomeComponent {
  readonly formatCLP = formatCLP;

  readonly today = new Date().toISOString().split('T')[0];

  readonly todayAppointments = MOCK_APPOINTMENTS.filter(a => a.date === this.today);

  readonly stats = {
    totalCitas: this.todayAppointments.length,
    ingresos:   this.todayAppointments.filter(a => a.paymentStatus === 'Pagado').reduce((s, a) => s + a.amount, 0),
    pendientes: this.todayAppointments.filter(a => a.paymentStatus === 'Pendiente').length,
  };
}