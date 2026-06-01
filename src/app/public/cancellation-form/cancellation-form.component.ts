import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

type PageState = 'loading' | 'form' | 'submitted' | 'already_used' | 'invalid';

interface CancellationTokenData {
  professional: { name: string; specialty: string; profileImage?: string | null };
  appointment:  { date: string; time: string };
  reviewerName: string | null;
}

@Component({
  selector: 'app-cancellation-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cancellation-form.component.html',
  styleUrl:    './cancellation-form.component.scss',
})
export class CancellationFormComponent implements OnInit {
  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly http   = inject(HttpClient);

  readonly state      = signal<PageState>('loading');
  readonly submitting = signal(false);

  reason = '';
  data: CancellationTokenData | null = null;
  private token = '';

  async ngOnInit(): Promise<void> {
    this.token = this.route.snapshot.paramMap.get('token') ?? '';
    if (!this.token) { this.state.set('invalid'); return; }

    try {
      this.data = await firstValueFrom(
        this.http.get<CancellationTokenData>(`${environment.apiUrl}/public/cancellation-token/${this.token}`)
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
    if (!this.reason.trim() || !this.token) return;
    this.submitting.set(true);
    try {
      await firstValueFrom(
        this.http.post(`${environment.apiUrl}/public/submit-cancellation`, {
          token:  this.token,
          reason: this.reason.trim(),
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

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-ES', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
  }

  goHome(): void {
    this.router.navigate(['/']);
  }
}
