import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IServiceCategory } from '../../helpers/models';

/**
 * Chips de filtro por categoría de servicios.
 * selected: null = "Todas" | id de categoría | 'none' = "Sin categoría".
 */
@Component({
  selector: 'app-category-filter-chips',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './category-filter-chips.component.html',
  styleUrl: './category-filter-chips.component.css',
})
export class CategoryFilterChipsComponent {
  readonly categories        = input.required<IServiceCategory[]>();
  readonly selected          = input<string | null>(null);
  readonly showUncategorized = input<boolean>(true);

  readonly selectedChange = output<string | null>();

  select(value: string | null): void {
    this.selectedChange.emit(value);
  }
}
