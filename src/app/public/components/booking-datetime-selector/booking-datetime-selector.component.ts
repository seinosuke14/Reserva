import { Component, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { formatDateLong } from '../../../helpers/formatters';
import { IDayAvailability } from '../../../helpers/models';

@Component({
  selector: 'app-booking-datetime-selector',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="step-content">
      <div class="step-header">
        <h3 class="step-title">Selecciona fecha y hora</h3>
        <p class="step-desc">Elige el día y horario que mejor te convengan</p>
      </div>

      <!-- Calendario -->
      <div class="calendar-section">
        <label class="section-label">
          Calendario
          @if (selectedDate()) {
            <span class="selected-date-label"> — {{ formatDate(selectedDate()) }}</span>
          }
        </label>

        <div class="cal-nav">
          <button class="cal-nav-btn" (click)="prevCalMonth()" [disabled]="isPrevMonthDisabled()">←</button>
          <span class="cal-month-label">{{ calendarMonthLabel() }}</span>
          <button class="cal-nav-btn" (click)="nextCalMonth()">→</button>
        </div>

        <div class="cal-weekdays">
          @for (day of ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']; track day) {
            <div class="cal-weekday">{{ day }}</div>
          }
        </div>

        <div class="cal-grid">
          @for (cell of calendarGrid(); track cell.dateStr) {
            <button class="cal-day"
              [ngClass]="'cal-' + cell.state"
              [disabled]="cell.state === 'past' || cell.state === 'unavailable'"
              (click)="selectDate(cell.dateStr!)">
              @if (cell.dateStr) {
                <span>{{ cell.day }}</span>
                @if (cell.state === 'available' || cell.state === 'full') {
                  <span class="cal-dot" [hidden]="cell.state === 'full'"></span>
                }
              }
            </button>
          }
        </div>

        <div class="cal-legend">
          <div class="legend-item">
            <span class="legend-dot available"></span> Disponible
          </div>
          <div class="legend-item">
            <span class="legend-dot full"></span> Completo
          </div>
          <div class="legend-item">
            <span class="legend-dot unavailable"></span> No laboral
          </div>
        </div>
      </div>

      <!-- Time slots -->
      <div class="calendar-section">
        <label class="section-label">Horarios disponibles</label>
        <div class="slots-grid">
          @for (slot of daySlots(); track slot.time) {
            <button class="slot-btn"
              [class.selected]="selectedHour() === slot.time"
              [class.occupied]="!slot.available"
              [disabled]="!slot.available"
              (click)="selectHour(slot.time)">
              {{ slot.time }}
              @if (!slot.available) {
                <span class="slot-taken-label">Tomado</span>
              }
            </button>
          }
        </div>
      </div>
    </div>
  `,
  styleUrl: './booking-datetime-selector.component.scss'
})
export class BookingDatetimeSelectorComponent {
  readonly availability = input<IDayAvailability[]>([]);
  readonly selectedDate = input<string>('');
  readonly selectedHour = input<string | null>(null);

  readonly dateSelected = output<string>();
  readonly hourSelected = output<string>();
  readonly formatDate = formatDateLong;

  readonly calendarMonth = signal(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  readonly today = new Date().toISOString().slice(0, 10);

  readonly calendarMonthLabel = computed(() =>
    this.calendarMonth().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
  );

  readonly isPrevMonthDisabled = computed(() => {
    const now = new Date();
    const cm  = this.calendarMonth();
    return cm.getFullYear() === now.getFullYear() && cm.getMonth() === now.getMonth();
  });

  readonly calendarGrid = computed(() => this._buildCalendarGrid());

  readonly daySlots = computed(() => {
    const day = this.availability().find(d => d.date === this.selectedDate());
    return day ? day.slots : [];
  });

  prevCalMonth(): void {
    if (this.isPrevMonthDisabled()) return;
    const d = this.calendarMonth();
    this.calendarMonth.set(new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }

  nextCalMonth(): void {
    const d = this.calendarMonth();
    this.calendarMonth.set(new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }

  selectDate(date: string): void {
    this.dateSelected.emit(date);
  }

  selectHour(time: string): void {
    this.hourSelected.emit(time);
  }

  private _buildCalendarGrid() {
    const first       = this.calendarMonth();
    const year        = first.getFullYear();
    const month       = first.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let   startDow    = first.getDay();
    startDow = startDow === 0 ? 6 : startDow - 1;

    const availMap = new Map(this.availability().map(d => [d.date, d]));
    const grid: any[] = [];

    for (let i = 0; i < startDow; i++) grid.push({ dateStr: null, day: 0, state: 'empty' });

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      let state: string;
      if (dateStr < this.today) {
        state = 'past';
      } else {
        const avail = availMap.get(dateStr);
        if (!avail) state = 'unavailable';
        else if (avail.slots.some(s => s.available)) state = 'available';
        else state = 'full';
      }
      grid.push({ dateStr, day: d, state });
    }

    while (grid.length % 7 !== 0) grid.push({ dateStr: null, day: 0, state: 'empty' });
    return grid;
  }
}
