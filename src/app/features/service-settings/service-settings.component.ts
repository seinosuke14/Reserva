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
      const msg = err?.error?.message ?? 'No se pudo actualizar la descripción.';
      this.descMsg.set({ type: 'error', text: msg });
    } finally {
      this.descSaving.set(false);
    }
  }
}
