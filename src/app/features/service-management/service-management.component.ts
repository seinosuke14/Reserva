import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { trigger, style, animate, transition } from '@angular/animations';
import { firstValueFrom } from 'rxjs';
import { formatCLP, withVat } from '../../helpers/formatters';
import { IService, IServiceCategory } from '../../helpers/models';
import { environment } from '../../../environments/environment';
import { WorkScheduleService } from '../../core/services/work-schedule.service';
import { AuthService } from '../../core/services/auth.service';
import { CategoryFilterChipsComponent } from '../../components/category-filter-chips/category-filter-chips.component';

@Component({
  selector: 'app-service-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CategoryFilterChipsComponent],
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
  private readonly auth = inject(AuthService);
  readonly formatCLP    = formatCLP;
  readonly withVat      = withVat;

  services       = signal<IService[]>([]);
  readonly activeCount   = computed(() => this.services().filter(s => s.isActive).length);
  readonly inactiveCount = computed(() => this.services().filter(s => !s.isActive).length);
  isFormOpen     = signal(false);
  editingService = signal<IService | null>(null);
  isLoading      = signal(true);
  isSaving       = signal(false);
  errorMsg       = signal<string | null>(null);

  // ── Categorías ──────────────────────────────────────────────────────────────
  readonly maxCategories = 5;
  // Miembro de empresa: las categorías son compartidas y las gestiona la empresa
  readonly isCompanyMember = computed(() => !!this.auth.currentUser()?.companyId);
  categories       = signal<IServiceCategory[]>([]);
  selectedCategory = signal<string | null>(null); // null = Todas | id | 'none'
  isCatModalOpen   = signal(false);
  catSaving        = signal(false);
  catError         = signal<string | null>(null);
  newCatName       = signal('');
  editingCatId     = signal<string | null>(null);
  editingCatName   = signal('');
  deletingCatId    = signal<string | null>(null);

  readonly filteredServices = computed(() => {
    const filter = this.selectedCategory();
    const list = this.services();
    if (filter === null) return list;
    if (filter === 'none') return list.filter(s => !s.categoryId);
    return list.filter(s => s.categoryId === filter);
  });

  imgPreview     = signal<string | null>(null);
  imgFile        = signal<File | null>(null);

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
    categoryId:  [null as string | null],
  });

  get f() { return this.form.controls; }

  async ngOnInit(): Promise<void> {
    await Promise.all([this.loadServices(), this.loadCategories(), this.loadSlotDuration()]);
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

  async loadCategories(): Promise<void> {
    try {
      const res = await firstValueFrom(
        this.http.get<{ categories: IServiceCategory[]; readOnly: boolean }>(`${environment.apiUrl}/service-categories`)
      );
      this.categories.set(res.categories);
    } catch {
      this.categories.set([]);
    }
  }

  // ── Gestión de categorías (solo profesional independiente) ──────────────────

  openCatModal(): void {
    this.catError.set(null);
    this.newCatName.set('');
    this.editingCatId.set(null);
    this.deletingCatId.set(null);
    this.isCatModalOpen.set(true);
  }

  async createCategory(): Promise<void> {
    const name = this.newCatName().trim();
    if (!name || this.catSaving()) return;
    this.catSaving.set(true);
    this.catError.set(null);
    try {
      const created = await firstValueFrom(
        this.http.post<IServiceCategory>(`${environment.apiUrl}/service-categories`, { name })
      );
      this.categories.update(list => [...list, created].sort((a, b) => a.name.localeCompare(b.name)));
      this.newCatName.set('');
    } catch (err: any) {
      this.catError.set(err?.error?.message ?? 'No se pudo crear la categoría.');
    } finally {
      this.catSaving.set(false);
    }
  }

  startEditCategory(cat: IServiceCategory): void {
    this.catError.set(null);
    this.deletingCatId.set(null);
    this.editingCatId.set(cat.id);
    this.editingCatName.set(cat.name);
  }

  async saveCategoryName(): Promise<void> {
    const id = this.editingCatId();
    const name = this.editingCatName().trim();
    if (!id || !name || this.catSaving()) return;
    this.catSaving.set(true);
    this.catError.set(null);
    try {
      const updated = await firstValueFrom(
        this.http.put<IServiceCategory>(`${environment.apiUrl}/service-categories/${id}`, { name })
      );
      this.categories.update(list =>
        list.map(c => c.id === updated.id ? updated : c).sort((a, b) => a.name.localeCompare(b.name))
      );
      // Refrescar el nombre en las cards de servicios
      this.services.update(list =>
        list.map(s => s.categoryId === updated.id ? { ...s, category: updated } : s)
      );
      this.editingCatId.set(null);
    } catch (err: any) {
      this.catError.set(err?.error?.message ?? 'No se pudo actualizar la categoría.');
    } finally {
      this.catSaving.set(false);
    }
  }

  async deleteCategory(id: string): Promise<void> {
    if (this.catSaving()) return;
    this.catSaving.set(true);
    this.catError.set(null);
    try {
      await firstValueFrom(this.http.delete(`${environment.apiUrl}/service-categories/${id}`));
      this.categories.update(list => list.filter(c => c.id !== id));
      // Los servicios asignados quedan sin categoría
      this.services.update(list =>
        list.map(s => s.categoryId === id ? { ...s, categoryId: null, category: null } : s)
      );
      if (this.selectedCategory() === id) this.selectedCategory.set(null);
      if (this.form.value.categoryId === id) this.form.patchValue({ categoryId: null });
      this.deletingCatId.set(null);
    } catch (err: any) {
      this.catError.set(err?.error?.message ?? 'No se pudo eliminar la categoría.');
    } finally {
      this.catSaving.set(false);
    }
  }

  openAddForm(): void {
    this.editingService.set(null);
    this.blocksCount.set(1);
    // Si hay un filtro de categoría activo, el nuevo servicio la hereda por comodidad
    const preselected = this.selectedCategory();
    const categoryId = preselected && preselected !== 'none' ? preselected : null;
    this.form.reset({ duration: this.slotDuration(), price: 0, categoryId });
    this.imgPreview.set(null);
    this.imgFile.set(null);
    this.isFormOpen.set(true);
  }

  openEditForm(service: IService): void {
    this.editingService.set(service);
    const blocks = Math.max(1, Math.round(service.duration / this.slotDuration()));
    this.blocksCount.set(blocks);
    this.form.patchValue({
      ...service,
      price: Number(service.price),
      duration: blocks * this.slotDuration(),
      categoryId: service.categoryId ?? null,
    });
    this.imgPreview.set(service.serviceImage ?? null);
    this.imgFile.set(null);
    this.isFormOpen.set(true);
  }

  onImageSelect(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.imgFile.set(file);
    this.imgPreview.set(URL.createObjectURL(file));
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
      let saved: IService;
      if (editing) {
        saved = await firstValueFrom(
          this.http.put<IService>(`${environment.apiUrl}/services/${editing.id}`, val)
        );
      } else {
        saved = await firstValueFrom(
          this.http.post<IService>(`${environment.apiUrl}/services`, val)
        );
      }

      // Si hay imagen pendiente, subirla ahora que tenemos el ID
      const file = this.imgFile();
      if (file) {
        const formData = new FormData();
        formData.append('image', file);
        saved = await firstValueFrom(
          this.http.post<IService>(`${environment.apiUrl}/services/${saved.id}/upload`, formData)
        );
      }

      if (editing) {
        this.services.update(list => list.map(s => s.id === saved.id ? saved : s));
      } else {
        this.services.update(list => [...list, saved]);
      }
      this.isFormOpen.set(false);
    } catch {
      this.errorMsg.set('No se pudo guardar el servicio.');
    } finally {
      this.isSaving.set(false);
    }
  }
}
