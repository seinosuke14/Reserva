import { Component, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { trigger, style, animate, transition } from '@angular/animations';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

export interface FontOption {
  label: string;
  value: string;
  category: string;
}

export const FONT_OPTIONS: FontOption[] = [
  { label: 'Plus Jakarta Sans', value: 'Plus Jakarta Sans', category: 'Sans-serif' },
  { label: 'Inter',             value: 'Inter',             category: 'Sans-serif' },
  { label: 'Poppins',          value: 'Poppins',          category: 'Sans-serif' },
  { label: 'Montserrat',       value: 'Montserrat',       category: 'Sans-serif' },
  { label: 'Lato',             value: 'Lato',             category: 'Sans-serif' },
  { label: 'Raleway',          value: 'Raleway',          category: 'Sans-serif' },
  { label: 'Nunito',           value: 'Nunito',           category: 'Sans-serif' },
  { label: 'Open Sans',        value: 'Open Sans',        category: 'Sans-serif' },
  { label: 'Playfair Display', value: 'Playfair Display', category: 'Serif' },
  { label: 'Merriweather',     value: 'Merriweather',     category: 'Serif' },
  { label: 'Lora',             value: 'Lora',             category: 'Serif' },
  { label: 'EB Garamond',      value: 'EB Garamond',      category: 'Serif' },
];

@Component({
  selector: 'app-brand-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './brand-editor.component.html',
  styleUrls: ['./brand-editor.component.scss'],
  animations: [
    trigger('fadeUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(12px)' }),
        animate('220ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class BrandEditorComponent {
  private readonly auth = inject(AuthService);
  private readonly http = inject(HttpClient);

  readonly user            = this.auth.currentUser;
  readonly isCompanyMember = computed(() => !!this.auth.currentUser()?.companyId);
  readonly companySlug     = computed(() => this.auth.currentUser()?.companySlug ?? null);
  readonly fontOptions = FONT_OPTIONS;

  // ── Descripción ───────────────────────────────────────────────────────────
  descriptionValue = signal(this.auth.currentUser()?.description ?? '');
  descSaving       = signal(false);
  descMsg          = signal<{ type: 'success' | 'error'; text: string } | null>(null);

  async saveDescription(): Promise<void> {
    const description = this.descriptionValue().trim();
    if (description.length > 200) {
      this.descMsg.set({ type: 'error', text: 'La descripción no puede superar los 200 caracteres.' });
      return;
    }
    this.descSaving.set(true);
    this.descMsg.set(null);
    try {
      const updated: any = await firstValueFrom(
        this.http.put(`${environment.apiUrl}/professionals/profile`, { description })
      );
      this.auth.patchUser({ description: updated.description });
      this.descMsg.set({ type: 'success', text: 'Descripción actualizada correctamente.' });
    } catch (err: any) {
      this.descMsg.set({ type: 'error', text: err?.error?.message ?? 'No se pudo actualizar.' });
    } finally {
      this.descSaving.set(false);
    }
  }

  // ── Nombre Comercial ──────────────────────────────────────────────────────
  slugValue  = signal(this.auth.currentUser()?.slug ?? '');
  slugSaving = signal(false);
  slugMsg    = signal<{ type: 'success' | 'error'; text: string } | null>(null);

  async saveSlug(): Promise<void> {
    const slug = this.slugValue().trim().toLowerCase();
    if (!slug) {
      this.slugMsg.set({ type: 'error', text: 'El nombre comercial no puede estar vacío.' });
      return;
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      this.slugMsg.set({ type: 'error', text: 'Solo letras minúsculas, números y guiones (ej: mi-consulta).' });
      return;
    }
    if (slug === this.auth.currentUser()?.slug) {
      this.slugMsg.set({ type: 'error', text: 'El nombre es el mismo que el actual.' });
      return;
    }
    this.slugSaving.set(true);
    this.slugMsg.set(null);
    try {
      const updated: any = await firstValueFrom(
        this.http.put(`${environment.apiUrl}/professionals/profile`, { slug })
      );
      this.auth.patchUser({ slug: updated.slug });
      this.slugMsg.set({ type: 'success', text: 'Nombre comercial actualizado.' });
    } catch (err: any) {
      this.slugMsg.set({ type: 'error', text: err?.error?.message ?? 'No se pudo actualizar.' });
    } finally {
      this.slugSaving.set(false);
    }
  }

  // ── Banner (Hero) ─────────────────────────────────────────────────────────
  bannerPreview = signal<string | null>(this.auth.currentUser()?.bannerImage ?? null);
  bannerSaving  = signal(false);
  bannerMsg     = signal<{ type: 'success' | 'error'; text: string } | null>(null);

  async onBannerSelect(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    this.bannerPreview.set(URL.createObjectURL(file));
    this.bannerSaving.set(true);
    this.bannerMsg.set(null);

    const formData = new FormData();
    formData.append('image', file);
    try {
      const updated: any = await firstValueFrom(
        this.http.post(`${environment.apiUrl}/professionals/upload/banner`, formData)
      );
      this.auth.patchUser({ bannerImage: updated.bannerImage });
      this.bannerPreview.set(updated.bannerImage);
      this.bannerMsg.set({ type: 'success', text: 'Imagen de portada actualizada.' });
    } catch (err: any) {
      this.bannerPreview.set(this.auth.currentUser()?.bannerImage ?? null);
      this.bannerMsg.set({ type: 'error', text: err?.error?.message ?? 'No se pudo subir la imagen.' });
    } finally {
      this.bannerSaving.set(false);
      (event.target as HTMLInputElement).value = '';
    }
  }

  // ── Fondo ─────────────────────────────────────────────────────────────────
  bgType    = signal<'color' | 'image'>(this.auth.currentUser()?.backgroundType ?? 'color');
  bgColor   = signal<string>(this.auth.currentUser()?.backgroundColor ?? '#f8fafc');
  bgPreview = signal<string | null>(this.auth.currentUser()?.backgroundImage ?? null);
  bgSaving  = signal(false);
  bgMsg     = signal<{ type: 'success' | 'error'; text: string } | null>(null);

  readonly activeBgType = computed(() => this.auth.currentUser()?.backgroundType ?? 'color');

  switchBgType(type: 'color' | 'image'): void {
    this.bgType.set(type);
    this.bgMsg.set(null);
  }

  async activateBgImage(): Promise<void> {
    this.bgSaving.set(true);
    this.bgMsg.set(null);
    try {
      await firstValueFrom(
        this.http.put(`${environment.apiUrl}/professionals/profile`, { backgroundType: 'image' })
      );
      this.auth.patchUser({ backgroundType: 'image' });
      this.bgMsg.set({ type: 'success', text: 'Imagen de fondo activada.' });
    } catch (err: any) {
      this.bgMsg.set({ type: 'error', text: err?.error?.message ?? 'No se pudo activar.' });
    } finally {
      this.bgSaving.set(false);
    }
  }

  async saveBgColor(): Promise<void> {
    this.bgSaving.set(true);
    this.bgMsg.set(null);
    try {
      const updated: any = await firstValueFrom(
        this.http.put(`${environment.apiUrl}/professionals/profile`, {
          backgroundColor: this.bgColor(),
          backgroundType: 'color',
        })
      );
      this.auth.patchUser({ backgroundColor: updated.backgroundColor, backgroundType: 'color' });
      this.bgMsg.set({ type: 'success', text: 'Color de fondo guardado.' });
    } catch (err: any) {
      this.bgMsg.set({ type: 'error', text: err?.error?.message ?? 'No se pudo guardar.' });
    } finally {
      this.bgSaving.set(false);
    }
  }

  async onBgImageSelect(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    this.bgPreview.set(URL.createObjectURL(file));
    this.bgSaving.set(true);
    this.bgMsg.set(null);

    const formData = new FormData();
    formData.append('image', file);
    try {
      const updated: any = await firstValueFrom(
        this.http.post(`${environment.apiUrl}/professionals/upload/background`, formData)
      );
      // Guarda también el backgroundType como 'image'
      await firstValueFrom(
        this.http.put(`${environment.apiUrl}/professionals/profile`, { backgroundType: 'image' })
      );
      this.auth.patchUser({ backgroundImage: updated.backgroundImage, backgroundType: 'image' });
      this.bgPreview.set(updated.backgroundImage);
      this.bgMsg.set({ type: 'success', text: 'Imagen de fondo actualizada.' });
    } catch (err: any) {
      this.bgPreview.set(this.auth.currentUser()?.backgroundImage ?? null);
      this.bgMsg.set({ type: 'error', text: err?.error?.message ?? 'No se pudo subir la imagen.' });
    } finally {
      this.bgSaving.set(false);
      (event.target as HTMLInputElement).value = '';
    }
  }

  // ── Tipografía ────────────────────────────────────────────────────────────
  headingFont = signal<string>(this.auth.currentUser()?.headingFont ?? 'Plus Jakarta Sans');
  bodyFont    = signal<string>(this.auth.currentUser()?.bodyFont    ?? 'Plus Jakarta Sans');
  fontSaving  = signal(false);
  fontMsg     = signal<{ type: 'success' | 'error'; text: string } | null>(null);

  constructor() {
    this._loadFont(this.headingFont());
    this._loadFont(this.bodyFont());
  }

  onHeadingFontChange(value: string): void {
    this.headingFont.set(value);
    this._loadFont(value);
  }

  onBodyFontChange(value: string): void {
    this.bodyFont.set(value);
    this._loadFont(value);
  }

  private _loadFont(family: string): void {
    const id = `gfont-${family.replace(/\s+/g, '-').toLowerCase()}`;
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id   = id;
    link.rel  = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${family.replace(/\s+/g, '+')}:wght@300;400;500;600;700&display=swap`;
    document.head.appendChild(link);
  }

  async saveFonts(): Promise<void> {
    const headingFont = this.headingFont();
    const bodyFont    = this.bodyFont();
    this.fontSaving.set(true);
    this.fontMsg.set(null);
    try {
      await firstValueFrom(
        this.http.put(`${environment.apiUrl}/professionals/profile`, { headingFont, bodyFont })
      );
      this.auth.patchUser({ headingFont, bodyFont });
      this.fontMsg.set({ type: 'success', text: 'Tipografía guardada correctamente.' });
    } catch (err: any) {
      this.fontMsg.set({ type: 'error', text: err?.error?.message ?? 'No se pudo guardar.' });
    } finally {
      this.fontSaving.set(false);
    }
  }

  // ── Computed helpers ──────────────────────────────────────────────────────
  readonly bgPreviewStyle = computed(() => {
    if (this.bgType() === 'image' && this.bgPreview()) {
      return {
        'background-image':    `url(${this.bgPreview()!})`,
        'background-size':     'cover',
        'background-position': 'center',
      } as Record<string, string>;
    }
    return { 'background-color': this.bgColor() } as Record<string, string>;
  });
}
