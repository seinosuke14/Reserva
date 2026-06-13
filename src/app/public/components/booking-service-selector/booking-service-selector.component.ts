import { Component, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { formatCLP, withVat } from '../../../helpers/formatters';
import { IPublicService, IServiceCategory } from '../../../helpers/models';
import { CategoryFilterChipsComponent } from '../../../components/category-filter-chips/category-filter-chips.component';

@Component({
  selector: 'app-booking-service-selector',
  standalone: true,
  imports: [CommonModule, CategoryFilterChipsComponent],
  templateUrl: './booking-service-selector.component.html',
  styleUrl: './booking-service-selector.component.scss'
})
export class BookingServiceSelectorComponent {
  readonly services = input<IPublicService[]>([]);
  readonly categories = input<IServiceCategory[]>([]);
  readonly selectedService = input<IPublicService | null>(null);
  readonly serviceSelected = output<IPublicService>();
  readonly formatCLP = formatCLP;
  readonly withVat = withVat;

  readonly selectedCategory = signal<string | null>(null);

  // Solo categorías con al menos un servicio asignado
  readonly usedCategories = computed(() =>
    this.categories().filter(c => this.services().some(s => s.categoryId === c.id))
  );

  // Chip "Sin categoría" solo si hay servicios sin asignar (y existen categorías)
  readonly hasUncategorized = computed(() =>
    this.usedCategories().length > 0 && this.services().some(s => !s.categoryId)
  );

  readonly filteredServices = computed(() => {
    const filter = this.selectedCategory();
    const list = this.services();
    if (filter === null) return list;
    if (filter === 'none') return list.filter(s => !s.categoryId);
    return list.filter(s => s.categoryId === filter);
  });

  onServiceSelect(service: IPublicService): void {
    this.serviceSelected.emit(service);
  }
}
