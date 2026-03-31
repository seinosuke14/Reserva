import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { trigger, style, animate, transition } from '@angular/animations';
import { AuthService } from '../../core/services/auth.service';
import { ScheduleBlockService } from '../../core/services/schedule-block.service';
import { MOCK_TIME_SLOTS } from '../../data/mock-time-slots';

@Component({
  selector: 'app-booking-calendar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './booking-calendar.component.html',
  animations: [
    trigger('fadeSlide', [
      transition(':enter', [style({ opacity: 0, transform: 'translateY(20px)' }), animate('200ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))]),
      transition(':leave', [animate('150ms ease-in', style({ opacity: 0, transform: 'translateY(20px)' }))])
    ])
  ]
})
export class BookingCalendarComponent {
  private readonly router     = inject(Router);
  private readonly auth       = inject(AuthService);
  private readonly blockSvc   = inject(ScheduleBlockService);

  readonly timeSlots    = MOCK_TIME_SLOTS;
  readonly selectedDate = signal<Date>(new Date());
  readonly selectedHour = signal<string | null>(null);
  readonly isBlockingMode = signal(false);

  readonly isProfessional = computed(() => {
    const role = this.auth.currentUser()?.role;
    return role === 'professional' || role === 'admin';
  });

  readonly days = (() => {
    const arr: Date[] = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      arr.push(d);
    }
    return arr;
  })();

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }).format(date);
  }

  isSameDay(d1: Date, d2: Date): boolean {
    return d1.toDateString() === d2.toDateString();
  }

  selectDate(date: Date) {
    this.selectedDate.set(date);
    this.selectedHour.set(null);
  }

  isBlocked(time: string): boolean {
    return this.blockSvc.isBlocked(this.selectedDate(), time);
  }

  toggleBlock(time: string) {
    const id = this.blockSvc.getBlockId(this.selectedDate(), time);
    if (id) {
      this.blockSvc.remove(id);
    } else {
      const date = this.selectedDate();
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;
      const [h, min] = time.split(':').map(Number);
      const end = new Date(date);
      end.setHours(h, min + 30);
      const endTime = `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;
      this.blockSvc.add({ id: Math.random().toString(36).substr(2, 9), startDate: dateStr, startTime: time, endDate: dateStr, endTime, reason: 'Bloqueo rápido desde agenda' });
    }
  }

  handleConfirm() {
    if (this.selectedHour()) this.router.navigate(['/pagos']);
  }

  toggleBlockingMode() {
    this.isBlockingMode.update(v => !v);
    this.selectedHour.set(null);
  }
}