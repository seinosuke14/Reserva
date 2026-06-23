import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MetaPixelService } from '../../core/services/meta-pixel.service';

type SurveyState = 'form' | 'submitted' | 'skipped' | 'already_rated' | 'error';

@Component({
  selector: 'app-satisfaction-survey',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './satisfaction-survey.component.html',
  styleUrl:    './satisfaction-survey.component.scss',
})
export class SatisfactionSurveyComponent implements OnInit {
  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly http   = inject(HttpClient);
  private readonly pixel  = inject(MetaPixelService);

  readonly state          = signal<SurveyState>('form');
  readonly hoveredStar    = signal(0);
  readonly selectedRating = signal(0);
  readonly submitting     = signal(false);

  readonly stars = [1, 2, 3, 4, 5];
  comment  = '';
  private appointmentId = '';

  ngOnInit(): void {
    this.appointmentId = this.route.snapshot.queryParamMap.get('appointmentId') ?? '';
    if (!this.appointmentId) {
      this.state.set('error');
    }
  }

  async submit(): Promise<void> {
    if (!this.selectedRating() || !this.appointmentId) return;
    this.submitting.set(true);
    try {
      await firstValueFrom(
        this.http.post(`${environment.apiUrl}/public/rate`, {
          appointmentId: this.appointmentId,
          rating:        this.selectedRating(),
          comment:       this.comment.trim() || null,
        })
      );
      this.state.set('submitted');
      // Completó la encuesta de satisfacción (con su valoración). Métrica de engagement.
      this.pixel.track('SubmitSurvey', { rating: this.selectedRating() });
    } catch (err: any) {
      if (err?.error?.message?.includes('Ya valoraste')) {
        this.state.set('already_rated');
      } else {
        this.state.set('submitted');
      }
    } finally {
      this.submitting.set(false);
    }
  }

  get commentQuestion(): string {
    const r = this.selectedRating();
    if (r === 0) return '';
    if (r === 1) return '¿Qué es lo que no te gustó de nuestro servicio?';
    if (r === 2) return '¿Qué mejorarías del proceso? ¿Sentiste que algún paso funcionó de pésima forma?';
    if (r === 3) return '¿Qué deberíamos cambiar para mejorar tu experiencia?';
    if (r === 4) return '¿Qué nos faltó para que tu experiencia fuera perfecta?';
    return '¿Te gustaría que mejoráramos algo más?';
  }

  get commentPlaceholder(): string {
    const r = this.selectedRating();
    if (r === 1) return 'Cuéntanos qué no te gustó...';
    if (r === 2) return 'Cuéntanos qué salió mal...';
    if (r === 3) return 'Cuéntanos qué cambiarías...';
    if (r === 4) return 'Cuéntanos qué nos faltó...';
    return 'Cuéntanos tu opinión...';
  }

  skip(): void {
    this.state.set('skipped');
  }

  goHome(): void {
    this.router.navigate(['/']);
  }
}
