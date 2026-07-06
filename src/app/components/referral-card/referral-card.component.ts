import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PromoService, IReferralInfo } from '../../core/services/promo.service';
import { AuthService } from '../../core/services/auth.service';

/**
 * Tarjeta "Invita y gana": muestra el código de referido del profesional,
 * su link para compartir y cuántos meses Pro ha ganado.
 * Solo visible para profesionales independientes (no miembros de empresa).
 */
@Component({
  selector: 'app-referral-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './referral-card.component.html',
  styleUrls: ['./referral-card.component.css'],
})
export class ReferralCardComponent implements OnInit {
  private readonly promoSvc = inject(PromoService);
  private readonly authSvc  = inject(AuthService);

  info    = signal<IReferralInfo | null>(null);
  copied  = signal(false);
  visible = signal(false);

  async ngOnInit(): Promise<void> {
    const user = this.authSvc.currentUser();
    if (!user || user.companyId) return; // miembros de empresa no gestionan plan propio

    const info = await this.promoSvc.getMyReferral();
    if (info) {
      this.info.set(info);
      this.visible.set(true);
    }
  }

  async copyLink(): Promise<void> {
    const url = this.info()?.shareUrl;
    if (!url) return;
    await navigator.clipboard.writeText(url);
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2500);
  }
}
