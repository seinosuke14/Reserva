import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

type PageState = 'loading' | 'form' | 'submitted' | 'already_used' | 'invalid';

interface ReviewTokenData {
  professional: { name: string; specialty: string; profileImage?: string | null };
  appointment:  { date: string; time: string };
  reviewerName: string | null;
}

@Component({
  selector: 'app-professional-rating',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './professional-rating.component.html',
  styleUrl:    './professional-rating.component.scss',
})
export class ProfessionalRatingComponent implements OnInit {
  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly http   = inject(HttpClient);

  readonly state       = signal<PageState>('loading');
  readonly hoveredStar = signal(0);
  readonly selectedRating = signal(0);
  readonly submitting  = signal(false);

  readonly stars = [1, 2, 3, 4, 5];
  comment  = '';
  data: ReviewTokenData | null = null;
  private token = '';

  async ngOnInit(): Promise<void> {
    this.token = this.route.snapshot.paramMap.get('token') ?? '';
    if (!this.token) { this.state.set('invalid'); return; }

    try {
      this.data = await firstValueFrom(
        this.http.get<ReviewTokenData>(`${environment.apiUrl}/public/review-token/${this.token}`)
      );
      this.state.set('form');
    } catch (err: any) {
      if (err?.status === 410) {
        this.state.set('already_used');
      } else {
        this.state.set('invalid');
      }
    }
  }

  async submit(): Promise<void> {
    if (!this.selectedRating() || !this.token) return;
    this.submitting.set(true);
    try {
      await firstValueFrom(
        this.http.post(`${environment.apiUrl}/public/rate-professional`, {
          token:   this.token,
          rating:  this.selectedRating(),
          comment: this.comment.trim() || null,
        })
      );
      this.state.set('submitted');
    } catch (err: any) {
      if (err?.status === 410) {
        this.state.set('already_used');
      } else {
        this.state.set('submitted');
      }
    } finally {
      this.submitting.set(false);
    }
  }

  get ratingLabel(): string {
    const labels = ['', 'Muy malo', 'Malo', 'Regular', 'Bueno', 'Excelente'];
    return labels[this.selectedRating()] ?? '';
  }

  goHome(): void {
    this.router.navigate(['/']);
  }
}
