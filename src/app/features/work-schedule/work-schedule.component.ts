import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { trigger, style, animate, transition } from '@angular/animations';
import { WorkScheduleService, IWorkDay } from '../../core/services/work-schedule.service';

@Component({
  selector: 'app-work-schedule',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './work-schedule.component.html',
  animations: [
    trigger('fadeSlide', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-6px)' }),
        animate('200ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('150ms ease-in', style({ opacity: 0 }))
      ])
    ])
  ]
})
export class WorkScheduleComponent implements OnInit {
  private readonly svc = inject(WorkScheduleService);

  days:      IWorkDay[] = [];
  isSaving   = signal(false);
  isLoading  = signal(true);
  savedOk    = signal(false);

  readonly dayLabels = this.svc.dayLabels;
  readonly durations = [15, 30, 45, 60];

  readonly slotDuration = signal(30);

  async ngOnInit(): Promise<void> {
    await this.svc.load();
    this.days = this.svc.schedule().map(d => ({ ...d }));
    if (this.days.length) this.slotDuration.set(this.days[0].slotDuration);
    this.isLoading.set(false);
  }

  onToggle(day: IWorkDay): void {
    if (day.isWorking) {
      if (!day.startTime) day.startTime = '09:00';
      if (!day.endTime)   day.endTime   = '18:00';
    }
  }

  setSlotDuration(duration: number): void {
    this.slotDuration.set(duration);
  }

  async saveSchedule(): Promise<void> {
    this.isSaving.set(true);
    try {
      const payload = this.days.map(d => ({ ...d, slotDuration: this.slotDuration() }));
      await this.svc.save(payload);
      this.days = this.svc.schedule().map(d => ({ ...d }));
      this.savedOk.set(true);
      setTimeout(() => this.savedOk.set(false), 2500);
    } finally {
      this.isSaving.set(false);
    }
  }
}
