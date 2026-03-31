import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { inject } from '@angular/core';
import { trigger, style, animate, transition } from '@angular/animations';
import { IService, MOCK_SERVICES } from '../../data/mock-services';
import { formatCLP } from '../../helpers/formatters';

@Component({
  selector: 'app-service-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './service-settings.component.html',
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
export class ServiceSettingsComponent {
  private readonly fb = inject(FormBuilder);
  readonly formatCLP = formatCLP;

  services       = signal<IService[]>([...MOCK_SERVICES]);
  isFormOpen     = signal(false);
  editingService = signal<IService | null>(null);

  form = this.fb.group({
    name:        ['', [Validators.required, Validators.minLength(3)]],
    description: ['', Validators.required],
    duration:    [30, [Validators.required, Validators.min(15)]],
    price:       [0,  [Validators.required, Validators.min(1000)]],
  });

  get f() { return this.form.controls; }

  openAddForm() {
    this.editingService.set(null);
    this.form.reset({ duration: 30, price: 0 });
    this.isFormOpen.set(true);
  }

  openEditForm(service: IService) {
    this.editingService.set(service);
    this.form.patchValue(service);
    this.isFormOpen.set(true);
  }

  deleteService(id: string) {
    this.services.update(list => list.filter(s => s.id !== id));
  }

  toggleStatus(id: string) {
    this.services.update(list => list.map(s => s.id === id ? { ...s, isActive: !s.isActive } : s));
  }

  handleSubmit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const val = this.form.value;
    const editing = this.editingService();
    if (editing) {
      this.services.update(list => list.map(s => s.id === editing.id ? { ...s, ...val } as IService : s));
    } else {
      const newService: IService = { id: Date.now().toString(), isActive: true, ...val } as IService;
      this.services.update(list => [...list, newService]);
    }
    this.isFormOpen.set(false);
  }
}