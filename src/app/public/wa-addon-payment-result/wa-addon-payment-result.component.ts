import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { trigger, style, animate, transition } from '@angular/animations';
import { ProfessionalService } from '../../core/services/professional.service';
import { CompanyService } from '../../core/services/company.service';

type ResultState = 'loading' | 'success' | 'error' | 'cancelled';

@Component({
  selector: 'app-wa-addon-payment-result',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './wa-addon-payment-result.component.html',
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class WaAddonPaymentResultComponent implements OnInit {
  private readonly route   = inject(ActivatedRoute);
  private readonly router  = inject(Router);
  private readonly proSvc  = inject(ProfessionalService);
  private readonly compSvc = inject(CompanyService);

  state    = signal<ResultState>('loading');
  added    = signal<number>(0);
  errorMsg = signal('');
  isCompany = signal(false);

  async ngOnInit(): Promise<void> {
    const params    = this.route.snapshot.queryParamMap;
    const token_ws  = params.get('token_ws');
    const cancelled = params.get('cancelled');
    const scope     = params.get('scope') ?? 'professional';

    this.isCompany.set(scope === 'company');

    if (cancelled === 'true') {
      this.state.set('cancelled');
      return;
    }

    if (!token_ws) {
      this.state.set('error');
      this.errorMsg.set('No se recibió token de pago.');
      return;
    }

    const result = scope === 'company'
      ? await this.compSvc.confirmWaAddon(token_ws)
      : await this.proSvc.confirmWaAddon(token_ws);

    if (result.success) {
      this.added.set(result.added ?? 0);
      this.state.set('success');
    } else {
      this.state.set('error');
      this.errorMsg.set(result.message ?? 'El pago no pudo ser procesado.');
    }
  }

  goToDashboard(): void {
    this.router.navigate(this.isCompany() ? ['/empresa'] : ['/app/perfil']);
  }
}
