import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

type Provider = 'webpay' | 'flow' | 'mercadopago' | 'transfer' | 'khipu' | 'stripe';

interface IPaymentMethod {
  id: string;
  provider: Provider;
  isActive: boolean;
  credentials: Record<string, string>;
}

interface ProviderConfig {
  provider: Provider;
  label: string;
  description: string;
  icon: string;
  fields: { key: string; label: string; placeholder: string; type: string; maxlength?: number; inputmode?: string; options?: string[] }[];
}

const CHILEAN_BANKS = [
  'Banco de Chile',
  'Banco Estado',
  'Banco Santander',
  'Banco BCI',
  'Banco Itaú',
  'Banco Security',
  'Banco Falabella',
  'Banco Ripley',
  'Banco BICE',
  'Banco Internacional',
  'Scotiabank',
  'Coopeuch',
  'HSBC Bank',
  'Banco BTG Pactual',
];

const ACCOUNT_TYPES = [
  'Cuenta Corriente',
  'Cuenta Vista / RUT',
  'Cuenta de Ahorro',
  'Cuenta Empresa',
];

const PROVIDERS: ProviderConfig[] = [
  {
    provider: 'khipu',
    label: 'Khipu',
    description: 'Transferencia bancaria automatica (confirmacion instantanea)',
    icon: 'bank-transfer',
    fields: [
      { key: 'apiKey', label: 'API Key', placeholder: 'Llave de cobrador Khipu', type: 'password', maxlength: 128 },
    ],
  },
  {
    provider: 'flow',
    label: 'Flow',
    description: 'Tarjetas, debito y transferencia electronica (credenciales propias)',
    icon: 'credit-card',
    fields: [
      { key: 'apiKey',     label: 'API Key',    placeholder: 'API Key de Flow',    type: 'text',     maxlength: 128 },
      { key: 'secretKey',  label: 'Secret Key', placeholder: 'Secret Key de Flow', type: 'password', maxlength: 128 },
    ],
  },
  {
    provider: 'mercadopago',
    label: 'MercadoPago',
    description: 'Tarjetas y medios digitales (credenciales propias)',
    icon: 'wallet',
    fields: [
      { key: 'accessToken', label: 'Access Token', placeholder: 'APP_USR-xxxxx... (token de produccion)', type: 'password', maxlength: 256 },
    ],
  },
  {
    provider: 'transfer',
    label: 'Transferencia Bancaria Manual',
    description: 'El cliente te transfiere directamente y confirmas el pago',
    icon: 'bank',
    fields: [
      { key: 'bankName',      label: 'Banco',                 placeholder: 'Selecciona un banco',          type: 'select', options: CHILEAN_BANKS },
      { key: 'accountType',   label: 'Tipo de Cuenta',        placeholder: 'Selecciona el tipo de cuenta', type: 'select', options: ACCOUNT_TYPES },
      { key: 'accountNumber', label: 'Numero de Cuenta',      placeholder: 'Ej: 12345678',                 type: 'text',  maxlength: 20, inputmode: 'numeric' },
      { key: 'rut',           label: 'RUT',                   placeholder: 'Ej: 12.345.678-9',             type: 'text',  maxlength: 12 },
      { key: 'holderName',    label: 'Titular',               placeholder: 'Nombre del titular',           type: 'text',  maxlength: 60 },
      { key: 'email',         label: 'Email de notificacion', placeholder: 'pagos@email.com',              type: 'email', maxlength: 254 },
    ],
  },
  {
    provider: 'stripe',
    label: 'Boton de pago de plataforma',
    description: 'Cobro gestionado por la plataforma. Se descuenta comision + fee Stripe al momento del pago.',
    icon: 'platform',
    fields: [],
  },
];

