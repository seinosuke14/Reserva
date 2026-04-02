import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { trigger, style, animate, transition } from '@angular/animations';
import { ScheduleBlockService } from '../../core/services/schedule-block.service';

@Component({
  selector: 'app-schedule-blocker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './schedule-blocker.component.html',
  animations: [
    trigger('modalAnim', [
      transition(':enter', [style({ opacity: 0, transform: 'scale(0.95) translateY(20px)' }), animate('200ms ease-out', style({ opacity: 1, transform: 'scale(1) translateY(0)' }))]),
      transition(':leave', [animate('150ms ease-in', style({ opacity: 0, transform: 'scale(0.95) translateY(20px)' }))])
    ]),
    trigger('backdrop', [
      transition(':enter', [style({ opacity: 0 }), animate('200ms', style({ opacity: 1 }))]),
      transition(':leave', [animate('150ms', style({ opacity: 0 }))])
    ]),
    trigger('cardAnim', [
      transition(':enter', [style({ opacity: 0, transform: 'scale(0.95)' }), animate('200ms', style({ opacity: 1, transform: 'scale(1)' }))]),
      transition(':leave', [animate('150ms', style({ opacity: 0, transform: 'scale(0.95)' }))])
    ])
  ]
})
export class ScheduleBlockerComponent implements OnInit {
  readonly svc = inject(ScheduleBlockService);

  isModalOpen = signal(false);
  isSaving    = signal(false);
  isRemoving  = signal<string | null>(null);
  error       = signal('');

  startDate = signal('');
  startTime = signal('');
  endDate   = signal('');
  endTime   = signal('');
  reason    = signal('');

  async ngOnInit(): Promise<void> {
    await this.svc.load();
  }

  openModal()  { this.isModalOpen.set(true); this.error.set(''); }
  closeModal() { this.isModalOpen.set(false); this.resetForm(); }

  private resetForm(): void {
    this.startDate.set(''); this.startTime.set('');
    this.endDate.set('');   this.endTime.set('');
    this.reason.set('');    this.error.set('');
  }

  async handleAdd(): Promise<void> {
    if (!this.startDate() || !this.startTime() || !this.endDate() || !this.endTime()) {
      this.error.set('Por favor completa todas las fechas y horas.');
      return;
    }
    const start = new Date(`${this.startDate()}T${this.startTime()}`);
    const end   = new Date(`${this.endDate()}T${this.endTime()}`);
    if (end <= start) {
      this.error.set('La fecha/hora de fin debe ser posterior al inicio.');
      return;
    }

    this.isSaving.set(true);
    try {
      await this.svc.add({
        startDate: this.startDate(),
        startTime: this.startTime(),
        endDate:   this.endDate(),
        endTime:   this.endTime(),
        reason:    this.reason() || undefined,
      });
      this.closeModal();
    } catch {
      this.error.set('No se pudo guardar el bloqueo. Intenta de nuevo.');
    } finally {
      this.isSaving.set(false);
    }
  }

  async handleRemove(id: string): Promise<void> {
    this.isRemoving.set(id);
    try {
      await this.svc.remove(id);
    } catch {
      // Si falla, el item permanece visible
    } finally {
      this.isRemoving.set(null);
    }
  }
}
