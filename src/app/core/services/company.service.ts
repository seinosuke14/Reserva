import { Injectable, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { IServiceCategory } from '../../helpers/models';
import { blobErrorMessage } from '../../helpers/http-errors';

export interface ICompany {
  id: string;
  name: string;
  slug: string | null;
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
  description: string | null;
  profileImage: string | null;
  bannerImage: string | null;
  backgroundColor: string;
  backgroundImage: string | null;
  backgroundType: 'color' | 'image';
  headingFont: string | null;
  bodyFont: string | null;
  reminderPreference?: '1h_before' | '7h30_same_day' | '24h_before';
  paymentRouting?: 'company' | 'professional';
  /** Marca si la empresa ya pasó (o descartó) el tutorial de onboarding. */
  onboardingCompleted?: boolean;
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
  key: string;
  revenue: number;
  appointments: number;
  paid: number;
  cancelled: number;
  refunded: number;
}

export interface ICompanyDashboard {
  members: ICompanyMemberStats[];
  totals: { appointments: number; revenue: number };
  monthly: ICompanyMonthly[];
}

export interface ICompanyBrand {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  profileImage: string | null;
  bannerImage: string | null;
  backgroundColor: string;
  backgroundImage: string | null;
  backgroundType: 'color' | 'image';
  headingFont: string | null;
  bodyFont: string | null;
  paymentRouting?: 'company' | 'professional';
}

export interface ICompanyPublicService {
  id: string;
  name: string;
  duration: number;
  price: number;
  description: string | null;
  serviceImage: string | null;
  categoryId: string | null;
}

export interface ICompanyPublicReview {
  rating: number;
  comment: string | null;
  reviewerName: string | null;
  createdAt: string;
}

export interface ICompanyPublicMember {
  id: string;
  name: string;
  specialty: string;
  profileImage: string | null;
  slug?: string;
  services: ICompanyPublicService[];
  reviews: ICompanyPublicReview[];
  // Solo presentes cuando la empresa usa ruteo de pagos 'professional'.
  paymentMethods?: ICompanyPublicPaymentMethod[];
}

export interface ICompanyPublicPaymentMethod {
  id: string;
  provider: 'flow' | 'transfer' | 'khipu' | 'mercadopago' | 'mercadopago_connect';
  // Solo para 'transfer': datos bancarios públicos que el cliente necesita para pagar.
  transferInfo?: Record<string, string>;
}

export interface ICompanyPublicPage {
  company: ICompanyBrand;
  members: ICompanyPublicMember[];
  categories?: IServiceCategory[];
  paymentMethods: ICompanyPublicPaymentMethod[];
}

export interface IAgendaAppt {
  id: string;
  time: string;
  paymentStatus: 'Pagado' | 'Pendiente' | 'Cancelado';
  service: { name: string; duration: number };
  customer: { name: string };
}

export interface IAgendaMember {
  id: string;
  name: string;
  profileImage: string | null;
  profession: string | null;
  appointments: IAgendaAppt[];
}

export interface IMemberAgendaAppt {
  id: string;
  date: string;
  time: string;
  paymentStatus: 'Pagado' | 'Pendiente' | 'Cancelado';
  service: { name: string; duration: number };
  customer: { name: string; phone: string | null; email: string | null };
}

export interface IMemberAgenda {
  member: { id: string; name: string; profileImage: string | null; profession: string | null };
  appointments: IMemberAgendaAppt[];
}

export interface ICompanySubStatus {
  hasPlan: boolean;
  plan?: string;
  planName?: string;
  status?: string;
  maxMembers?: number;
  endDate?: string;
  daysLeft?: number | null;
  price?: number | null;          // neto
  priceWithVat?: number | null;   // con IVA incluido — lo que paga la empresa
}

const COMPANY_KEY       = 'crm_company';
const COMPANY_TOKEN_KEY = 'crm_company_token';
const API_BASE          = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class CompanyService {
  private readonly http       = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly _company = signal<ICompany | null>(this._load());

  readonly currentCompany  = this._company.asReadonly();
  readonly isAuthenticated = computed(() => !!this._company());

  private _load(): ICompany | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    try {
      const saved = localStorage.getItem(COMPANY_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  }

  getToken(): string | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    return localStorage.getItem(COMPANY_TOKEN_KEY);
  }

  setSession(token: string, company: ICompany): void {
    this._company.set(company);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(COMPANY_KEY, JSON.stringify(company));
      localStorage.setItem(COMPANY_TOKEN_KEY, token);
    }
  }

  patchCompany(partial: Partial<ICompany>): void {
    const current = this._company();
    if (!current) return;
    const updated = { ...current, ...partial };
    this._company.set(updated);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(COMPANY_KEY, JSON.stringify(updated));
    }
  }

  logout(): void {
    this._company.set(null);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(COMPANY_KEY);
      localStorage.removeItem(COMPANY_TOKEN_KEY);
    }
  }

  // ── Privacidad / datos de la empresa (Ley 21.719) ───────────────────────────

  /** Descarga un Excel con los datos de la empresa. Reconfirma la contraseña. */
  async exportData(password: string): Promise<{ success: boolean; message?: string }> {
    try {
      const blob = await firstValueFrom(
        this.http.post(`${API_BASE}/company/me/export`, { password }, { responseType: 'blob' })
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `datos-empresa-letsreserve-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      return { success: true };
    } catch (err: any) {
      return { success: false, message: await blobErrorMessage(err, 'No se pudieron exportar los datos.') };
    }
  }

  /** Elimina permanentemente la empresa y sus datos. Bloqueado si tiene miembros. */
  async deleteAccount(password: string): Promise<{ success: boolean; message?: string }> {
    try {
      const res: any = await firstValueFrom(
        this.http.request('DELETE', `${API_BASE}/company/me`, { body: { password } })
      );
      return { success: true, message: res?.message };
    } catch (err: any) {
      return { success: false, message: err?.error?.message ?? 'No se pudo eliminar la empresa.' };
    }
  }

  // ── Auth ──────────────────────────────────────────────────────────────────

  async register(data: { name: string; rut: string; email: string; password: string; termsAcceptedAt: string }): Promise<{ success: boolean; message: string; email?: string }> {
    try {
      const res: any = await firstValueFrom(this.http.post(`${API_BASE}/company/register`, data));
      return { success: true, message: res.message, email: res.email };
    } catch (err: any) {
      return { success: false, message: err?.error?.message ?? 'Error al registrarse.' };
    }
  }

  async verifyEmail(email: string, code: string): Promise<{ success: boolean; message: string; token?: string; company?: ICompany }> {
    try {
      const res: any = await firstValueFrom(this.http.post(`${API_BASE}/company/verify-email`, { email, code }));
      return { success: true, message: res.message, token: res.token, company: res.company };
    } catch (err: any) {
      return { success: false, message: err?.error?.message ?? 'Error al verificar.' };
    }
  }

  async resendVerification(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const res: any = await firstValueFrom(this.http.post(`${API_BASE}/company/resend-verification`, { email }));
      return { success: true, message: res.message };
    } catch (err: any) {
      return { success: false, message: err?.error?.message ?? 'Error al reenviar.' };
    }
  }

  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const res: any = await firstValueFrom(this.http.post(`${API_BASE}/company/forgot-password`, { email }));
      return { success: true, message: res.message };
    } catch (err: any) {
      return { success: false, message: err?.error?.message ?? 'Error al enviar el correo.' };
    }
  }

  async login(email: string, password: string): Promise<{ success: boolean; message: string; needsVerification?: boolean; email?: string; lastAttempt?: boolean; blocked?: boolean }> {
    try {
      const res: any = await firstValueFrom(this.http.post(`${API_BASE}/company/login`, { email, password }));
      this.setSession(res.token, res.company);
      return { success: true, message: res.message };
    } catch (err: any) {
      return {
        success: false,
        message: err?.error?.message ?? 'Error al iniciar sesión.',
        needsVerification: err?.error?.needsVerification === true,
        email: err?.error?.email,
        // 429 = bloqueado por rate limit; lastAttempt = aviso de último intento.
        blocked: err?.status === 429 || err?.error?.blocked === true,
        lastAttempt: err?.error?.lastAttempt === true,
      };
    }
  }

  // ── Equipo ────────────────────────────────────────────────────────────────

  async getMembers(): Promise<ICompanyMember[]> {
    try {
      const res: any = await firstValueFrom(this.http.get(`${API_BASE}/company/members`));
      return res.members ?? [];
    } catch { return []; }
  }

  async getDashboard(): Promise<ICompanyDashboard> {
    try {
      return await firstValueFrom(this.http.get<ICompanyDashboard>(`${API_BASE}/company/dashboard`));
    } catch { return { members: [], totals: { appointments: 0, revenue: 0 }, monthly: [] }; }
  }

  async getSubscriptionStatus(): Promise<ICompanySubStatus> {
    try {
      return await firstValueFrom(this.http.get<ICompanySubStatus>(`${API_BASE}/company/subscription/status`));
    } catch { return { hasPlan: false }; }
  }

  async checkout(plan: 'team' | 'pro_max', maxMembers: number): Promise<{ success: boolean; url?: string; message?: string }> {
    try {
      const res: any = await firstValueFrom(
        this.http.post(`${API_BASE}/company/subscription/checkout`, { plan, maxMembers })
      );
      return { success: true, url: res.url };
    } catch (err: any) {
      return { success: false, message: err?.error?.message ?? 'Error al iniciar el pago.' };
    }
  }

  async confirmWebpay(token_ws: string): Promise<{ success: boolean; plan?: string; maxMembers?: number; endDate?: string; message?: string }> {
    try {
      const res: any = await firstValueFrom(
        this.http.post(`${API_BASE}/company/subscription/webpay/confirm`, { token_ws })
      );
      return { success: true, plan: res.plan, maxMembers: res.maxMembers, endDate: res.endDate, message: res.message };
    } catch (err: any) {
      return { success: false, message: err?.error?.message ?? 'Error al confirmar el pago.' };
    }
  }

  async inviteMember(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const res: any = await firstValueFrom(this.http.post(`${API_BASE}/company/invitations`, { email }));
      return { success: true, message: res.message };
    } catch (err: any) {
      return { success: false, message: err?.error?.message ?? 'Error al enviar invitación.' };
    }
  }

  async getInvitations(): Promise<any[]> {
    try {
      const res: any = await firstValueFrom(this.http.get(`${API_BASE}/company/invitations`));
      return res.invitations ?? [];
    } catch { return []; }
  }

  async cancelInvitation(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const res: any = await firstValueFrom(this.http.delete(`${API_BASE}/company/invitations/${id}`));
      return { success: true, message: res.message };
    } catch (err: any) {
      return { success: false, message: err?.error?.message ?? 'Error al cancelar.' };
    }
  }

  async removeMember(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const res: any = await firstValueFrom(this.http.delete(`${API_BASE}/company/members/${id}`));
      return { success: true, message: res.message };
    } catch (err: any) {
      return { success: false, message: err?.error?.message ?? 'Error al desvincular.' };
    }
  }

  async updateBrand(data: Partial<Omit<ICompanyBrand, 'id' | 'name' | 'slug'>>): Promise<{ success: boolean; message: string }> {
    try {
      await firstValueFrom(this.http.put(`${API_BASE}/company/brand`, data));
      return { success: true, message: 'Marca actualizada.' };
    } catch (err: any) {
      return { success: false, message: err?.error?.message ?? 'Error al guardar.' };
    }
  }

  async rescheduleAppointment(id: string, date: string, time: string): Promise<{ success: boolean; message: string }> {
    try {
      const res: any = await firstValueFrom(
        this.http.put(`${API_BASE}/company/appointments/${id}/reschedule`, { date, time })
      );
      return { success: true, message: res.message };
    } catch (err: any) {
      return { success: false, message: err?.error?.message ?? 'Error al reagendar.' };
    }
  }

  async updateAppointmentStatus(id: string, paymentStatus: 'Pagado' | 'Pendiente' | 'Cancelado'): Promise<{ success: boolean; message: string }> {
    try {
      const res: any = await firstValueFrom(
        this.http.patch(`${API_BASE}/company/appointments/${id}/status`, { paymentStatus })
      );
      return { success: true, message: res.message };
    } catch (err: any) {
      return { success: false, message: err?.error?.message ?? 'Error al actualizar el estado.' };
    }
  }

  async getAgenda(date: string): Promise<{ date: string; members: IAgendaMember[] }> {
    try {
      return await firstValueFrom(
        this.http.get<any>(`${API_BASE}/company/agenda`, { params: { date } })
      );
    } catch { return { date, members: [] }; }
  }

  // Citas próximas (desde hoy) de un profesional del equipo.
  async getMemberAgenda(professionalId: string): Promise<IMemberAgenda | null> {
    try {
      return await firstValueFrom(
        this.http.get<IMemberAgenda>(`${API_BASE}/company/agenda/member/${professionalId}`)
      );
    } catch { return null; }
  }

  // ── Categorías de servicios (compartidas por el equipo, tope 5) ────────────

  async getServiceCategories(): Promise<IServiceCategory[]> {
    try {
      const res: any = await firstValueFrom(this.http.get(`${API_BASE}/company/service-categories`));
      return res.categories ?? [];
    } catch { return []; }
  }

  async createServiceCategory(name: string): Promise<{ success: boolean; message?: string; category?: IServiceCategory }> {
    try {
      const category = await firstValueFrom(
        this.http.post<IServiceCategory>(`${API_BASE}/company/service-categories`, { name })
      );
      return { success: true, category };
    } catch (err: any) {
      return { success: false, message: err?.error?.message ?? 'Error al crear la categoría.' };
    }
  }

  async updateServiceCategory(id: string, name: string): Promise<{ success: boolean; message?: string; category?: IServiceCategory }> {
    try {
      const category = await firstValueFrom(
        this.http.put<IServiceCategory>(`${API_BASE}/company/service-categories/${id}`, { name })
      );
      return { success: true, category };
    } catch (err: any) {
      return { success: false, message: err?.error?.message ?? 'Error al actualizar la categoría.' };
    }
  }

  async deleteServiceCategory(id: string): Promise<{ success: boolean; message?: string }> {
    try {
      await firstValueFrom(this.http.delete(`${API_BASE}/company/service-categories/${id}`));
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err?.error?.message ?? 'Error al eliminar la categoría.' };
    }
  }

  async getPublicPage(slug: string): Promise<ICompanyPublicPage | null> {
    try {
      return await firstValueFrom(this.http.get<ICompanyPublicPage>(`${API_BASE}/company/public/${slug}`));
    } catch { return null; }
  }

  async getWaQuota(): Promise<{ waMessagesSent: number; waMessagesLimit: number; subscriptionEndDate: string | null; scope: string } | null> {
    try {
      return await firstValueFrom(this.http.get<any>(`${API_BASE}/company/wa-quota`));
    } catch { return null; }
  }

  async saveReminderPreference(pref: '1h_before' | '7h30_same_day' | '24h_before'): Promise<{ success: boolean; message?: string }> {
    try {
      await firstValueFrom(this.http.put(`${API_BASE}/company/reminder-preference`, { reminderPreference: pref }));
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err?.error?.message ?? 'Error al guardar.' };
    }
  }

  async savePaymentRouting(routing: 'company' | 'professional'): Promise<{ success: boolean; message?: string }> {
    try {
      await firstValueFrom(this.http.put(`${API_BASE}/company/payment-routing`, { paymentRouting: routing }));
      this.patchCompany({ paymentRouting: routing });
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err?.error?.message ?? 'Error al guardar.' };
    }
  }

  async checkoutWaAddon(blocks: number): Promise<{ success: boolean; url?: string; message?: string }> {
    try {
      const res: any = await firstValueFrom(
        this.http.post<any>(`${API_BASE}/wa-addon/company/checkout`, { blocks })
      );
      return { success: true, url: res.url };
    } catch (err: any) {
      return { success: false, message: err?.error?.message ?? 'Error al iniciar el pago.' };
    }
  }

  async confirmWaAddon(token_ws: string): Promise<{ success: boolean; added?: number; waMessagesLimit?: number; waMessagesSent?: number; message?: string }> {
    try {
      const res: any = await firstValueFrom(
        this.http.post<any>(`${API_BASE}/wa-addon/company/webpay/confirm`, { token_ws })
      );
      return { success: true, added: res.added, waMessagesLimit: res.waMessagesLimit, waMessagesSent: res.waMessagesSent, message: res.message };
    } catch (err: any) {
      return { success: false, message: err?.error?.message ?? 'Error al confirmar el pago.' };
    }
  }
}
