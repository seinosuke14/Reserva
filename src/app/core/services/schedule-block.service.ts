import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface IScheduleBlock {
  id: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  reason?: string;
}

@Injectable({ providedIn: 'root' })
export class ScheduleBlockService {
  private readonly http = inject(HttpClient);
  private readonly _blocks = signal<IScheduleBlock[]>([]);

  readonly blocks = this._blocks.asReadonly();

  async load(): Promise<void> {
    try {
      const data = await firstValueFrom(
        this.http.get<IScheduleBlock[]>(`${environment.apiUrl}/schedule-blocks`)
      );
      this._blocks.set(data);
    } catch {
      // Si la API no responde, parte con lista vacía
      this._blocks.set([]);
    }
  }

  async add(block: Omit<IScheduleBlock, 'id'>): Promise<void> {
    const created = await firstValueFrom(
      this.http.post<IScheduleBlock>(`${environment.apiUrl}/schedule-blocks`, block)
    );
    this._blocks.update(list => [...list, created]);
  }

  async remove(id: string): Promise<void> {
    await firstValueFrom(
      this.http.delete(`${environment.apiUrl}/schedule-blocks/${id}`)
    );
    this._blocks.update(list => list.filter(b => b.id !== id));
  }

  isBlocked(date: Date, time: string): boolean {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const slotDT = new Date(`${y}-${m}-${d}T${time}`);

    return this._blocks().some(block => {
      const start = new Date(`${block.startDate}T${block.startTime}`);
      const end   = new Date(`${block.endDate}T${block.endTime}`);
      return slotDT >= start && slotDT < end;
    });
  }

  getBlockId(date: Date, time: string): string | undefined {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const slotDT = new Date(`${y}-${m}-${d}T${time}`);

    return this._blocks().find(block => {
      const start = new Date(`${block.startDate}T${block.startTime}`);
      const end   = new Date(`${block.endDate}T${block.endTime}`);
      return slotDT >= start && slotDT < end;
    })?.id;
  }
}
