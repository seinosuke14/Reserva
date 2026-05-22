import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { trigger, style, animate, transition } from '@angular/animations';
import { QuoteService, IQuoteRequest } from '../../core/services/quote.service';
import { formatCLP } from '../../helpers/formatters';

type LoadState = 'loading' | 'ready' | 'error';
type FilterTab = 'all' | 'pending' | 'reviewed' | 'booked';

@Component({
  selector: 'app-quotes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './quotes.component.html',
  styleUrl: './quotes.component.scss',
  animations: [
    trigger('modalAnim', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.95) translateY(16px)' }),
        animate('180ms ease-out', style({ opacity: 1, transform: 'scale(1) translateY(0)' }))
      ]),
      transition(':leave', [
        animate('140ms ease-in', style({ opacity: 0, transform: 'scale(0.95) translateY(16px)' }))
      ])
    ]),
    trigger('backdrop', [
      transition(':enter', [style({ opacity: 0 }), animate('180ms', style({ opacity: 1 }))]),
      transition(':leave', [animate('140ms', style({ opacity: 0 }))])
    ]),
  ]
})
export class QuotesComponent implements OnInit {
  private readonly quoteSvc = inject(QuoteService);
  private readonly fb       = inject(FormBuilder);
  readonly formatCLP        = formatCLP;

  readonly loadState    = signal<LoadState>('loading');
  readonly quotes       = signal<IQuoteRequest[]>([]);
  readonly activeTab    = signal<FilterTab>('all');
  readonly selectedQuote = signal<IQuoteRequest | null>(null);
  readonly isResponding  = signal(false);
  readonly respondSuccess = signal(false);

  readonly pendingCount  = computed(() => this.quotes().filter(q => q.status === 'pending').length);

  readonly filteredQuotes = computed(() => {
    const tab = this.activeTab();
    const all = this.quotes();
    if (tab === 'all') return all;
    return all.filter(q => q.status === tab);
  });

  readonly responseForm = this.fb.group({
    estimatedPrice:    [null as number | null, [Validators.required, Validators.min(1)]],
    estimatedDuration: [null as number | null, [Validators.required, Validators.min(15)]],
    professionalNotes: ['', Validators.maxLength(500)],
  });

  get rf() { return this.responseForm.controls; }

  async ngOnInit(): Promise<void> {
    await this._loadQuotes();
  }

  private async _loadQuotes(): Promise<void> {
    try {
      const quotes = await this.quoteSvc.getQuotes();
      this.quotes.set(quotes);
      this.loadState.set('ready');
    } catch {
      this.loadState.set('error');
    }
  }

  openQuote(quote: IQuoteRequest): void {
    this.selectedQuote.set(quote);
    this.respondSuccess.set(false);
    if (quote.status === 'reviewed' && quote.estimatedPrice && quote.estimatedDuration) {
      this.responseForm.patchValue({
        estimatedPrice:    quote.estimatedPrice,
        estimatedDuration: quote.estimatedDuration,
        professionalNotes: quote.professionalNotes ?? '',
      });
    } else {
      this.responseForm.reset();
    }
  }

  closeModal(): void {
    this.selectedQuote.set(null);
    this.respondSuccess.set(false);
  }

  async sendResponse(): Promise<void> {
    if (this.responseForm.invalid) { this.responseForm.markAllAsTouched(); return; }
    const quote = this.selectedQuote();
    if (!quote) return;

    this.isResponding.set(true);
    try {
      const v = this.responseForm.value;
      await this.quoteSvc.respondQuote(quote.id, {
        estimatedPrice:    v.estimatedPrice!,
        estimatedDuration: v.estimatedDuration!,
        professionalNotes: v.professionalNotes ?? '',
      });
      // Actualizar la cotización en el listado local
      this.quotes.update(list => list.map(q =>
        q.id === quote.id
          ? { ...q, status: 'reviewed' as const, estimatedPrice: v.estimatedPrice!, estimatedDuration: v.estimatedDuration!, professionalNotes: v.professionalNotes ?? null }
          : q
      ));
      this.selectedQuote.update(q => q ? { ...q, status: 'reviewed', estimatedPrice: v.estimatedPrice!, estimatedDuration: v.estimatedDuration! } : q);
      this.respondSuccess.set(true);
    } catch (err: any) {
      alert(err?.error?.message ?? 'No se pudo enviar la respuesta.');
    } finally {
      this.isResponding.set(false);
    }
  }

  durationLabel(minutes: number | null): string {
    if (!minutes) return '—';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0 && m > 0) return `${h}h ${m}min`;
    if (h > 0) return `${h}h`;
    return `${m}min`;
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      pending:  'Pendiente',
      reviewed: 'Respondida',
      booked:   'Agendada',
      expired:  'Expirada',
    };
    return map[status] ?? status;
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
