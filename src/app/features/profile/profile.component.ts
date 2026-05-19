import { Component, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { trigger, style, animate, transition } from '@angular/animations';
import { AuthService } from '../../core/services/auth.service';
import { SubscriptionService } from '../../core/services/subscription.service';
import { environment } from '../../../environments/environment';

const PLAN_LABELS: Record<string, string> = {
  free:    'Gratuito',
  basic:   'Básico',
  team:    'Equipo',
  pro_max: 'Pro Max',
};

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './profile.component.html',
  animations: [
    trigger('fadeUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(12px)' }),
        animate('220ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class ProfileComponent {
  private readonly auth            = inject(AuthService);
  private readonly http            = inject(HttpClient);
  private readonly subscriptionSvc = inject(SubscriptionService);

  readonly user = this.auth.currentUser;

  readonly planName = computed(() => {
    const plan = this.user()?.plan;
    return plan ? (PLAN_LABELS[plan] ?? plan) : 'Sin plan';
  });

  readonly daysLeft = computed(() => {
    return this.subscriptionSvc.daysLeft(this.user()?.subscriptionEndDate);
  });

  readonly subscriptionStatus = computed(() => this.user()?.subscriptionStatus ?? null);

  readonly planBadgeStyle = computed(() => {
    const plan = this.user()?.plan;
    if (plan === 'pro_max') return 'bg-amber-100 text-amber-700 border border-amber-300';
    if (plan === 'basic')   return 'bg-blue-50 text-blue-700 border border-blue-200';
    if (plan === 'free')    return 'bg-slate-100 text-slate-600 border border-slate-200';
    return 'bg-red-50 text-red-600 border border-red-200';
  });

  readonly daysLeftStyle = computed(() => {
    const days = this.daysLeft();
    if (days <= 3)  return 'text-red-500 font-bold';
    if (days <= 7)  return 'text-amber-500 font-semibold';
    return 'text-emerald-600 font-semibold';
  });

  readonly userInitials = computed(() => {
    const name = this.user()?.name ?? '';
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'P';
  });

  /** Muestra "Renovar" si el plan es de pago y está vencido/suspendido o quedan ≤7 días */
  readonly showRenew = computed(() => {
    const plan   = this.user()?.plan;
    const status = this.subscriptionStatus();
    if (!plan || plan === 'free') return false;
    if (status === 'suspended' || status === 'expired') return true;
    return status === 'active' && this.daysLeft() <= 7;
  });

  // ── Foto de perfil ───────────────────────────────────────────────────────────
  profileImgPreview = signal<string | null>(this.auth.currentUser()?.profileImage ?? null);
  profileImgSaving  = signal(false);
  profileImgMsg     = signal<{ type: 'success' | 'error'; text: string } | null>(null);

  readonly profileImgSrc = computed(() =>
    this.profileImgPreview() ?? this.auth.currentUser()?.profileImage ?? null
  );

  async onProfileImageSelect(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    this.profileImgPreview.set(URL.createObjectURL(file));
    this.profileImgSaving.set(true);
    this.profileImgMsg.set(null);

    const formData = new FormData();
    formData.append('image', file);
    try {
      const updated: any = await firstValueFrom(
        this.http.post(`${environment.apiUrl}/professionals/upload/profile`, formData)
      );
      this.auth.patchUser({ profileImage: updated.profileImage });
      this.profileImgPreview.set(updated.profileImage);
      this.profileImgMsg.set({ type: 'success', text: 'Foto de perfil actualizada.' });
    } catch (err: any) {
      this.profileImgPreview.set(this.auth.currentUser()?.profileImage ?? null);
      this.profileImgMsg.set({ type: 'error', text: err?.error?.message ?? 'No se pudo subir la imagen.' });
    } finally {
      this.profileImgSaving.set(false);
      (event.target as HTMLInputElement).value = '';
    }
  }

  // ── Renovar plan ─────────────────────────────────────────────────────────────
  renewSaving = signal(false);
  renewMsg    = signal<{ type: 'success' | 'error'; text: string } | null>(null);

  async renewPlan(): Promise<void> {
    const plan = this.user()?.plan;
    if (!plan || plan === 'free') return;
    this.renewSaving.set(true);
    this.renewMsg.set(null);
    const result = await this.subscriptionSvc.checkout(plan);
    this.renewSaving.set(false);
    if (result.success && result.url) {
      window.location.href = result.url;
    } else {
      this.renewMsg.set({ type: 'error', text: result.message ?? 'No se pudo iniciar el pago.' });
    }
  }

  // ── Contraseña ──────────────────────────────────────────────────────────────
  pwCurrent  = signal('');
  pwNew      = signal('');
  pwConfirm  = signal('');
  pwSaving   = signal(false);
  pwMsg      = signal<{ type: 'success' | 'error'; text: string } | null>(null);

  async changePassword(): Promise<void> {
    const current = this.pwCurrent().trim();
    const newPw   = this.pwNew().trim();
    const confirm = this.pwConfirm().trim();

    if (!current || !newPw || !confirm) {
      this.pwMsg.set({ type: 'error', text: 'Completa todos los campos.' }); return;
    }
    if (newPw !== confirm) {
      this.pwMsg.set({ type: 'error', text: 'Las contraseñas no coinciden.' }); return;
    }
    if (!/^(?=.*[A-Z])(?=.*\d).{6,16}$/.test(newPw)) {
      this.pwMsg.set({ type: 'error', text: 'Entre 6 y 16 caracteres, 1 mayúscula y 1 número.' }); return;
    }

    this.pwSaving.set(true);
    this.pwMsg.set(null);
    const result = await this.auth.changePassword(current, newPw);
    this.pwSaving.set(false);
    if (result.success) {
      this.pwCurrent.set(''); this.pwNew.set(''); this.pwConfirm.set('');
      this.pwMsg.set({ type: 'success', text: 'Contraseña actualizada correctamente.' });
    } else {
      this.pwMsg.set({ type: 'error', text: result.message });
    }
  }
}
