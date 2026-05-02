import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { trigger, style, animate, transition } from '@angular/animations';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ScheduleBlockService } from '../../core/services/schedule-block.service';
import { WorkScheduleService, jsToDow } from '../../core/services/work-schedule.service';
import { environment } from '../../../environments/environment';

interface IAppointment {
  id: string;
  date: string;
  time: string;
  notes: string | null;
  paymentStatus: 'Pagado' | 'Pendiente' | 'Cancelado';
  customer: { id: string; name: string; email?: string };
  service:  { id: string; name: string; duration?: number };
}


@Component({
  selector: 'app-booking-calendar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './booking-calendar.component.html',
  animations: [
    trigger('fadeSlide', [
      transition(':enter', [style({ opacity: 0, transform: 'translateY(20px)' }), animate('200ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))]),
      transition(':leave', [animate('150ms ease-in', style({ opacity: 0, transform: 'translateY(20px)' }))])
    ]),
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
export class BookingCalendarComponent implements OnInit {
  private readonly router    = inject(Router);
  private readonly http      = inject(HttpClient);
  private readonly auth      = inject(AuthService);
  private readonly blockSvc  = inject(ScheduleBlockService);
  private readonly workSvc   = inject(WorkScheduleService);

  readonly selectedDate        = signal<Date>(new Date());
  readonly selectedHour        = signal<string | null>(null);
  readonly isBlockingMode      = signal(false);
  readonly isLoading           = signal(true);
  readonly selectedAppointment = signal<IAppointment | null>(null);

  private appointments = signal<IAppointment[]>([]);

  readonly isProfessional = computed(() => {
    const role = this.auth.currentUser()?.role;
    return role === 'professional' || role === 'admin';
  });

  readonly currentMonth = signal(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  readonly monthLabel = computed(() =>
    this.currentMonth().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
  );

  readonly calendarGrid = computed(() => {
    const first = this.currentMonth();
    const year  = first.getFullYear();
    const month = first.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let startDow = first.getDay();
    startDow = startDow === 0 ? 6 : startDow - 1; // Mon=0 … Sun=6
    const grid: (Date | null)[] = [];
    for (let i = 0; i < startDow; i++) grid.push(null);
    for (let d = 1; d <= daysInMonth; d++) grid.push(new Date(year, month, d));
    while (grid.length % 7 !== 0) grid.push(null);
    return grid;
  });

  prevMonth(): void {
    const d = this.currentMonth();
    this.currentMonth.set(new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }

  nextMonth(): void {
    const d = this.currentMonth();
    this.currentMonth.set(new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }

  private readonly appointmentDates = computed(() => {
    const dates = new Set<string>();
    for (const a of this.appointments()) {
      if (a.paymentStatus !== 'Cancelado') dates.add(a.date);
    }
    return dates;
  });

  hasAppointment(date: Date): boolean {
    return this.appointmentDates().has(this._toDateStr(date));
  }

  readonly isWorkingDay = computed(() =>
    this.workSvc.isWorkingDay(jsToDow(this.selectedDate().getDay()))
  );

  /** Slots del día seleccionado generados desde el horario configurado */
  readonly timeSlots = computed(() => {
    const date    = this.selectedDate();
    const dow     = jsToDow(date.getDay());
    const dateStr = this._toDateStr(date);

    const slotTimes    = this.workSvc.generateSlots(dow);
    const dayAppts     = this.appointments().filter(a => a.date === dateStr);
    const occupiedTimes = new Set(
      dayAppts.filter(a => a.paymentStatus !== 'Cancelado').map(a => a.time)
    );
    return slotTimes.map(time => ({ time, isOccupied: occupiedTimes.has(time) }));
  });

  async ngOnInit(): Promise<void> {
    await Promise.all([
      this._loadAppointments(),
      this.blockSvc.load(),
      this.workSvc.load(),
    ]);
    this.isLoading.set(false);
  }

  private async _loadAppointments(): Promise<void> {
    try {
      const data = await firstValueFrom(
        this.http.get<IAppointment[]>(`${environment.apiUrl}/appointments`)
      );
      this.appointments.set(data);
    } catch { /* continúa con lista vacía */ }
  }

  private _toDateStr(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }).format(date);
  }

  isSameDay(d1: Date, d2: Date): boolean {
    return d1.toDateString() === d2.toDateString();
  }

  getAppointmentAt(time: string): IAppointment | undefined {
    const dateStr = this._toDateStr(this.selectedDate());
    return this.appointments().find(a => a.date === dateStr && a.time === time && a.paymentStatus !== 'Cancelado');
  }

  selectSlot(time: string, isOccupied: boolean): void {
    if (isOccupied) {
      const appt = this.getAppointmentAt(time);
      if (appt) {
        this.selectedAppointment.set(appt);
        this.selectedHour.set(null);
      }
    } else {
      this.selectedHour.set(time);
      this.selectedAppointment.set(null);
    }
  }

  selectDate(date: Date): void {
    this.selectedDate.set(date);
    this.selectedHour.set(null);
    this.selectedAppointment.set(null);
  }

  isBlocked(time: string): boolean {
    return this.blockSvc.isBlocked(this.selectedDate(), time);
  }

  async toggleBlock(time: string): Promise<void> {
    const id = this.blockSvc.getBlockId(this.selectedDate(), time);
    if (id) {
      await this.blockSvc.remove(id);
    } else {
      const date     = this.selectedDate();
      const dateStr  = this._toDateStr(date);
      const duration = this.workSvc.getSlotDuration(jsToDow(date.getDay()));
      const [h, min] = time.split(':').map(Number);
      const end = new Date(date);
      end.setHours(h, min + duration);
      const endTime = `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;
      await this.blockSvc.add({
        startDate: dateStr, startTime: time,
        endDate: dateStr,   endTime,
        reason: 'Bloqueo rápido desde agenda',
      });
    }
  }

  readonly today = new Date();

  readonly hours = computed(() => {
    const dow     = jsToDow(this.selectedDate().getDay());
    const slots   = this.workSvc.generateSlots(dow);
    const dayApts = this.dayAppointments();

    let minH = 7;
    let maxH = 19;

    if (slots.length) {
      minH = Math.min(minH, parseInt(slots[0].split(':')[0]));
      maxH = Math.max(maxH, parseInt(slots[slots.length - 1].split(':')[0]));
    }

    for (const a of dayApts) {
      const h = parseInt(a.time.split(':')[0]);
      if (h < minH) minH = h;
      if (h > maxH) maxH = h;
    }

    return Array.from({ length: maxH - minH + 1 }, (_, i) => minH + i);
  });

  readonly dayLabel = computed(() =>
    this.selectedDate().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
  );

  readonly dayAppointments = computed(() => {
    const dateStr = this._toDateStr(this.selectedDate());
    return this.appointments().filter(a => a.date === dateStr && a.paymentStatus !== 'Cancelado');
  });

  readonly dayStats = computed(() => {
    const apts = this.dayAppointments();
    return {
      total: apts.length,
      pagadas: apts.filter(a => a.paymentStatus === 'Pagado').length,
      pendientes: apts.filter(a => a.paymentStatus === 'Pendiente').length,
    };
  });

  getAppointmentsAtHour(h: number): IAppointment[] {
    return this.dayAppointments().filter(a => parseInt(a.time.split(':')[0]) === h);
  }

  isCurrentHour(h: number): boolean {
    return new Date().getHours() === h && this.isSameDay(this.selectedDate(), new Date());
  }

  prevDay(): void {
    const d = new Date(this.selectedDate());
    d.setDate(d.getDate() - 1);
    this.selectDate(d);
  }

  nextDay(): void {
    const d = new Date(this.selectedDate());
    d.setDate(d.getDate() + 1);
    this.selectDate(d);
  }

  goToToday(): void {
    this.selectDate(new Date());
  }

  handleConfirm(): void {
    if (this.selectedHour()) this.router.navigate(['/pagos']);
  }

  toggleBlockingMode(): void {
    this.isBlockingMode.update(v => !v);
    this.selectedHour.set(null);
  }
}
