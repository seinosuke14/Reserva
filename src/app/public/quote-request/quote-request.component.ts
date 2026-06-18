import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { QuoteService } from '../../core/services/quote.service';
import { MetaPixelService } from '../../core/services/meta-pixel.service';
import { chileanPhoneValidator, strictEmailValidator } from '../../core/validators/custom-validators';
import { environment } from '../../../environments/environment';

type PageState = 'loading' | 'ready' | 'submitting' | 'success' | 'error';

const TATTOO_STYLES = [
  'Realismo', 'Blackwork', 'Tradicional', 'Neo-tradicional',
  'Japonés', 'Acuarela', 'Geométrico', 'Minimalista',
  'Tribal', 'Lettering', 'Trash Polka', 'Otro',
];

const BODY_PARTS = [
  'Antebrazo', 'Brazo completo', 'Hombro', 'Pecho', 'Espalda',
  'Costado', 'Pierna', 'Pantorrilla', 'Cuello', 'Mano', 'Pie',
  'Cabeza', 'Otro',
];

@Component({
  selector: 'app-quote-request',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './quote-request.component.html',
  styleUrl: './quote-request.component.scss',
})
export class QuoteRequestComponent implements OnInit {
  private readonly fb       = inject(FormBuilder);
  private readonly route    = inject(ActivatedRoute);
  private readonly router   = inject(Router);
  private readonly http     = inject(HttpClient);
  private readonly quoteSvc = inject(QuoteService);
  private readonly pixel    = inject(MetaPixelService);

  readonly pageState      = signal<PageState>('loading');
  readonly professional   = signal<{ name: string; slug: string; profileImage?: string | null } | null>(null);
  readonly submittedRef   = signal('');
  readonly imgPreview     = signal<string | null>(null);
  readonly tattooStyles   = TATTOO_STYLES;
  readonly bodyParts      = BODY_PARTS;

  private imgFile: File | null = null;
  private slug = '';

  readonly form = this.fb.group({
    customerName:       ['', [Validators.required, Validators.minLength(3), Validators.maxLength(60)]],
    customerEmail:      ['', [Validators.required, Validators.maxLength(254), strictEmailValidator]],
    customerPhone:      ['+569', [Validators.required, chileanPhoneValidator]],
    designDescription:  ['', [Validators.required, Validators.minLength(10), Validators.maxLength(1000)]],
    tattooStyle:        ['', Validators.required],
    widthCm:            [null as number | null, [Validators.min(0.5), Validators.max(100)]],
    heightCm:           [null as number | null, [Validators.min(0.5), Validators.max(100)]],
    bodyPart:           ['', Validators.required],
    additionalNotes:    ['', Validators.maxLength(500)],
  });

  get f() { return this.form.controls; }

  async ngOnInit(): Promise<void> {
    this.slug = this.route.snapshot.paramMap.get('slug') ?? '';
    if (!this.slug) { this.router.navigate(['/']); return; }
    await this._loadProfessional();
  }

  private async _loadProfessional(): Promise<void> {
    try {
      const data: any = await firstValueFrom(
        this.http.get(`${environment.apiUrl}/public/professionals/${this.slug}`)
      );
      if (!data.professional?.requiresQuote) {
        this.router.navigate(['/reservar', this.slug], { replaceUrl: true });
        return;
      }
      this.professional.set({
        name:         data.professional.name,
        slug:         data.professional.slug,
        profileImage: data.professional.profileImage,
      });
      this.pageState.set('ready');
    } catch {
      this.pageState.set('error');
    }
  }

  onImageChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.imgFile = file;
    const reader = new FileReader();
    reader.onload = e => this.imgPreview.set(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  removeImage(): void {
    this.imgFile = null;
    this.imgPreview.set(null);
  }

  onPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').replace(/^569/, '');
    const formatted = '+569' + digits.slice(0, 8);
    this.f['customerPhone'].setValue(formatted, { emitEvent: true });
    input.value = formatted;
  }

  async submit(): Promise<void> {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    this.pageState.set('submitting');
    try {
      const fd = new FormData();
      fd.append('slug', this.slug);
      const v = this.form.value;
      fd.append('customerName',      v.customerName!);
      fd.append('customerEmail',     v.customerEmail!);
      fd.append('customerPhone',     v.customerPhone!);
      fd.append('designDescription', v.designDescription!);
      fd.append('tattooStyle',       v.tattooStyle!);
      fd.append('bodyPart',          v.bodyPart!);
      if (v.widthCm  != null) fd.append('widthCm',  String(v.widthCm));
      if (v.heightCm != null) fd.append('heightCm', String(v.heightCm));
      if (v.additionalNotes) fd.append('additionalNotes', v.additionalNotes);
      if (this.imgFile) fd.append('image', this.imgFile);

      const res = await this.quoteSvc.submitQuote(this.slug, fd);
      this.submittedRef.set(res.quoteRef);
      this.pageState.set('success');

      // Cotización enviada → evento de conversión Lead (Meta Pixel).
      this.pixel.track('Lead');
    } catch (err: any) {
      alert(err?.error?.message ?? 'No se pudo enviar la cotización. Intenta de nuevo.');
      this.pageState.set('ready');
    }
  }
}
