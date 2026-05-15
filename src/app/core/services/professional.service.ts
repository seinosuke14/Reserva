import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export type PlanType = 'free' | 'basic' | 'team' | 'pro_max';
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
