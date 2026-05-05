import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { trigger, style, animate, transition } from '@angular/animations';
import { firstValueFrom } from 'rxjs';
import { formatCLP } from '../../helpers/formatters';
import { IService } from '../../helpers/models';
import { environment } from '../../../environments/environment';
import { WorkScheduleService } from '../../core/services/work-schedule.service';

@Component({
  selector: 'app-service-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './service-management.component.html',
  animations: [
    trigger('modalAnim', [
      transition(':enter', [style({ opacity: 0, transform: 'scale(0.9) translateY(20px)' }), animate('200ms ease-out', style({ opacity: 1, transform: 'scale(1) translateY(0)' }))]),
      transition(':leave', [animate('150ms ease-in', style({ opacity: 0, transform: 'scale(0.9) translateY(20px)' }))])
    ]),
    trigger('backdrop', [
      transition(':enter', [style({ opacity: 0 }), animate('200ms', style({ opacity: 1 }))]),
      transition(':leave', [animate('150ms', style({ opacity: 0 }))])
    ]),
    trigger('cardAnim', [
      transition(':enter', [style({ opacity: 0, transform: 'scale(0.95)' }), animate('200ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))]),
      transition(':leave', [animate('150ms ease-in', style({ opacity: 0, transform: 'scale(0.95)' }))])
    ])
  ]
})
export class ServiceManagementComponent implements OnInit {
  private readonly fb   = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly scheduleSvc = inject(WorkScheduleService);
  readonly formatCLP    = formatCLP;

  services       = signal<IService[]>([]);
  readonly activeCount   = computed(() => this.services().filter(s => s.isActive).length);
  readonly inactiveCount = computed(() => this.services().filter(s => !s.isActive).length);
  isFormOpen     = signal(false);
  editingService = signal<IService | null>(null);
  isLoading      = signal(true);
  isSaving       = signal(false);
  errorMsg       = signal<string | null>(null);

  slotDuration   = signal(30);
  blocksCount    = signal(1);
  readonly maxBlocks = 8;
  readonly blockOptions = Array.from({ length: this.maxBlocks }, (_, i) => i + 1);

  readonly durationMinutes = computed(() => this.blocksCount() * this.slotDuration());

  form = this.fb.group({
    name:        ['', [Validators.required, Validators.minLength(3)]],
    description: ['', Validators.required],
    duration:    [30, [Validators.required, Validators.min(1)]],
    price:       [0,  [Validators.required, Validators.min(1000)]],
  });

  get f() { return this.form.controls; }

  async ngOnInit(): Promise<void> {
    await Promise.all([this.loadServices(), this.loadSlotDuration()]);
  }

  private async loadSlotDuration(): Promise<void> {
    if (!this.scheduleSvc.isLoaded()) {
      await this.scheduleSvc.load();
    }
    const schedule = this.scheduleSvc.schedule();
    if (schedule.length) {
      this.slotDuration.set(schedule[0].slotDuration || 30);
    }
  }

  setBlocks(n: number): void {
    this.blocksCount.set(n);
    this.form.controls['duration'].setValue(n * this.slotDuration());
  }

  async loadServices(): Promise<void> {
    this.isLoading.set(true);
    try {
      const data = await firstValueFrom(
        this.http.get<IService[]>(`${environment.apiUrl}/services`)
      );
      this.services.set(data);
    } catch {
      this.errorMsg.set('No se pudieron cargar los servicios.');
    } finally {
      this.isLoading.set(false);
    }
  }

  openAddForm(): void {
    this.editingService.set(null);
    this.blocksCount.set(1);
    this.form.reset({ duration: this.slotDuration(), price: 0 });
    this.isFormOpen.set(true);
  }

  openEditForm(service: IService): void {
    this.editingService.set(service);
    const blocks = Math.max(1, Math.round(service.duration / this.slotDuration()));
    this.blocksCount.set(blocks);
    this.form.patchValue({ ...service, duration: blocks * this.slotDuration() });
    this.isFormOpen.set(true);
  }

  async deleteService(id: string): Promise<void> {
    try {
      await firstValueFrom(this.http.delete(`${environment.apiUrl}/services/${id}`));
      this.services.update(list => list.filter(s => s.id !== id));
    } catch {
      this.errorMsg.set('No se pudo eliminar el servicio.');
    }
  }

  async toggleStatus(service: IService): Promise<void> {
    try {
      const updated = await firstValueFrom(
        this.http.put<IService>(`${environment.apiUrl}/services/${service.id}`, {
          isActive: !service.isActive
        })
      );
      this.services.update(list => list.map(s => s.id === updated.id ? updated : s));
    } catch {
      this.errorMsg.set('No se pudo actualizar el estado.');
    }
  }

  async handleSubmit(): Promise<void> {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.isSaving.set(true);
    const val = this.form.value;
    const editing = this.editingService();

    try {
      if (editing) {
        const updated = await firstValueFrom(
          this.http.put<IService>(`${environment.apiUrl}/services/${editing.id}`, val)
        );
        this.services.update(list => list.map(s => s.id === updated.id ? updated : s));
      } else {
        const created = await firstValueFrom(
          this.http.post<IService>(`${environment.apiUrl}/services`, val)
        );
        this.services.update(list => [...list, created]);
      }
      this.isFormOpen.set(false);
    } catch {
      this.errorMsg.set('No se pudo guardar el servicio.');
    } finally {
      this.isSaving.set(false);
    }
  }
}
