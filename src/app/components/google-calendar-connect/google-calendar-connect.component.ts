import { Component, OnInit, inject, input, signal, computed, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { GoogleCalendarService, CalendarScope, CalendarStatus } from '../../core/services/google-calendar.service';
import { PlanCapabilitiesService } from '../../core/services/plan-capabilities.service';

type Msg = { type: 'success' | 'error' | 'info'; text: string } | null;

// Tarjeta de conexión con Google Calendar. Reutilizable para el profesional y para
// la empresa: el comportamiento es idéntico, solo cambia el `scope` (a qué endpoints
// pega) y, por debajo, el token que el interceptor adjunta.
@Component({
  selector: 'app-google-calendar-connect',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './google-calendar-connect.component.html',
  styleUrl: './google-calendar-connect.component.css',
})
export class GoogleCalendarConnectComponent implements OnInit {
  private readonly gcal       = inject(GoogleCalendarService);
  private readonly route      = inject(ActivatedRoute);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly plans      = inject(PlanCapabilitiesService);

  readonly scope = input<CalendarScope>('professional');

  // El plan Basic no incluye Google Calendar: la tarjeta no se muestra para ellos.
  readonly available = computed(() => this.plans.can('googleCalendar'));

  // Bloqueo temporal mientras Google verifica la app OAuth (scope sensible
  // calendar.events). Con esto en true se muestra solo el aviso "Próximamente"
  // y no se hace ninguna llamada al backend. Cambiar a false al aprobarse.
  readonly comingSoon = true;

  readonly status  = signal<CalendarStatus>({ connected: false });
  readonly loading = signal(true);
  readonly busy    = signal(false);
  readonly msg     = signal<Msg>(null);

  async ngOnInit(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.comingSoon) { this.loading.set(false); return; }
    this.readCallbackResult();
    await this.refresh();
  }

  // Traduce el ?google=... que deja el callback del backend a un mensaje visible.
  private readCallbackResult(): void {
    const result = this.route.snapshot.queryParamMap.get('google');
    if (!result) return;
    const map: Record<string, Msg> = {
      success:           { type: 'success', text: 'Google Calendar conectado correctamente.' },
      denied:            { type: 'error',   text: 'Cancelaste la conexión con Google.' },
      no_refresh_token:  { type: 'error',   text: 'Google no entregó permiso permanente. Vuelve a intentar.' },
      error:             { type: 'error',   text: 'No se pudo conectar con Google Calendar.' },
    };
    const m = map[result];
    if (m) {
      this.msg.set(m);
      setTimeout(() => this.msg.set(null), 5000);
    }
  }

  private async refresh(): Promise<void> {
    this.loading.set(true);
    this.status.set(await this.gcal.getStatus(this.scope()));
    this.loading.set(false);
  }

  async connect(): Promise<void> {
    this.busy.set(true);
    const url = await this.gcal.getConnectUrl(this.scope());
    if (url) {
      window.location.href = url;
    } else {
      this.busy.set(false);
      this.flash({ type: 'error', text: 'No se pudo iniciar la conexión con Google.' });
    }
  }

  async toggleSync(): Promise<void> {
    const next = !this.status().syncEnabled;
    this.busy.set(true);
    const res = await this.gcal.setSync(this.scope(), next);
    this.busy.set(false);
    if (res.success) {
      this.status.update(s => ({ ...s, syncEnabled: res.syncEnabled }));
      this.flash({ type: 'info', text: next ? 'Sincronización activada.' : 'Sincronización pausada.' });
    } else {
      this.flash({ type: 'error', text: res.message ?? 'No se pudo actualizar.' });
    }
  }

  async disconnect(): Promise<void> {
    this.busy.set(true);
    const res = await this.gcal.disconnect(this.scope());
    this.busy.set(false);
    if (res.success) {
      this.status.set({ connected: false });
      this.flash({ type: 'info', text: 'Cuenta de Google desconectada.' });
    } else {
      this.flash({ type: 'error', text: res.message ?? 'No se pudo desconectar.' });
    }
  }

  private flash(m: Msg): void {
    this.msg.set(m);
    setTimeout(() => this.msg.set(null), 4000);
  }
}
