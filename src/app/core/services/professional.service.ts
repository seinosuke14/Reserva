import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface IProfessional {
  id?: string;
  name: string;
  specialty: string;
  email: string;
  password?: string;
  phone: string;
  slug?: string;
  role?: 'professional' | 'admin' | 'client';
  webpayCommerceCode?: string;
  webpayApiKey?: string;
  createdAt?: string;
}

@Injectable({ providedIn: 'root' })
export class ProfessionalService {
  private readonly http = inject(HttpClient);

  async register(data: Omit<IProfessional, 'id' | 'slug' | 'role' | 'createdAt'> & { password: string }): Promise<{ success: boolean; message: string }> {
    try {
      await firstValueFrom(
        this.http.post(`${environment.apiUrl}/auth/register`, data)
      );
      return { success: true, message: 'Registro de profesional completado con éxito.' };
    } catch (err: any) {
      const message = err?.error?.message ?? 'Error al registrarse.';
      return { success: false, message };
    }
  }

  async updateWebpay(data: { webpayCommerceCode: string; webpayApiKey: string }): Promise<{ success: boolean; message: string }> {
    try {
      const res: any = await firstValueFrom(
        this.http.put(`${environment.apiUrl}/professionals/webpay`, data)
      );
      return { success: true, message: res.message ?? 'Credenciales actualizadas correctamente.' };
    } catch (err: any) {
      const message = err?.error?.message ?? 'Error al actualizar credenciales.';
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
