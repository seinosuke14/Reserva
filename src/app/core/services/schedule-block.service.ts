import { Injectable, signal } from '@angular/core';
import { IScheduleBlock, MOCK_SCHEDULE_BLOCKS } from '../../data/mock-schedule-blocks';

@Injectable({ providedIn: 'root' })
export class ScheduleBlockService {
  private readonly _blocks = signal<IScheduleBlock[]>([...MOCK_SCHEDULE_BLOCKS]);

  readonly blocks = this._blocks.asReadonly();

  add(block: IScheduleBlock): void {
    this._blocks.update(list => [...list, block]);
  }

  remove(id: string): void {
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