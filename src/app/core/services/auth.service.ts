import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { IProfessional } from './professional.service';
import { environment } from '../../../environments/environment';

export type UserRole = 'professional' | 'user' | 'guest';

const STORAGE_KEY = 'crm_user';
const TOKEN_KEY   = 'crm_token';
const GUEST_KEY   = 'crm_guest_id';
const API_BASE    = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly _user = signal<IProfessional | null>(this._loadFromStorage());

  readonly currentUser      = this._user.asReadonly();
  readonly isAuthenticated  = computed(() => !!this._user());
  readonly currentRole      = computed<UserRole>(() => {
    const user = this._user();
    if (!user) return 'guest';
    return user.role === 'professional' ? 'professional' : 'user';
  });

  /** ID persistente para sesiones de visitante anónimo */
  readonly guestId: string = this._ensureGuestId();

  // ─── Helpers privados ───────────────────────────────────────────────────────

  private _loadFromStorage(): IProfessional | null {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  }

  private _ensureGuestId(): string {
    let id = localStorage.getItem(GUEST_KEY);
    if (!id) {
      id = 'guest_' + Math.random().toString(36).substring(2) + Date.now();
      localStorage.setItem(GUEST_KEY, id);
    }
    return id;
  }

  // ─── Token ──────────────────────────────────────────────────────────────────

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  // ─── Control de acceso ──────────────────────────────────────────────────────

  /** Todos los roles pueden reservar */
  canBook(): boolean {
    return true;
  }

  /** Solo el profesional accede al dashboard admin */
  canAccessAdmin(): boolean {
    return this.currentRole() === 'professional';
  }

  // ─── Verificación de email ──────────────────────────────────────────────────

  /**
   * Verifica si un email ya existe en el sistema.
   * Útil para sugerir "Inicia sesión" sin bloquear la reserva.
   */
  async checkEmailExists(email: string): Promise<boolean> {
    try {
      const res: any = await firstValueFrom(
        this.http.get(`${API_BASE}/auth/check-email`, { params: { email } })
      );
      return res.exists === true;
    } catch (err: any) {
      // 409 = email ya registrado como profesional
      return err?.status === 409;
    }
  }

  // ─── Autenticación ──────────────────────────────────────────────────────────

  async login(email: string, password: string): Promise<{ success: boolean; message: string; user?: IProfessional }> {
    try {
      const res: any = await firstValueFrom(
        this.http.post(`${API_BASE}/auth/login`, { email, password })
      );
      const user: IProfessional = res.user;
      this._user.set(user);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      localStorage.setItem(TOKEN_KEY, res.token);
      return { success: true, message: res.message, user };
    } catch (err: any) {
      const message = err?.error?.message ?? 'Error al iniciar sesión.';
      return { success: false, message };
    }
  }

  async register(data: Partial<IProfessional> & { password: string }): Promise<{ success: boolean; message: string; user?: IProfessional }> {
    try {
      const res: any = await firstValueFrom(
        this.http.post(`${API_BASE}/auth/register`, data)
      );
      const user: IProfessional = res.user;
      this._user.set(user);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      localStorage.setItem(TOKEN_KEY, res.token);
      // Vincular citas previas de visita anónima
      this.linkGuestAppointments(user.id!);
      return { success: true, message: res.message, user };
    } catch (err: any) {
      const message = err?.error?.message ?? 'Error al registrarse.';
      return { success: false, message };
    }
  }

  /**
   * Vincula las citas creadas como invitado a la cuenta recién creada.
   * Esto permite que si un visitante se registra post-reserva, no pierda su historial.
   */
  linkGuestAppointments(newUserId: string): void {
    const guestId = localStorage.getItem(GUEST_KEY);
    if (!guestId) return;
    // En producción: llamar a POST /api/appointments/link-guest { guestId, userId }
    console.log(`[AuthService] Vinculando citas del invitado [${guestId}] al usuario [${newUserId}]`);
    localStorage.removeItem(GUEST_KEY);
  }

  /** Actualiza el usuario en memoria y en localStorage (ej: tras editar perfil) */
  patchUser(partial: Partial<IProfessional>): void {
    const current = this._user();
    if (!current) return;
    const updated = { ...current, ...partial };
    this._user.set(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  logout(): void {
    this._user.set(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TOKEN_KEY);
  }
}
