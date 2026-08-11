import { Component, input, output, signal, computed, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { formatCLP, formatDateLong, withVat } from '../../../helpers/formatters';
import { IDayAvailability, ITimeSlot } from '../../../helpers/models';

/** Celda del calendario ya resuelta para pintar. */
interface ICalCell {
  dateStr: string | null;
  day: number;
  /** empty = relleno de la grilla · past/unavailable = no seleccionable */
  state: 'empty' | 'past' | 'unavailable' | 'available' | 'full';
}

/** Los horarios se muestran partidos en mañana y tarde para no dar un muro de botones. */
interface ISlotGroup {
  label: string;
  slots: ITimeSlot[];
}

@Component({
  selector: 'app-booking-datetime-selector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './booking-datetime-selector.component.html',
  styleUrl: './booking-datetime-selector.component.scss'
})
export class BookingDatetimeSelectorComponent {
  @ViewChild('slotsSection') slotsSection!: ElementRef;

  readonly availability = input<IDayAvailability[]>([]);
  readonly selectedDate = input<string>('');
  readonly selectedHour = input<string | null>(null);

  /** Datos del servicio elegido, para la cabecera y el resumen del pie. */
  readonly serviceName     = input<string>('');
  readonly serviceDuration = input<number | null>(null);
  readonly servicePrice    = input<number>(0);
  readonly canProceed      = input(false);

  readonly dateSelected  = output<string>();
  readonly hourSelected  = output<string>();
  readonly changeService = output<void>();
  readonly next          = output<void>();

  readonly formatCLP = formatCLP;
  readonly withVat   = withVat;

  /** Solo la inicial en mayúscula: con text-transform el CSS también subiría el "de". */
  private _upperFirst(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  /** "Lunes 10 de agosto" — Intl mete una coma tras el día de la semana. */
  readonly selectedDateLong = computed(() => {
    const d = this.selectedDate();
    return d ? this._upperFirst(formatDateLong(d).replace(',', '')) : '';
  });

  readonly calendarMonth = signal(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  readonly today = new Date().toISOString().slice(0, 10);

  /** "Agosto 2026" */
  readonly calendarMonthLabel = computed(() =>
    this._upperFirst(
      this.calendarMonth().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).replace(' de ', ' ')
    )
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

  readonly freeSlotCount = computed(() => this.daySlots().filter(s => s.available).length);

  /** Mañana (antes de las 13:00) y tarde; se omite el grupo que quede vacío. */
  readonly slotGroups = computed((): ISlotGroup[] => {
    const slots = this.daySlots();
    if (!slots.length) return [];

    const manana = slots.filter(s => this._hour(s.time) < 13);
    const tarde  = slots.filter(s => this._hour(s.time) >= 13);

    return [
      { label: 'Mañana', slots: manana },
      { label: 'Tarde',  slots: tarde  },
    ].filter(g => g.slots.length > 0);
  });

  /** "Lun 3 ago" — resumen compacto del pie. */
  readonly selectedDateShort = computed(() => {
    const d = this.selectedDate();
    if (!d) return '';
    const [y, m, day] = d.split('-').map(Number);
    const txt = new Date(y, m - 1, day)
      .toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' })
      .replace(',', '');
    return this._upperFirst(txt);
  });

  /** Hora de término según la duración del servicio. */
  readonly endHour = computed(() => {
    const hour = this.selectedHour();
    const dur  = this.serviceDuration();
    if (!hour || !dur) return null;

    const [h, m] = hour.split(':').map(Number);
    const end    = new Date(2000, 0, 1, h, m + dur);
    return `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;
  });

  private _hour(time: string): number {
    return Number(time.split(':')[0]) || 0;
  }

  prevCalMonth(): void {
    if (this.isPrevMonthDisabled()) return;
    const d = this.calendarMonth();
    this.calendarMonth.set(new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }

  nextCalMonth(): void {
    const d = this.calendarMonth();
    this.calendarMonth.set(new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }

  selectDate(date: string | null): void {
    if (!date) return;
    this.dateSelected.emit(date);
    // En móvil las horas quedan bajo el calendario: hay que llevar la vista hasta ellas.
    setTimeout(() => {
      if (window.innerWidth < 900) {
        this.slotsSection?.nativeElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  }

  selectHour(time: string): void {
    this.hourSelected.emit(time);
  }

  private _buildCalendarGrid(): ICalCell[] {
    const first       = this.calendarMonth();
    const year        = first.getFullYear();
    const month       = first.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let   startDow    = first.getDay();
    startDow = startDow === 0 ? 6 : startDow - 1;

    const availMap = new Map(this.availability().map(d => [d.date, d]));
    const grid: ICalCell[] = [];

    for (let i = 0; i < startDow; i++) grid.push({ dateStr: null, day: 0, state: 'empty' });

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      let state: ICalCell['state'];
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
