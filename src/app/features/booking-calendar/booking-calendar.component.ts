import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { trigger, style, animate, transition } from '@angular/animations';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ScheduleBlockService } from '../../core/services/schedule-block.service';
import { WorkScheduleService, jsToDow } from '../../core/services/work-schedule.service';
import { environment } from '../../../environments/environment';
import { RescheduleConfirmComponent } from '../../components/reschedule-confirm/reschedule-confirm.component';

interface IAppointment {
  id: string;
  date: string;
  time: string;
  notes: string | null;
  paymentStatus: 'Pagado' | 'Pendiente' | 'Cancelado' | 'Finalizada';
  rated:    boolean;
  customer: { id: string; name: string; email?: string };
  service:  { id: string; name: string; duration?: number };
}

interface IService {
  id: string;
  name: string;
  duration: number;
  price: number;
}

interface ICustomer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}


@Component({
  selector: 'app-booking-calendar',
  standalone: true,
  imports: [CommonModule, RescheduleConfirmComponent],
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
export class BookingCalendarComponent implements OnInit, OnDestroy {
  private readonly router    = inject(Router);
  private readonly http      = inject(HttpClient);
  readonly auth              = inject(AuthService);
  private readonly blockSvc  = inject(ScheduleBlockService);
  private readonly workSvc   = inject(WorkScheduleService);

  readonly selectedDate        = signal<Date>(new Date());
  readonly selectedHour        = signal<string | null>(null);
  readonly isBlockingMode      = signal(false);
  readonly isLoading           = signal(true);
  readonly selectedAppointment = signal<IAppointment | null>(null);

  isMobile        = signal(window.innerWidth < 768);
  isLeftPanelOpen = signal(window.innerWidth >= 768);

  private readonly _resizeListener = () => {
    const mobile = window.innerWidth < 768;
    this.isMobile.set(mobile);
    if (!mobile) this.isLeftPanelOpen.set(true);
  };

  private appointments = signal<IAppointment[]>([]);

  // ── Nueva Cita ────────────────────────────────────────────────
  readonly showNewAppt     = signal(false);
  readonly services        = signal<IService[]>([]);
  private readonly customers = signal<ICustomer[]>([]);

  readonly na_serviceId    = signal('');
  readonly na_date         = signal('');
  readonly na_time         = signal('');
  readonly na_name         = signal('');
  readonly na_email        = signal('');
  readonly na_phone        = signal('');
  readonly na_notes        = signal('');
  readonly na_status       = signal<'Pendiente' | 'Pagado'>('Pendiente');
  readonly na_error        = signal('');
  readonly na_submitting   = signal(false);

  private readonly na_existingCustomerId = signal<string | null>(null);
  readonly na_showSuggestions           = signal(false);

  readonly na_suggestions = computed(() => {
    const q = this.na_name().trim().toLowerCase();
    if (q.length < 2 || this.na_existingCustomerId()) return [];
    return this.customers()
      .filter(c => c.name.toLowerCase().includes(q))
      .slice(0, 5);
  });

  readonly na_availableSlots = computed(() => {
    const dateStr = this.na_date();
    if (!dateStr) return [];

    const date     = new Date(dateStr + 'T00:00:00');
    const dow      = jsToDow(date.getDay());
    const allSlots = this.workSvc.generateSlots(dow);
    const slotDur  = this.workSvc.getSlotDuration(dow);

    // Slots ocupados por citas existentes (inicio + continuaciones)
    const dayAppts = this.appointments().filter(
      a => a.date === dateStr && a.paymentStatus !== 'Cancelado'
    );
    const occupied = new Set<string>();
    for (const apt of dayAppts) {
      const blocks = Math.ceil((apt.service.duration ?? slotDur) / slotDur);
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
    const newService  = this.services().find(s => s.id === this.na_serviceId());
    const newBlocks   = Math.ceil((newService?.duration ?? slotDur) / slotDur);

    const isToday   = dateStr === this._toDateStr(new Date());
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
    startDow = startDow === 0 ? 6 : startDow - 1;
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
    window.addEventListener('resize', this._resizeListener);
    await Promise.all([
      this._loadAppointments(),
      this._loadServices(),
      this._loadCustomers(),
      this.blockSvc.load(),
      this.workSvc.load(),
    ]);
    this.isLoading.set(false);
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this._resizeListener);
  }

  toggleLeftPanel(): void {
    this.isLeftPanelOpen.update(v => !v);
  }

  private async _loadAppointments(): Promise<void> {
    try {
      const data = await firstValueFrom(
        this.http.get<IAppointment[]>(`${environment.apiUrl}/appointments`)
      );
      this.appointments.set(data);
    } catch { /* continúa con lista vacía */ }
  }

  private async _loadServices(): Promise<void> {
    try {
      const data = await firstValueFrom(this.http.get<IService[]>(`${environment.apiUrl}/services`));
      this.services.set(data);
    } catch { }
  }

  private async _loadCustomers(): Promise<void> {
    try {
      const data = await firstValueFrom(this.http.get<ICustomer[]>(`${environment.apiUrl}/customers`));
      this.customers.set(data);
    } catch { }
  }

  async updateAppointmentStatus(id: string, status: 'Pagado' | 'Cancelado'): Promise<void> {
    try {
      await firstValueFrom(
        this.http.patch(`${environment.apiUrl}/appointments/${id}/status`, { paymentStatus: status })
      );
      await this._loadAppointments();
      const updated = this.appointments().find(a => a.id === id) ?? null;
      this.selectedAppointment.set(updated);
    } catch { /* silencioso */ }
  }

  readonly finalizingId = signal<string | null>(null);

  isAppointmentPast(apt: IAppointment): boolean {
    const [year, month, day] = apt.date.substring(0, 10).split('-').map(Number);
    const [hour, minute]     = apt.time.split(':').map(Number);
    const apptPlusOne = new Date(year, month - 1, day, hour, minute + 1, 0, 0);
    return new Date() >= apptPlusOne;
  }

  async markAsFinalized(id: string): Promise<void> {
    if (this.finalizingId()) return;
    this.finalizingId.set(id);
    try {
      await firstValueFrom(
        this.http.patch(`${environment.apiUrl}/appointments/${id}/status`, { paymentStatus: 'Finalizada' })
      );
      await this._loadAppointments();
      const updated = this.appointments().find(a => a.id === id) ?? null;
      this.selectedAppointment.set(updated);
    } catch { /* silencioso */ }
    finally { this.finalizingId.set(null); }
  }

  _toDateStr(date: Date): string {
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
      this.openNewAppt();
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

  async toggleBlock(time: string, day?: Date): Promise<void> {
    const date     = day ?? this.selectedDate();
    const id       = this.blockSvc.getBlockId(date, time);
    if (id) {
      await this.blockSvc.remove(id);
    } else {
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

  readonly today    = new Date();
  readonly todayStr = this._toDateStr(new Date());

  // ── Reschedule desde panel de detalle ────────────────────────
  readonly isRescheduling   = signal(false);
  readonly rs_date          = signal('');
  readonly rs_time          = signal('');

  readonly rs_availableSlots = computed(() => {
    const dateStr = this.rs_date();
    if (!dateStr) return [];
    const apt = this.selectedAppointment();
    if (!apt) return [];

    const date    = new Date(dateStr + 'T00:00:00');
    const dow     = jsToDow(date.getDay());
    const allSlots = this.workSvc.generateSlots(dow);
    const slotDur  = this.workSvc.getSlotDuration(dow);

    const dayAppts = this.appointments().filter(
      a => a.date === dateStr && a.paymentStatus !== 'Cancelado' && a.id !== apt.id
    );
    const occupied = new Set<string>();
    for (const a of dayAppts) {
      const blocks = Math.ceil((a.service.duration ?? slotDur) / slotDur);
      const [h, m] = a.time.split(':').map(Number);
      let cursor = h * 60 + m;
      for (let b = 0; b < blocks; b++) {
        occupied.add(`${String(Math.floor(cursor / 60) % 24).padStart(2, '0')}:${String(cursor % 60).padStart(2, '0')}`);
        cursor += slotDur;
      }
    }

    return allSlots.filter(slot => {
      if (this._isPastSlot(dateStr, slot)) return false;
      if (occupied.has(slot)) return false;
      if (this.blockSvc.isBlocked(date, slot)) return false;
      const blocks = Math.ceil((apt.service.duration ?? slotDur) / slotDur);
      const [h, m] = slot.split(':').map(Number);
      let cursor = h * 60 + m + slotDur;
      for (let b = 1; b < blocks; b++) {
        const cont = `${String(Math.floor(cursor / 60) % 24).padStart(2, '0')}:${String(cursor % 60).padStart(2, '0')}`;
        if (occupied.has(cont)) return false;
        cursor += slotDur;
      }
      return true;
    });
  });

  openRescheduleEdit(): void {
    const apt = this.selectedAppointment();
    if (!apt) return;
    this.rs_date.set(apt.date);
    this.rs_time.set(apt.time);
    this.isRescheduling.set(true);
  }

  submitRescheduleFromPanel(): void {
    const apt = this.selectedAppointment();
    if (!apt || !this.rs_date() || !this.rs_time()) return;
    if (apt.date === this.rs_date() && apt.time === this.rs_time()) return;
    this.pendingReschedule.set({ apt, newDate: this.rs_date(), newTime: this.rs_time() });
    this.selectedAppointment.set(null);
    this.isRescheduling.set(false);
  }

  closeDetailPanel(): void {
    this.selectedAppointment.set(null);
    this.isRescheduling.set(false);
  }
  // ─────────────────────────────────────────────────────────────

  // ── Drag & Drop ───────────────────────────────────────────────
  readonly draggingAppt     = signal<IAppointment | null>(null);
  readonly dragOverSlot     = signal<{ dateStr: string; slot: string } | null>(null);
  readonly dragOverDate     = signal<string | null>(null);
  readonly pendingReschedule = signal<{ apt: IAppointment; newDate: string; newTime: string } | null>(null);
  readonly rescheduleSaving  = signal(false);

  onDragStart(event: DragEvent, apt: IAppointment): void {
    this.draggingAppt.set(apt);
    event.dataTransfer?.setData('text/plain', apt.id);
    (event.target as HTMLElement).style.opacity = '0.45';
  }

  onDragEnd(event: DragEvent): void {
    (event.target as HTMLElement).style.opacity = '';
    this.draggingAppt.set(null);
    this.dragOverSlot.set(null);
    this.dragOverDate.set(null);
  }

  onSlotDragOver(event: DragEvent, dateStr: string, slot: string): void {
    const apt = this.draggingAppt();
    if (!apt) return;
    if (!this._isValidDropTarget(apt, dateStr, slot)) return;
    event.preventDefault();
    this.dragOverSlot.set({ dateStr, slot });
  }

  onSlotDragLeave(): void {
    this.dragOverSlot.set(null);
  }

  onSlotDrop(event: DragEvent, dateStr: string, slot: string): void {
    const apt = this.draggingAppt();
    if (!apt || !this._isValidDropTarget(apt, dateStr, slot)) return;
    event.preventDefault();
    this.dragOverSlot.set(null);
    this.pendingReschedule.set({ apt, newDate: dateStr, newTime: slot });
  }

  onCalendarDayDragOver(event: DragEvent, day: Date): void {
    const apt = this.draggingAppt();
    if (!apt) return;
    const dateStr = this._toDateStr(day);
    if (this._isPastSlot(dateStr, apt.time)) return;
    event.preventDefault();
    this.dragOverDate.set(dateStr);
  }

  onCalendarDayDragLeave(): void {
    this.dragOverDate.set(null);
  }

  onCalendarDayDrop(event: DragEvent, day: Date): void {
    event.preventDefault();
    const apt = this.draggingAppt();
    if (!apt) return;
    const newDate = this._toDateStr(day);
    if (newDate === apt.date) return;
    if (this._isPastSlot(newDate, apt.time)) return;
    this.dragOverDate.set(null);
    this.pendingReschedule.set({ apt, newDate, newTime: apt.time });
  }

  _isPastSlot(dateStr: string, slot: string): boolean {
    const [h, m] = slot.split(':').map(Number);
    const dt = new Date(dateStr + 'T00:00:00');
    dt.setHours(h, m, 0, 0);
    return dt < new Date();
  }

  private _isValidDropTarget(apt: IAppointment, dateStr: string, slot: string): boolean {
    if (apt.date === dateStr && apt.time === slot) return false;
    if (this._isPastSlot(dateStr, slot)) return false;
    const targetDate = new Date(dateStr + 'T00:00:00');
    if (this.blockSvc.isBlocked(targetDate, slot)) return false;
    const slotDur = this.workSvc.getSlotDuration(jsToDow(targetDate.getDay()));
    const dayAppts = this.appointments().filter(
      a => a.date === dateStr && a.paymentStatus !== 'Cancelado' && a.id !== apt.id
    );
    const occupied = new Set<string>();
    for (const a of dayAppts) {
      const blocks = Math.ceil((a.service.duration ?? slotDur) / slotDur);
      const [h, m] = a.time.split(':').map(Number);
      let cursor = h * 60 + m;
      for (let b = 0; b < blocks; b++) {
        occupied.add(`${String(Math.floor(cursor / 60) % 24).padStart(2, '0')}:${String(cursor % 60).padStart(2, '0')}`);
        cursor += slotDur;
      }
    }
    if (occupied.has(slot)) return false;
    const blocks = Math.ceil((apt.service.duration ?? slotDur) / slotDur);
    const [h, m] = slot.split(':').map(Number);
    let cursor = h * 60 + m + slotDur;
    for (let b = 1; b < blocks; b++) {
      const cont = `${String(Math.floor(cursor / 60) % 24).padStart(2, '0')}:${String(cursor % 60).padStart(2, '0')}`;
      if (occupied.has(cont)) return false;
      cursor += slotDur;
    }
    return true;
  }

  async confirmReschedule(): Promise<void> {
    const pending = this.pendingReschedule();
    if (!pending) return;
    this.rescheduleSaving.set(true);
    try {
      await firstValueFrom(
        this.http.put(`${environment.apiUrl}/appointments/${pending.apt.id}`, {
          date: pending.newDate,
          time: pending.newTime,
        })
      );
      this.pendingReschedule.set(null);
      await this._loadAppointments();
      if (!this.isSameDay(this.selectedDate(), new Date(pending.newDate + 'T00:00:00'))) {
        this.selectDate(new Date(pending.newDate + 'T00:00:00'));
      }
    } catch { /* silencioso */ }
    finally { this.rescheduleSaving.set(false); }
  }

  cancelReschedule(): void {
    this.pendingReschedule.set(null);
  }
  // ─────────────────────────────────────────────────────────────

  // ── Vista semanal ─────────────────────────────────────────────
  readonly weekDays = computed(() => {
    const d = this.selectedDate();
    const jsDay = d.getDay();
    const daysFromMon = jsDay === 0 ? 6 : jsDay - 1;
    const monday = new Date(d);
    monday.setDate(d.getDate() - daysFromMon);
    monday.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      return day;
    });
  });

  readonly weekLabel = computed(() => {
    const days  = this.weekDays();
    const first = days[0].toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    const last  = days[6].toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${first} – ${last}`;
  });

  readonly allWeekSlots = computed(() => {
    const set = new Set<string>();
    for (const day of this.weekDays()) {
      for (const s of this.workSvc.generateSlots(jsToDow(day.getDay()))) set.add(s);
    }
    const weekDates = new Set(this.weekDays().map(d => this._toDateStr(d)));
    for (const a of this.appointments()) {
      if (weekDates.has(a.date) && a.paymentStatus !== 'Cancelado') set.add(a.time);
    }
    return [...set].sort();
  });

  readonly weekStats = computed(() => {
    const dates = new Set(this.weekDays().map(d => this._toDateStr(d)));
    const apts  = this.appointments().filter(a => dates.has(a.date) && a.paymentStatus !== 'Cancelado');
    return {
      total:      apts.length,
      pagadas:    apts.filter(a => a.paymentStatus === 'Pagado').length,
      pendientes: apts.filter(a => a.paymentStatus === 'Pendiente').length,
    };
  });

  dayApptCount(day: Date): number {
    const s = this._toDateStr(day);
    return this.appointments().filter(a => a.date === s && a.paymentStatus !== 'Cancelado').length;
  }

  getApptAtDay(day: Date, slot: string): IAppointment | undefined {
    const s = this._toDateStr(day);
    return this.appointments().find(a => a.date === s && a.time === slot && a.paymentStatus !== 'Cancelado');
  }

  getContinuationForDay(day: Date, slot: string): IAppointment | null {
    const dateStr = this._toDateStr(day);
    const slotDur = this.workSvc.getSlotDuration(jsToDow(day.getDay()));
    const [sh, sm] = slot.split(':').map(Number);
    const slotMin  = sh * 60 + sm;
    for (const apt of this.appointments()) {
      if (apt.date !== dateStr || apt.paymentStatus === 'Cancelado') continue;
      const [ah, am] = apt.time.split(':').map(Number);
      const startMin = ah * 60 + am;
      const blocks   = Math.ceil((apt.service.duration ?? slotDur) / slotDur);
      if (slotMin > startMin && slotMin < startMin + blocks * slotDur) return apt;
    }
    return null;
  }

  isWorkingSlot(day: Date, slot: string): boolean {
    return this.workSvc.generateSlots(jsToDow(day.getDay())).includes(slot);
  }

  isBlockedForDay(day: Date, slot: string): boolean {
    return this.blockSvc.isBlocked(day, slot);
  }

  isCurrentTimeSlot(slot: string): boolean {
    const now    = new Date();
    const [h, m] = slot.split(':').map(Number);
    const nowMin  = now.getHours() * 60 + now.getMinutes();
    const slotMin = h * 60 + m;
    return nowMin >= slotMin && nowMin < slotMin + 30;
  }
  // ─────────────────────────────────────────────────────────────

  readonly slots = computed(() => {
    const dow       = jsToDow(this.selectedDate().getDay());
    const workSlots = this.workSvc.generateSlots(dow);

    const aptSlots = this.dayAppointments().map(a => a.time);
    const extra    = aptSlots.filter(t => !workSlots.includes(t));

    const all = [...workSlots, ...extra];
    return [...new Set(all)].sort();
  });

  readonly dayLabel = computed(() =>
    this.selectedDate().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
  );

  readonly dayAppointments = computed(() => {
    const dateStr = this._toDateStr(this.selectedDate());
    return this.appointments().filter(a => a.date === dateStr && a.paymentStatus !== 'Cancelado');
  });

  readonly slotDuration = computed(() =>
    this.workSvc.getSlotDuration(jsToDow(this.selectedDate().getDay()))
  );

  readonly continuationSlots = computed(() => {
    const slotDur = this.slotDuration();
    const map = new Map<string, IAppointment>();
    for (const apt of this.dayAppointments()) {
      const duration = apt.service.duration ?? slotDur;
      const blocks = Math.ceil(duration / slotDur);
      if (blocks <= 1) continue;
      const [h, m] = apt.time.split(':').map(Number);
      let minutesCursor = h * 60 + m;
      for (let b = 1; b < blocks; b++) {
        minutesCursor += slotDur;
        const hh = Math.floor(minutesCursor / 60) % 24;
        const mm = minutesCursor % 60;
        map.set(`${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`, apt);
      }
    }
    return map;
  });

  getContinuationFor(slot: string): IAppointment | null {
    return this.continuationSlots().get(slot) ?? null;
  }

  getAppointmentBlocks(apt: IAppointment): number {
    return Math.max(1, Math.ceil((apt.service.duration ?? this.slotDuration()) / this.slotDuration()));
  }

  getAppointmentEndTime(apt: IAppointment): string {
    const duration = apt.service.duration ?? this.slotDuration();
    const [h, m]   = apt.time.split(':').map(Number);
    const endMin   = h * 60 + m + duration;
    return `${String(Math.floor(endMin / 60) % 24).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;
  }

  readonly dayStats = computed(() => {
    const apts = this.dayAppointments();
    return {
      total: apts.length,
      pagadas: apts.filter(a => a.paymentStatus === 'Pagado').length,
      pendientes: apts.filter(a => a.paymentStatus === 'Pendiente').length,
    };
  });

  getAppointmentsAtSlot(slot: string): IAppointment[] {
    return this.dayAppointments().filter(a => a.time === slot);
  }

  isCurrentSlot(slot: string): boolean {
    if (!this.isSameDay(this.selectedDate(), new Date())) return false;
    const now = new Date();
    const [h, m] = slot.split(':').map(Number);
    const nowMin  = now.getHours() * 60 + now.getMinutes();
    const slotMin = h * 60 + m;
    const dur     = this.workSvc.getSlotDuration(jsToDow(this.selectedDate().getDay()));
    return nowMin >= slotMin && nowMin < slotMin + dur;
  }

  prevWeek(): void {
    const d = new Date(this.selectedDate());
    d.setDate(d.getDate() - 7);
    this.selectDate(d);
  }

  nextWeek(): void {
    const d = new Date(this.selectedDate());
    d.setDate(d.getDate() + 7);
    this.selectDate(d);
  }

  openNewApptForDay(day: Date, slot: string): void {
    this.selectedDate.set(new Date(day));
    this.selectedHour.set(slot);
    this.openNewAppt();
  }

  goToToday(): void {
    this.selectDate(new Date());
  }

  handleConfirm(): void {
    if (this.selectedHour()) this.router.navigate(['/app/pagos']);
  }

  toggleBlockingMode(): void {
    this.isBlockingMode.update(v => !v);
    this.selectedHour.set(null);
  }

  // ── Nueva Cita: métodos ───────────────────────────────────────

  openNewAppt(): void {
    const d       = this.selectedDate();
    const dateStr = this._toDateStr(d);
    const dow     = jsToDow(d.getDay());
    const slotDur = this.workSvc.getSlotDuration(dow);

    // Slots ocupados en ese día
    const dayAppts = this.appointments().filter(
      a => a.date === dateStr && a.paymentStatus !== 'Cancelado'
    );
    const occupied = new Set<string>();
    for (const apt of dayAppts) {
      const duration = apt.service.duration ?? slotDur;
      const blocks   = Math.ceil(duration / slotDur);
      const [h, m]   = apt.time.split(':').map(Number);
      let cursor     = h * 60 + m;
      for (let b = 0; b < blocks; b++) {
        const hh = Math.floor(cursor / 60) % 24;
        const mm = cursor % 60;
        occupied.add(`${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`);
        cursor += slotDur;
      }
    }

    const hour     = this.selectedHour();
    const validHour = hour && !occupied.has(hour) && !this.blockSvc.isBlocked(d, hour) ? hour : '';

    this.na_date.set(dateStr);
    this.na_time.set(validHour);
    this.na_serviceId.set(this.services()[0]?.id ?? '');
    this.na_name.set('');
    this.na_email.set('');
    this.na_phone.set('');
    this.na_notes.set('');
    this.na_status.set('Pendiente');
    this.na_error.set('');
    this.na_existingCustomerId.set(null);
    this.na_showSuggestions.set(false);
    this.showNewAppt.set(true);
  }

  closeNewAppt(): void {
    this.showNewAppt.set(false);
    this.na_showSuggestions.set(false);
  }

  selectSuggestedCustomer(c: ICustomer): void {
    this.na_name.set(c.name);
    this.na_email.set(c.email ?? '');
    this.na_phone.set(c.phone ?? '');
    this.na_existingCustomerId.set(c.id);
    this.na_showSuggestions.set(false);
  }

  onServiceChange(id: string): void {
    this.na_serviceId.set(id);
    if (!this.na_availableSlots().includes(this.na_time())) {
      this.na_time.set('');
    }
  }

  onNameInput(value: string): void {
    this.na_name.set(value);
    this.na_existingCustomerId.set(null);
    this.na_showSuggestions.set(value.trim().length >= 2);
  }

  onNameBlur(): void {
    // Delay para que el click en una sugerencia se registre antes de cerrar el panel
    setTimeout(() => this.na_showSuggestions.set(false), 180);
  }

  onModalDateChange(value: string): void {
    this.na_date.set(value);
    const date = new Date(value + 'T00:00:00');
    const slots = this.workSvc.generateSlots(jsToDow(date.getDay()));
    if (!slots.includes(this.na_time())) {
      this.na_time.set(slots[0] ?? '');
    }
  }

  async submitNewAppt(): Promise<void> {
    if (!this.na_serviceId() || !this.na_date() || !this.na_time() || !this.na_name().trim()) {
      this.na_error.set('Completa los campos requeridos (servicio, fecha, hora y nombre).');
      return;
    }

    this.na_submitting.set(true);
    this.na_error.set('');

    try {
      let customerId = this.na_existingCustomerId();

      if (!customerId) {
        const email = this.na_email().trim().toLowerCase();
        const found = email
          ? this.customers().find(c => c.email?.toLowerCase() === email)
          : undefined;

        if (found) {
          customerId = found.id;
        } else {
          const created = await firstValueFrom(
            this.http.post<ICustomer>(`${environment.apiUrl}/customers`, {
              name:  this.na_name().trim(),
              email: this.na_email().trim() || undefined,
              phone: this.na_phone().trim() || undefined,
            })
          );
          customerId = created.id;
          this.customers.update(list => [...list, created]);
        }
      }

      const service = this.services().find(s => s.id === this.na_serviceId());

      await firstValueFrom(
        this.http.post(`${environment.apiUrl}/appointments`, {
          date:          this.na_date(),
          time:          this.na_time(),
          amount:        Math.round(Number(service?.price ?? 0)),
          customerId,
          serviceId:     this.na_serviceId(),
          paymentStatus: this.na_status(),
          notes:         this.na_notes().trim() || undefined,
        })
      );

      this.showNewAppt.set(false);
      await this._loadAppointments();
    } catch (err: any) {
      this.na_error.set(err?.error?.message ?? 'Error al crear la cita. Intenta de nuevo.');
    } finally {
      this.na_submitting.set(false);
    }
  }
}
