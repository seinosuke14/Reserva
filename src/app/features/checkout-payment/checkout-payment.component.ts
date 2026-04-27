import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

type Provider = 'webpay' | 'flow' | 'mercadopago' | 'transfer';

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
  fields: { key: string; label: string; placeholder: string; type: string }[];
}

const PROVIDERS: ProviderConfig[] = [
  {
    provider: 'flow',
    label: 'Flow',
    description: 'Tarjetas, debito y transferencia electronica',
    icon: 'credit-card',
    fields: [
      { key: 'apiKey', label: 'API Key', placeholder: 'API Key de Flow', type: 'text' },
      { key: 'secretKey', label: 'Secret Key', placeholder: 'Secret Key de Flow', type: 'password' },
    ],
  },
  {
    provider: 'transfer',
    label: 'Transferencia Bancaria',
    description: 'Pago directo a cuenta bancaria',
    icon: 'bank',
    fields: [
      { key: 'bankName', label: 'Banco', placeholder: 'Ej: Banco Estado', type: 'text' },
      { key: 'accountType', label: 'Tipo de Cuenta', placeholder: 'Ej: Cuenta Corriente', type: 'text' },
      { key: 'accountNumber', label: 'Numero de Cuenta', placeholder: 'Ej: 12345678', type: 'text' },
      { key: 'rut', label: 'RUT', placeholder: 'Ej: 12.345.678-9', type: 'text' },
      { key: 'holderName', label: 'Titular', placeholder: 'Nombre del titular', type: 'text' },
      { key: 'email', label: 'Email de notificacion', placeholder: 'pagos@email.com', type: 'email' },
    ],
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
    const missing = config.fields.some(f => !credentials[f.key]?.trim());
    if (missing) {
      this.showFeedback('Todos los campos son obligatorios.', 'error');
      return;
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
