import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PlanType } from './professional.service';

export interface IPlan {
  id: PlanType;
  name: string;
  price: number | null;
  duration: string;
  description: string;
  available: boolean;
  comingSoon?: boolean;
  firstTimeOnly?: boolean;
}

export interface ISubscriptionStatus {
  hasPlan: boolean;
  plan?: PlanType;
  status?: 'active' | 'suspended' | 'expired';
  startDate?: string;
  endDate?: string;
  daysLeft?: number;
  price?: number;
}

const API = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class SubscriptionService {
  private readonly http = inject(HttpClient);

  async getPlans(): Promise<IPlan[]> {
    try {
      const res: any = await firstValueFrom(this.http.get(`${API}/subscription/plans`));
      return res.plans;
    } catch {
      return [];
    }
  }

  async getStatus(): Promise<ISubscriptionStatus> {
    try {
      return await firstValueFrom(this.http.get<ISubscriptionStatus>(`${API}/subscription/status`));
    } catch {
      return { hasPlan: false };
    }
  }

  async checkout(plan: PlanType): Promise<{ success: boolean; token?: string; url?: string; message?: string }> {
    try {
      const res: any = await firstValueFrom(
        this.http.post(`${API}/subscription/checkout`, { plan })
      );
      return { success: true, token: res.token, url: res.url };
    } catch (err: any) {
      return { success: false, message: err?.error?.message ?? 'Error al iniciar el pago.' };
    }
  }

  async activateFree(): Promise<{ success: boolean; plan?: PlanType; subscriptionStatus?: string; subscriptionEndDate?: string | null; message?: string }> {
    try {
      const res: any = await firstValueFrom(
        this.http.post(`${API}/subscription/activate-free`, {})
      );
      return { success: true, plan: res.plan, subscriptionStatus: res.subscriptionStatus, subscriptionEndDate: res.subscriptionEndDate };
    } catch (err: any) {
      return { success: false, message: err?.error?.message ?? 'Error al activar el plan gratuito.' };
    }
  }

  async confirmWebpay(token_ws: string): Promise<{ success: boolean; plan?: PlanType; endDate?: string; message?: string }> {
    try {
      const res: any = await firstValueFrom(
        this.http.post(`${API}/subscription/webpay/confirm`, { token_ws })
      );
      return { success: true, plan: res.plan, endDate: res.endDate, message: res.message };
    } catch (err: any) {
      return { success: false, message: err?.error?.message ?? 'Error al confirmar el pago.' };
    }
  }

  /** Días restantes desde una fecha de fin */
  daysLeft(endDate: string | null | undefined): number {
    if (!endDate) return 0;
    const diff = new Date(endDate).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  /** Retorna true si la suscripción está activa */
  isActive(status: string | null | undefined): boolean {
    return status === 'active';
  }
}
