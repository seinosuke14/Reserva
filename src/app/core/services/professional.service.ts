import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

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
}
