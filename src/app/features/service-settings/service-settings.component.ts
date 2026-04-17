import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-service-settings',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './service-settings.component.html',
})
export class ServiceSettingsComponent {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  // Slug
  slugValue      = signal(this.auth.currentUser()?.slug ?? '');
  slugSaving     = signal(false);
  slugMsg        = signal<{ type: 'success' | 'error'; text: string } | null>(null);

  // Descripción
  descriptionValue = signal(this.auth.currentUser()?.description ?? '');
  descSaving       = signal(false);
  descMsg          = signal<{ type: 'success' | 'error'; text: string } | null>(null);

  async saveSlug(): Promise<void> {
    const slug = this.slugValue().trim().toLowerCase();
    if (!slug) { this.slugMsg.set({ type: 'error', text: 'El slug no puede estar vacío.' }); return; }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      this.slugMsg.set({ type: 'error', text: 'Solo letras minúsculas, números y guiones (ej: mi-consulta).' });
      return;
    }
    if (slug === this.auth.currentUser()?.slug) {
      this.slugMsg.set({ type: 'error', text: 'El slug es el mismo que el actual.' });
      return;
    }

    this.slugSaving.set(true);
    this.slugMsg.set(null);
    try {
      const updated: any = await firstValueFrom(
        this.http.put(`${environment.apiUrl}/professionals/profile`, { slug })
      );
      this.auth.patchUser({ slug: updated.slug });
      this.slugMsg.set({ type: 'success', text: 'Slug actualizado correctamente.' });
    } catch (err: any) {
      const msg = err?.error?.message ?? 'No se pudo actualizar el slug.';
      this.slugMsg.set({ type: 'error', text: msg });
    } finally {
      this.slugSaving.set(false);
    }
  }

  async saveDescription(): Promise<void> {
    const description = this.descriptionValue().trim();
    if (description.length > 500) {
      this.descMsg.set({ type: 'error', text: 'La descripción no puede superar los 500 caracteres.' });
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
      const msg = err?.error?.message ?? 'No se pudo actualizar la descripción.';
      this.descMsg.set({ type: 'error', text: msg });
    } finally {
      this.descSaving.set(false);
    }
  }
}
