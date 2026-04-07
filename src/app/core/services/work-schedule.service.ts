import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface IWorkDay {
  id?: string;
  dayOfWeek:    number;  // 0=Lunes … 6=Domingo
  isWorking:    boolean;
  startTime:    string;  // 'HH:mm'
  endTime:      string;  // 'HH:mm'
  slotDuration: number;  // minutos
}

export const DAY_LABELS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

/** Convierte Date.getDay() (0=Dom) al índice 0=Lun…6=Dom */
export const jsToDow = (jsDay: number): number => (jsDay === 0 ? 6 : jsDay - 1);

@Injectable({ providedIn: 'root' })
export class WorkScheduleService {
  private readonly http = inject(HttpClient);

  readonly schedule  = signal<IWorkDay[]>([]);
  readonly isLoaded  = signal(false);
  readonly dayLabels = DAY_LABELS;

  async load(): Promise<void> {
    try {
      const data = await firstValueFrom(
        this.http.get<IWorkDay[]>(`${environment.apiUrl}/work-schedule`)
      );
      this.schedule.set(data);
      this.isLoaded.set(true);
    } catch { /* sin horario configurado */ }
  }

  async save(days: IWorkDay[]): Promise<IWorkDay[]> {
    const updated = await firstValueFrom(
      this.http.put<IWorkDay[]>(`${environment.apiUrl}/work-schedule`, days)
    );
    this.schedule.set(updated);
    return updated;
  }

  /** Genera los slots de tiempo para un dayOfWeek (0=Lun…6=Dom) */
  generateSlots(dayOfWeek: number): string[] {
    const day = this.schedule().find(d => d.dayOfWeek === dayOfWeek);
    if (!day?.isWorking || !day.startTime || !day.endTime) return [];

    const [startH, startM] = day.startTime.split(':').map(Number);
    const [endH,   endM]   = day.endTime.split(':').map(Number);
    const startMin = startH * 60 + startM;
    let   endMin   = endH   * 60 + endM;
    const duration = day.slotDuration || 30;

    // Si el fin es medianoche (00:00) o anterior al inicio, tratar como fin de día
    if (endMin <= startMin) endMin = 24 * 60;

    const slots: string[] = [];
    for (let m = startMin; m < endMin; m += duration) {
      const h   = Math.floor(m / 60) % 24;
      const min = m % 60;
      slots.push(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
    }
    return slots;
  }

  isWorkingDay(dayOfWeek: number): boolean {
    const day = this.schedule().find(d => d.dayOfWeek === dayOfWeek);
    return day?.isWorking ?? false;
  }

  getSlotDuration(dayOfWeek: number): number {
    return this.schedule().find(d => d.dayOfWeek === dayOfWeek)?.slotDuration ?? 30;
  }
}
