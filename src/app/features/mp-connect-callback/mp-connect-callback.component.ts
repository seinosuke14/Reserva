import { Component, inject, signal, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

type CallbackState = 'processing' | 'success' | 'error';

@Component({
  selector: 'app-mp-connect-callback',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mp-connect-callback.component.html',
  styleUrls: ['./mp-connect-callback.component.css'],
})
export class MpConnectCallbackComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly apiUrl = environment.apiUrl;

  readonly state = signal<CallbackState>('processing');
  readonly errorMsg = signal('');

  async ngOnInit(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    const params = this.route.snapshot.queryParamMap;
    const code = params.get('code');
    const returnedState = params.get('state');
    const savedState = sessionStorage.getItem('mp_oauth_state');
    sessionStorage.removeItem('mp_oauth_state');

    if (params.get('error')) {
      this.fail('Cancelaste o se rechazó la conexión con MercadoPago.');
      return;
    }
    if (!code) {
      this.fail('No se recibió el código de autorización de MercadoPago.');
      return;
    }
    // Verificación CSRF: el state que volvió debe coincidir con el que guardamos al iniciar.
    if (savedState && returnedState && savedState !== returnedState) {
      this.fail('La verificación de seguridad falló. Intenta vincular de nuevo.');
      return;
    }

    try {
      await firstValueFrom(
        this.http.post(`${this.apiUrl}/payment-methods/mp-connect/callback`, { code })
      );
      this.state.set('success');
      setTimeout(() => this.router.navigate(['/app/pagos']), 1800);
    } catch (err: any) {
      this.fail(err?.error?.message ?? 'No se pudo vincular tu cuenta de MercadoPago.');
    }
  }

  private fail(msg: string): void {
    this.errorMsg.set(msg);
    this.state.set('error');
  }

  goToPayments(): void {
    this.router.navigate(['/app/pagos']);
  }
}
