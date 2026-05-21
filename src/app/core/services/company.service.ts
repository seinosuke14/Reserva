import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ICompany {
  id: string;
  name: string;
  rut: string;
  email: string;
  plan: 'team' | 'pro_max' | null;
  maxMembers: number | null;
  subscriptionStatus: 'active' | 'suspended' | 'expired' | null;
  subscriptionEndDate: string | null;
  planActivatedAt: string | null;
  isActive: boolean;
  isVerified: boolean;
  type: 'company';
}

export interface ICompanyMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  specialty: string;
  profileImage: string | null;
  isActive: boolean;
  companyRole: 'member';
  createdAt: string;
}

export interface ICompanyMemberStats extends ICompanyMember {
  appointments: number;
  revenue: number;
}

export interface ICompanyMonthly {
  key: string;          // 'YYYY-MM'
  revenue: number;
  appointments: number;
  paid: number;
}

export interface ICompanyDashboard {
  members: ICompanyMemberStats[];
  totals: { appointments: number; revenue: number };
  monthly: ICompanyMonthly[];
}

export interface ICompanySubStatus {
  hasPlan: boolean;
  plan?: string;
  planName?: string;
  status?: string;
  maxMembers?: number;
  endDate?: string;
  daysLeft?: number | null;
  price?: number | null;
}

