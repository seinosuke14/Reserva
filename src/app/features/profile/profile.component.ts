import { Component, signal, inject, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { trigger, style, animate, transition } from '@angular/animations';
import { AuthService } from '../../core/services/auth.service';
import { SubscriptionService } from '../../core/services/subscription.service';
import { ProfessionalService } from '../../core/services/professional.service';
import { environment } from '../../../environments/environment';
import { GoogleCalendarConnectComponent } from '../../components/google-calendar-connect/google-calendar-connect.component';
import { ConfirmPasswordModalComponent } from '../../components/confirm-password-modal/confirm-password-modal.component';

const PLAN_LABELS: Record<string, string> = {
  free:    'Gratuito',
  basic:   'Básico',
  team:    'Equipo',
  pro_max: 'Empresa',
};

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, GoogleCalendarConnectComponent, ConfirmPasswordModalComponent],
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
export class ProfileComponent implements OnInit {
  private readonly auth            = inject(AuthService);
  private readonly http            = inject(HttpClient);
  private readonly subscriptionSvc = inject(SubscriptionService);
  private readonly proSvc          = inject(ProfessionalService);
  private readonly router          = inject(Router);

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

  // ── WhatsApp quota ───────────────────────────────────────────────────────────
  waQuota          = signal<{ waMessagesSent: number; waMessagesLimit: number; subscriptionEndDate: string | null; scope: string } | null>(null);
  waAddonSaving    = signal(false);
  waAddonMsg       = signal<{ type: 'success' | 'error'; text: string } | null>(null);
  waAddonPanelOpen = signal(false);
  waAddonBlocks    = signal(1);

  readonly waUsagePct = computed(() => {
    const q = this.waQuota();
    if (!q || q.waMessagesLimit === 0) return 0;
    return Math.min(100, Math.round((q.waMessagesSent / q.waMessagesLimit) * 100));
  });

  readonly waAddonMessages = computed(() => this.waAddonBlocks() * 50);
  readonly waAddonTotal    = computed(() =>
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })
      .format(this.waAddonBlocks() * 5000)
  );

  waAddonStepDown(): void {
    if (this.waAddonBlocks() > 1) this.waAddonBlocks.update(b => b - 1);
  }

  waAddonStepUp(): void {
    if (this.waAddonBlocks() < 10) this.waAddonBlocks.update(b => b + 1);
  }

  async loadWaQuota(): Promise<void> {
    const q = await this.proSvc.getWaQuota();
    this.waQuota.set(q);
  }

  async checkoutWaAddon(): Promise<void> {
    this.waAddonSaving.set(true);
    this.waAddonMsg.set(null);
    const result = await this.proSvc.checkoutWaAddon(this.waAddonBlocks());
    this.waAddonSaving.set(false);
    if (result.success && result.url) {
      window.location.href = result.url;
    } else {
      this.waAddonMsg.set({ type: 'error', text: result.message ?? 'No se pudo iniciar el pago.' });
      setTimeout(() => this.waAddonMsg.set(null), 4000);
    }
  }

  // ── Renovar plan ─────────────────────────────────────────────────────────────
  renewSaving = signal(false);
  renewMsg    = signal<{ type: 'success' | 'error'; text: string } | null>(null);

  ngOnInit(): void {
    this.loadWaQuota();
  }

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

  // ── Privacidad / datos personales (Ley 21.719) ─────────────────────────────────
  // Tanto descargar como eliminar reconfirman la contraseña en un mismo modal.
  exportMsg     = signal<{ type: 'success' | 'error'; text: string } | null>(null);

  confirmIntent = signal<'export' | 'delete' | null>(null);
  confirmBusy   = signal(false);
  confirmError  = signal<string | null>(null);

  openExport(): void { this.openConfirm('export'); }
  openDelete(): void { this.openConfirm('delete'); }

  private openConfirm(intent: 'export' | 'delete'): void {
    this.confirmError.set(null);
    this.confirmIntent.set(intent);
  }

  closeConfirm(): void {
    if (this.confirmBusy()) return;
    this.confirmIntent.set(null);
  }

  async submitConfirm(password: string): Promise<void> {
    if (!password) {
      this.confirmError.set('Ingresa tu contraseña para confirmar.');
      return;
    }
    this.confirmBusy.set(true);
    this.confirmError.set(null);

    if (this.confirmIntent() === 'export') {
      const result = await this.proSvc.exportMyData(password);
      this.confirmBusy.set(false);
      if (result.success) {
        this.confirmIntent.set(null);
        this.exportMsg.set({ type: 'success', text: 'Descarga iniciada. Revisa tu carpeta de descargas.' });
        setTimeout(() => this.exportMsg.set(null), 5000);
      } else {
        this.confirmError.set(result.message ?? 'No se pudieron exportar tus datos.');
      }
      return;
    }

    const result = await this.proSvc.deleteAccount(password);
    if (result.success) {
      this.auth.logout();
      this.router.navigate(['/login']);
    } else {
      this.confirmBusy.set(false);
      this.confirmError.set(result.message ?? 'No se pudo eliminar la cuenta.');
    }
  }

}
