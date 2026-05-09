import { Component, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { trigger, style, animate, transition } from '@angular/animations';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.component.html',
  animations: [
    trigger('fadeUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(12px)' }),
        animate('220ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class ProfileComponent {
  private readonly auth = inject(AuthService);
  private readonly http = inject(HttpClient);

  readonly user = this.auth.currentUser;

  readonly userInitials = computed(() => {
    const name = this.user()?.name ?? '';
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'P';
  });

  // ── Descripción ─────────────────────────────────────────────────────────────
  descriptionValue = signal(this.auth.currentUser()?.description ?? '');
  descSaving       = signal(false);
  descMsg          = signal<{ type: 'success' | 'error'; text: string } | null>(null);

  async saveDescription(): Promise<void> {
    const description = this.descriptionValue().trim();
    if (description.length > 200) {
      this.descMsg.set({ type: 'error', text: 'La descripción no puede superar los 200 caracteres.' }); return;
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

  // ── Slug ────────────────────────────────────────────────────────────────────
  slugValue   = signal(this.auth.currentUser()?.slug ?? '');
  slugSaving  = signal(false);
  slugMsg     = signal<{ type: 'success' | 'error'; text: string } | null>(null);

  async saveSlug(): Promise<void> {
    const slug = this.slugValue().trim().toLowerCase();
    if (!slug) { this.slugMsg.set({ type: 'error', text: 'El slug no puede estar vacío.' }); return; }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      this.slugMsg.set({ type: 'error', text: 'Solo letras minúsculas, números y guiones (ej: mi-consulta).' }); return;
    }
    if (slug === this.auth.currentUser()?.slug) {
      this.slugMsg.set({ type: 'error', text: 'El slug es el mismo que el actual.' }); return;
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

  // ── Contraseña ──────────────────────────────────────────────────────────────
  pwCurrent  = signal('');
  pwNew      = signal('');
  pwConfirm  = signal('');
  pwSaving   = signal(false);
  pwMsg      = signal<{ type: 'success' | 'error'; text: string } | null>(null);

  async changePassword(): Promise<void> {
    const current = this.pwCurrent().trim();
    const newPw   = this.pwNew().trim();
    const confirm = this.pwConfirm().trim();

    if (!current || !newPw || !confirm) {
      this.pwMsg.set({ type: 'error', text: 'Completa todos los campos.' }); return;
    }
    if (newPw !== confirm) {
      this.pwMsg.set({ type: 'error', text: 'Las contraseñas no coinciden.' }); return;
    }
    if (!/^(?=.*[A-Z])(?=.*\d).{6,16}$/.test(newPw)) {
      this.pwMsg.set({ type: 'error', text: 'Entre 6 y 16 caracteres, 1 mayúscula y 1 número.' }); return;
    }

    this.pwSaving.set(true);
    this.pwMsg.set(null);
    const result = await this.auth.changePassword(current, newPw);
    this.pwSaving.set(false);
    if (result.success) {
      this.pwCurrent.set(''); this.pwNew.set(''); this.pwConfirm.set('');
      this.pwMsg.set({ type: 'success', text: 'Contraseña actualizada correctamente.' });
    } else {
      this.pwMsg.set({ type: 'error', text: result.message });
    }
  }
}
