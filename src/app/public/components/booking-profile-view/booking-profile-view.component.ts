import { Component, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IPublicService, IServiceCategory } from '../../../helpers/models';
import { formatCLP, withVat } from '../../../helpers/formatters';
import { CategoryFilterChipsComponent } from '../../../components/category-filter-chips/category-filter-chips.component';

export interface IProfileProfessional {
  id: string; name: string; slug: string; specialty: string; phone: string;
  description?:     string;
  ratingAvg?:       number;
  ratingCount?:     number;
  requiresQuote?:   boolean;
  profileImage?:    string | null;
  bannerImage?:     string | null;
}

export interface IPublicReview {
  id:           string;
  rating:       number;
  comment:      string | null;
  reviewerName: string | null;
  createdAt:    string;
}

@Component({
  selector: 'app-booking-profile-view',
  standalone: true,
  imports: [CommonModule, CategoryFilterChipsComponent],
  templateUrl: './booking-profile-view.component.html',
  styleUrl: './booking-profile-view.component.scss'
})
export class BookingProfileViewComponent {
  professional    = input.required<IProfileProfessional | null>();
  services        = input.required<IPublicService[]>();
  categories      = input<IServiceCategory[]>([]);
  reviews         = input<IPublicReview[]>([]);
  isQuoteMode     = input<boolean>(false);
  headingStyle    = input<Record<string, string>>({});
  bodyStyle       = input<Record<string, string>>({});
  scheduleSummary = input<string>('');
  isAuthenticated = input<boolean>(false);

  serviceSelected = output<IPublicService>();
  quoteRequested  = output<void>();
  loginClicked    = output<void>();
  logoutClicked   = output<void>();

  readonly stars     = [1, 2, 3, 4, 5];
  readonly formatCLP = formatCLP;
  readonly withVat = withVat;

  // ── Filtro por categoría ──
  readonly selectedCategory = signal<string | null>(null);

  // Solo categorías con al menos un servicio asignado
  readonly usedCategories = computed(() =>
    this.categories().filter(c => this.services().some(s => s.categoryId === c.id))
  );

  // Chip "Sin categoría" solo si hay servicios sin asignar (y existen categorías en uso)
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

  reviewStars(rating: number): number[] {
    return [1, 2, 3, 4, 5];
  }

  formatReviewDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' });
  }
}
