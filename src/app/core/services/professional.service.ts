import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { blobErrorMessage } from '../../helpers/http-errors';

export type PlanType = 'free' | 'basic' | 'pro' | 'team' | 'pro_max';
export type SubscriptionStatus = 'active' | 'suspended' | 'expired';

export interface IProfessional {
  id?: string;
  name: string;
  rut?: string;
  specialty: string;
  email: string;
  password?: string;
  phone: string;
  slug?: string;
  description?: string;
  role?: 'professional' | 'admin' | 'client';
  createdAt?: string;
  plan?: PlanType | null;
  subscriptionStatus?: SubscriptionStatus | null;
  subscriptionEndDate?: string | null;
  planActivatedAt?: string | null;
  headingFont?: string;
  bodyFont?: string;
  profileImage?: string;
  bannerImage?: string;
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundType?: 'color' | 'image';
  companyId?: string | null;
  companyRole?: string | null;
  companyEmail?: string | null;
  companySlug?: string | null;
  trialUsed?: boolean;
  requiresQuote?: boolean;
  profession?: { requiresQuote: boolean } | null;
  reminderPreference?: '1h_before' | '7h30_same_day' | '24h_before';
}

@Injectable({ providedIn: 'root' })
export class ProfessionalService {
  private readonly http = inject(HttpClient);

  async register(data: Omit<IProfessional, 'id' | 'slug' | 'role' | 'createdAt'> & { password: string }): Promise<{ success: boolean; message: string; email?: string }> {
    try {
      const res: any = await firstValueFrom(
        this.http.post(`${environment.apiUrl}/auth/register`, data)
      );
      return { success: true, message: res.message, email: res.email };
    } catch (err: any) {
      const message = err?.error?.message ?? 'Error al registrarse.';
      return { success: false, message };
    }
  }

  async verifyEmail(email: string, code: string): Promise<{ success: boolean; message: string; token?: string; user?: any }> {
    try {
      const res: any = await firstValueFrom(
        this.http.post(`${environment.apiUrl}/auth/verify-email`, { email, code })
      );
      return { success: true, message: res.message, token: res.token, user: res.user };
    } catch (err: any) {
      const message = err?.error?.message ?? 'Código inválido.';
      return { success: false, message };
    }
  }

  async resendVerification(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const res: any = await firstValueFrom(
        this.http.post(`${environment.apiUrl}/auth/resend-verification`, { email })
      );
      return { success: true, message: res.message };
    } catch (err: any) {
      const message = err?.error?.message ?? 'Error al reenviar el código.';
      return { success: false, message };
    }
  }

  async checkEmailExists(email: string): Promise<boolean> {
    try {
      const res: any = await firstValueFrom(
        this.http.get(`${environment.apiUrl}/auth/check-email`, { params: { email } })
      );
      return res.exists === true;
    } catch {
      return false;
    }
  }

  async acceptInvite(inviteToken: string): Promise<{ success: boolean; message: string; token?: string; user?: any }> {
    try {
      const res: any = await firstValueFrom(
        this.http.post(`${environment.apiUrl}/auth/accept-invite`, { inviteToken })
      );
      return { success: true, message: res.message, token: res.token, user: res.user };
    } catch (err: any) {
      return { success: false, message: err?.error?.message ?? 'Error al aceptar la invitación.' };
    }
  }

  async getProfile(): Promise<IProfessional | null> {
    try {
      return await firstValueFrom(
        this.http.get<IProfessional>(`${environment.apiUrl}/professionals/profile`)
      );
    } catch {
      return null;
    }
  }

  async saveReminderPreference(pref: '1h_before' | '7h30_same_day' | '24h_before'): Promise<{ success: boolean; message?: string }> {
    try {
      await firstValueFrom(
        this.http.put(`${environment.apiUrl}/professionals/profile`, { reminderPreference: pref })
      );
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err?.error?.message ?? 'Error al guardar.' };
    }
  }

  async getWaQuota(): Promise<{ waMessagesSent: number; waMessagesLimit: number; subscriptionEndDate: string | null; scope: string } | null> {
    try {
      return await firstValueFrom(
        this.http.get<any>(`${environment.apiUrl}/professionals/wa-quota`)
      );
    } catch {
      return null;
    }
  }

  async checkoutWaAddon(blocks: number): Promise<{ success: boolean; url?: string; message?: string }> {
    try {
      const res: any = await firstValueFrom(
        this.http.post<any>(`${environment.apiUrl}/wa-addon/professional/checkout`, { blocks })
      );
      return { success: true, url: res.url };
    } catch (err: any) {
      return { success: false, message: err?.error?.message ?? 'Error al iniciar el pago.' };
    }
  }

  async confirmWaAddon(token_ws: string): Promise<{ success: boolean; added?: number; waMessagesLimit?: number; waMessagesSent?: number; message?: string }> {
    try {
      const res: any = await firstValueFrom(
        this.http.post<any>(`${environment.apiUrl}/wa-addon/professional/webpay/confirm`, { token_ws })
      );
      return { success: true, added: res.added, waMessagesLimit: res.waMessagesLimit, waMessagesSent: res.waMessagesSent, message: res.message };
    } catch (err: any) {
      return { success: false, message: err?.error?.message ?? 'Error al confirmar el pago.' };
    }
  }

  // ── Privacidad / datos personales (Ley 21.719) ─────────────────────────────────

  /** Descarga un Excel con los datos del profesional. Reconfirma la contraseña. */
  async exportMyData(password: string): Promise<{ success: boolean; message?: string }> {
    try {
      const blob = await firstValueFrom(
        this.http.post(`${environment.apiUrl}/professionals/me/export`, { password }, { responseType: 'blob' })
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mis-datos-letsreserve-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      return { success: true };
    } catch (err: any) {
      return { success: false, message: await blobErrorMessage(err, 'No se pudieron exportar tus datos.') };
    }
  }

  /** Elimina permanentemente la cuenta y todos los datos asociados (supresión). */
  async deleteAccount(password: string): Promise<{ success: boolean; message?: string }> {
    try {
      const res: any = await firstValueFrom(
        this.http.request('DELETE', `${environment.apiUrl}/professionals/me`, { body: { password } })
      );
      return { success: true, message: res?.message };
    } catch (err: any) {
      return { success: false, message: err?.error?.message ?? 'No se pudo eliminar la cuenta.' };
    }
  }
}
