import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IPublicService } from '../../../helpers/models';
import { formatCLP, withVat } from '../../../helpers/formatters';

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
  imports: [CommonModule],
  templateUrl: './booking-profile-view.component.html',
  styleUrl: './booking-profile-view.component.scss'
})
export class BookingProfileViewComponent {
  professional    = input.required<IProfileProfessional | null>();
  services        = input.required<IPublicService[]>();
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

  reviewStars(rating: number): number[] {
    return [1, 2, 3, 4, 5];
  }

  formatReviewDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' });
  }
}
