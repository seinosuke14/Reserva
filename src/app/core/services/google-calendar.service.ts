import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export type CalendarScope = 'professional' | 'company';

export interface CalendarStatus {
  connected: boolean;
  accountEmail?: string | null;
  calendarId?: string;
  syncEnabled?: boolean;
  connectedAt?: string;
}

const API_BASE = `${environment.apiUrl}/google-calendar`;

@Injectable({ providedIn: 'root' })
export class GoogleCalendarService {
  private readonly http = inject(HttpClient);

  // Prefijo de ruta según el dueño. El segmento "/company/" es necesario para que
  // el interceptor adjunte el token de empresa en vez del de profesional.
  private base(scope: CalendarScope): string {
    return scope === 'company' ? `${API_BASE}/company` : API_BASE;
  }

  // Estado actual de la conexión. Si falla, se asume desconectado.
  async getStatus(scope: CalendarScope): Promise<CalendarStatus> {
    try {
      return await firstValueFrom(this.http.get<CalendarStatus>(`${this.base(scope)}/status`));
    } catch {
      return { connected: false };
    }
  }

  // URL de consentimiento de Google a la que se redirige al usuario.
  async getConnectUrl(scope: CalendarScope): Promise<string | null> {
    try {
      const res = await firstValueFrom(this.http.get<{ url: string }>(`${this.base(scope)}/connect-url`));
      return res.url ?? null;
    } catch {
      return null;
    }
  }

  // Activa o pausa la sincronización sin perder la conexión.
  async setSync(scope: CalendarScope, enabled: boolean): Promise<{ success: boolean; syncEnabled?: boolean; message?: string }> {
    try {
      const res = await firstValueFrom(
        this.http.put<{ syncEnabled: boolean }>(`${this.base(scope)}/sync`, { enabled }),
      );
      return { success: true, syncEnabled: res.syncEnabled };
    } catch (err: any) {
      return { success: false, message: err?.error?.message ?? 'No se pudo actualizar la sincronización.' };
    }
  }

  // Desconecta la cuenta de Google (borra los tokens guardados).
  async disconnect(scope: CalendarScope): Promise<{ success: boolean; message?: string }> {
    const url = scope === 'company' ? `${API_BASE}/company/connection` : API_BASE;
    try {
      await firstValueFrom(this.http.delete(url));
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err?.error?.message ?? 'No se pudo desconectar.' };
    }
  }
}
