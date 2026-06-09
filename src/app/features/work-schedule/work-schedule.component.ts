import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { trigger, style, animate, transition } from '@angular/animations';
import { WorkScheduleService, IWorkDay } from '../../core/services/work-schedule.service';
import { ProfessionalService } from '../../core/services/professional.service';
import { AuthService } from '../../core/services/auth.service';

type ReminderPref = '1h_before' | '7h30_same_day' | '24h_before';

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
  private readonly svc    = inject(WorkScheduleService);
  private readonly proSvc = inject(ProfessionalService);
  private readonly auth   = inject(AuthService);

  days:      IWorkDay[] = [];
  isSaving   = signal(false);
  isLoading  = signal(true);
  savedOk    = signal(false);

  readonly dayLabels = this.svc.dayLabels;
  readonly durations = [15, 30, 45, 60];

  readonly slotDuration = signal(30);

  // ── Recordatorio de citas ──────────────────────────────────────────────────
  reminderPref     = signal<ReminderPref>('24h_before');
  reminderSelected = signal<ReminderPref>('24h_before');
  reminderSaving   = signal(false);
  reminderMsg      = signal<{ type: 'success' | 'error'; text: string } | null>(null);

  readonly reminderOptions: { value: ReminderPref; label: string; desc: string }[] = [
    { value: '1h_before',     label: '1 hora antes',          desc: 'Se envía 1 hora antes del inicio de la cita.' },
    { value: '7h30_same_day', label: '7:30 AM del mismo día', desc: 'Se envía a las 7:30 AM del día de la cita.' },
    { value: '24h_before',    label: '24 horas antes',        desc: 'Se envía a la misma hora del día anterior.' },
  ];

  async ngOnInit(): Promise<void> {
    await this.svc.load();
    this.days = this.svc.schedule().map(d => ({ ...d }));
    if (this.days.length) this.slotDuration.set(this.days[0].slotDuration);

    const pref = this.auth.currentUser()?.reminderPreference;
    if (pref) { this.reminderPref.set(pref); this.reminderSelected.set(pref); }

    this.isLoading.set(false);
  }

  async saveReminderPref(): Promise<void> {
    const pref = this.reminderSelected();
    this.reminderSaving.set(true);
    this.reminderMsg.set(null);
    const result = await this.proSvc.saveReminderPreference(pref);
    this.reminderSaving.set(false);
    if (result.success) {
      this.reminderPref.set(pref);
      this.auth.patchUser({ reminderPreference: pref });
      this.reminderMsg.set({ type: 'success', text: 'Preferencia guardada.' });
    } else {
      this.reminderMsg.set({ type: 'error', text: result.message ?? 'Error al guardar.' });
    }
    setTimeout(() => this.reminderMsg.set(null), 3000);
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