@Component({
  selector: 'app-checkout-payment',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './checkout-payment.component.html',
  styleUrls: ['./checkout-payment.component.scss'],
})
export class CheckoutPaymentComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  readonly providers = PROVIDERS;

  readonly providerSections = [
    {
      label: 'Nuestro botón de pago',
      subtitle: 'Cobro gestionado por la plataforma — comisión fija descontada al profesional',
      providers: PROVIDERS.filter(p => p.provider === 'stripe'),
    },
    {
      label: 'Métodos de pago externos',
      subtitle: 'El profesional usa sus propias credenciales — el dinero va directo a su cuenta',
      providers: PROVIDERS.filter(p => (['flow', 'mercadopago'] as Provider[]).includes(p.provider)),
    },
    {
      label: 'Transferencia bancaria',
      subtitle: 'El pago va directamente del cliente al profesional',
      providers: PROVIDERS.filter(p => (['khipu', 'transfer'] as Provider[]).includes(p.provider)),
    },
  ];

  isLoading = signal(true);
  savedMethods = signal<IPaymentMethod[]>([]);
  expandedProvider = signal<Provider | null>(null);
  formData = signal<Record<string, string>>({});
  isSaving = signal(false);
  feedbackMsg = signal('');
  feedbackType = signal<'success' | 'error' | ''>('');
  visibleFields = signal<Set<string>>(new Set());

  async ngOnInit() {
    await this.loadMethods();
    this.isLoading.set(false);
  }

  private async loadMethods() {
    try {
      const data = await firstValueFrom(
        this.http.get<IPaymentMethod[]>(`${this.apiUrl}/payment-methods`)
      );
      this.savedMethods.set(data);
    } catch { /* sin metodos configurados */ }
  }

  getMethod(provider: Provider): IPaymentMethod | undefined {
    return this.savedMethods().find(m => m.provider === provider);
  }

  isConfigured(provider: Provider): boolean {
    return !!this.getMethod(provider);
  }

  isActive(provider: Provider): boolean {
    return this.getMethod(provider)?.isActive ?? false;
  }

  toggleExpand(provider: Provider): void {
    if (this.expandedProvider() === provider) {
      this.expandedProvider.set(null);
      return;
    }
    const method = this.getMethod(provider);
    this.formData.set(method?.credentials ? { ...method.credentials } : {});
    this.expandedProvider.set(provider);
  }

  getFieldValue(key: string): string {
    return this.formData()[key] ?? '';
  }

  setFieldValue(key: string, value: string): void {
    this.formData.update(data => ({ ...data, [key]: value }));
  }

  toggleFieldVisibility(key: string): void {
    this.visibleFields.update(set => {
      const next = new Set(set);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  isFieldVisible(key: string): boolean {
    return this.visibleFields().has(key);
  }

  getFieldType(field: { key: string; type: string }): string {
    if (field.type === 'password') {
      return this.isFieldVisible(field.key) ? 'text' : 'password';
    }
    return field.type;
  }

  async saveMethod(config: ProviderConfig): Promise<void> {
    const credentials = this.formData();
    if (config.fields.length > 0) {
      const missing = config.fields.some(f => f.type !== 'select' && !credentials[f.key]?.trim() || f.type === 'select' && !credentials[f.key]);
      if (missing) {
        this.showFeedback('Todos los campos son obligatorios.', 'error');
        return;
      }
      const exceeded = config.fields.find(f => f.maxlength && (credentials[f.key]?.length ?? 0) > f.maxlength);
      if (exceeded) {
        this.showFeedback(`"${exceeded.label}" supera el límite de ${exceeded.maxlength} caracteres.`, 'error');
        return;
      }
    }

    this.isSaving.set(true);
    try {
      const existing = this.getMethod(config.provider);
      if (existing) {
        await firstValueFrom(
          this.http.put(`${this.apiUrl}/payment-methods/${existing.id}`, { credentials })
        );
      } else {
        await firstValueFrom(
          this.http.post(`${this.apiUrl}/payment-methods`, {
            provider: config.provider,
            credentials,
          })
        );
      }
      await this.loadMethods();
      this.showFeedback('Credenciales guardadas correctamente.', 'success');
    } catch (err: any) {
      this.showFeedback(err?.error?.message ?? 'Error al guardar.', 'error');
    } finally {
      this.isSaving.set(false);
    }
  }

  async toggleActive(provider: Provider): Promise<void> {
    const method = this.getMethod(provider);
    if (!method) return;
    try {
      await firstValueFrom(
        this.http.put(`${this.apiUrl}/payment-methods/${method.id}`, {
          isActive: !method.isActive,
        })
      );
      await this.loadMethods();
    } catch { /* silencioso */ }
  }

  async removeMethod(provider: Provider): Promise<void> {
    const method = this.getMethod(provider);
    if (!method) return;
    try {
      await firstValueFrom(
        this.http.delete(`${this.apiUrl}/payment-methods/${method.id}`)
      );
      await this.loadMethods();
      this.expandedProvider.set(null);
      this.showFeedback('Metodo de pago eliminado.', 'success');
    } catch { /* silencioso */ }
  }

  private showFeedback(msg: string, type: 'success' | 'error') {
    this.feedbackMsg.set(msg);
    this.feedbackType.set(type);
    setTimeout(() => {
      this.feedbackMsg.set('');
      this.feedbackType.set('');
    }, 4000);
  }
}