const COMPANY_KEY       = 'crm_company';
const COMPANY_TOKEN_KEY = 'crm_company_token';
const API_BASE          = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class CompanyService {
  private readonly http = inject(HttpClient);

  private readonly _company = signal<ICompany | null>(this._load());

  readonly currentCompany   = this._company.asReadonly();
  readonly isAuthenticated  = computed(() => !!this._company());

  private _load(): ICompany | null {
    try {
      const saved = localStorage.getItem(COMPANY_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  }

  getToken(): string | null {
    return localStorage.getItem(COMPANY_TOKEN_KEY);
  }

  setSession(token: string, company: ICompany): void {
    this._company.set(company);
    localStorage.setItem(COMPANY_KEY, JSON.stringify(company));
    localStorage.setItem(COMPANY_TOKEN_KEY, token);
  }

  patchCompany(partial: Partial<ICompany>): void {
    const current = this._company();
    if (!current) return;
    const updated = { ...current, ...partial };
    this._company.set(updated);
    localStorage.setItem(COMPANY_KEY, JSON.stringify(updated));
  }

  logout(): void {
    this._company.set(null);
    localStorage.removeItem(COMPANY_KEY);
    localStorage.removeItem(COMPANY_TOKEN_KEY);
  }

  // ── Auth ──────────────────────────────────────────────────────────────────

  async register(data: { name: string; rut: string; email: string; password: string; termsAcceptedAt: string }): Promise<{ success: boolean; message: string; email?: string }> {
    try {
      const res: any = await firstValueFrom(
        this.http.post(`${API_BASE}/company/register`, data)
      );
      return { success: true, message: res.message, email: res.email };
    } catch (err: any) {
      return { success: false, message: err?.error?.message ?? 'Error al registrarse.' };
    }
  }

  async verifyEmail(email: string, code: string): Promise<{ success: boolean; message: string; token?: string; company?: ICompany }> {
    try {
      const res: any = await firstValueFrom(
        this.http.post(`${API_BASE}/company/verify-email`, { email, code })
      );
      return { success: true, message: res.message, token: res.token, company: res.company };
    } catch (err: any) {
      return { success: false, message: err?.error?.message ?? 'Error al verificar.' };
    }
  }

  async resendVerification(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const res: any = await firstValueFrom(
        this.http.post(`${API_BASE}/company/resend-verification`, { email })
      );
      return { success: true, message: res.message };
    } catch (err: any) {
      return { success: false, message: err?.error?.message ?? 'Error al reenviar.' };
    }
  }

  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const res: any = await firstValueFrom(
        this.http.post(`${API_BASE}/company/forgot-password`, { email })
      );
      return { success: true, message: res.message };
    } catch (err: any) {
      return { success: false, message: err?.error?.message ?? 'Error al enviar el correo.' };
    }
  }

  async login(email: string, password: string): Promise<{ success: boolean; message: string; needsVerification?: boolean; email?: string }> {
    try {
      const res: any = await firstValueFrom(
        this.http.post(`${API_BASE}/company/login`, { email, password })
      );
      this.setSession(res.token, res.company);
      return { success: true, message: res.message };
    } catch (err: any) {
      return {
        success: false,
        message: err?.error?.message ?? 'Error al iniciar sesión.',
        needsVerification: err?.error?.needsVerification === true,
        email: err?.error?.email,
      };
    }
  }

  // ── Equipo ────────────────────────────────────────────────────────────────

  private _authHeaders(): Record<string, string> {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async getMembers(): Promise<ICompanyMember[]> {
    try {
      const res: any = await firstValueFrom(
        this.http.get(`${API_BASE}/company/members`, { headers: this._authHeaders() })
      );
      return res.members ?? [];
    } catch { return []; }
  }

  async getDashboard(): Promise<ICompanyDashboard> {
    try {
      const res: any = await firstValueFrom(
        this.http.get(`${API_BASE}/company/dashboard`, { headers: this._authHeaders() })
      );
      return res;
    } catch { return { members: [], totals: { appointments: 0, revenue: 0 }, monthly: [] }; }
  }

  async getSubscriptionStatus(): Promise<ICompanySubStatus> {
    try {
      return await firstValueFrom(
        this.http.get<ICompanySubStatus>(`${API_BASE}/company/subscription/status`, { headers: this._authHeaders() })
      );
    } catch { return { hasPlan: false }; }
  }

  async checkout(plan: 'team' | 'pro_max', maxMembers: number): Promise<{ success: boolean; token?: string; url?: string; message?: string }> {
    try {
      const res: any = await firstValueFrom(
        this.http.post(`${API_BASE}/company/subscription/checkout`, { plan, maxMembers }, { headers: this._authHeaders() })
      );
      return { success: true, token: res.token, url: res.url };
    } catch (err: any) {
      return { success: false, message: err?.error?.message ?? 'Error al iniciar el pago.' };
    }
  }

  async confirmWebpay(token_ws: string): Promise<{ success: boolean; plan?: string; maxMembers?: number; endDate?: string; message?: string }> {
    try {
      const res: any = await firstValueFrom(
        this.http.post(`${API_BASE}/company/subscription/webpay/confirm`, { token_ws }, { headers: this._authHeaders() })
      );
      return { success: true, plan: res.plan, maxMembers: res.maxMembers, endDate: res.endDate, message: res.message };
    } catch (err: any) {
      return { success: false, message: err?.error?.message ?? 'Error al confirmar el pago.' };
    }
  }

  async inviteMember(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const res: any = await firstValueFrom(
        this.http.post(`${API_BASE}/company/invitations`, { email }, { headers: this._authHeaders() })
      );
      return { success: true, message: res.message };
    } catch (err: any) {
      return { success: false, message: err?.error?.message ?? 'Error al enviar invitación.' };
    }
  }

  async getInvitations(): Promise<any[]> {
    try {
      const res: any = await firstValueFrom(
        this.http.get(`${API_BASE}/company/invitations`, { headers: this._authHeaders() })
      );
      return res.invitations ?? [];
    } catch { return []; }
  }

  async cancelInvitation(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const res: any = await firstValueFrom(
        this.http.delete(`${API_BASE}/company/invitations/${id}`, { headers: this._authHeaders() })
      );
      return { success: true, message: res.message };
    } catch (err: any) {
      return { success: false, message: err?.error?.message ?? 'Error al cancelar.' };
    }
  }

  async removeMember(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const res: any = await firstValueFrom(
        this.http.delete(`${API_BASE}/company/members/${id}`, { headers: this._authHeaders() })
      );
      return { success: true, message: res.message };
    } catch (err: any) {
      return { success: false, message: err?.error?.message ?? 'Error al desvincular.' };
    }
  }
}
