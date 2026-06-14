import { PlanType } from '../services/professional.service';

/**
 * Capacidades por plan — espejo de api-crm/src/config/planCapabilities.js.
 * `free` es espejo de `pro` (trial completo). Mantener ambos archivos en sync.
 */

export type PaymentProvider = 'transfer' | 'mercadopago_connect' | 'khipu' | 'flow' | 'mercadopago';

export type CapabilityKey =
  | 'analyticsFull'
  | 'reviews'
  | 'profileCustomization'
  | 'googleCalendar'
  | 'marketplace'
  | 'emailMarketing'
  | 'coupons'
  | 'multiProfessional';

export interface PlanCapabilities {
  analyticsFull: boolean;
  reviews: boolean;
  profileCustomization: boolean;
  googleCalendar: boolean;
  marketplace: boolean;
  emailMarketing: boolean;
  coupons: boolean;
  multiProfessional: boolean;
  waLimit: number;
  paymentProviders: PaymentProvider[];
}

const ALL_PAYMENT_PROVIDERS: PaymentProvider[] = ['transfer', 'mercadopago_connect', 'khipu', 'flow', 'mercadopago'];

const PRO_CAPABILITIES: PlanCapabilities = {
  analyticsFull:        true,
  reviews:              true,
  profileCustomization: true,
  googleCalendar:       true,  // futuro
  marketplace:          true,  // futuro
  emailMarketing:       true,  // futuro
  coupons:              true,  // futuro
  multiProfessional:    false,
  waLimit:              60,
  paymentProviders:     ALL_PAYMENT_PROVIDERS,
};

export const PLAN_CAPABILITIES: Record<PlanType, PlanCapabilities> = {
  free: { ...PRO_CAPABILITIES },
  pro:  { ...PRO_CAPABILITIES },
  basic: {
    analyticsFull:        false,
    reviews:              true,
    profileCustomization: false,
    googleCalendar:       false,
    marketplace:          false,
    emailMarketing:       false,
    coupons:              false,
    multiProfessional:    false,
    waLimit:              50,
    paymentProviders:     ['transfer', 'mercadopago_connect'],
  },
  team:    { ...PRO_CAPABILITIES, multiProfessional: true, waLimit: 100 },
  pro_max: { ...PRO_CAPABILITIES, multiProfessional: true, waLimit: 100 },
};

// Fallback al plan más restrictivo si el plan es null/desconocido.
export const getCapabilities = (plan: PlanType | null | undefined): PlanCapabilities =>
  (plan && PLAN_CAPABILITIES[plan]) || PLAN_CAPABILITIES.basic;

export const canPlan = (plan: PlanType | null | undefined, key: CapabilityKey): boolean =>
  !!getCapabilities(plan)[key];

export const allowedPaymentProviders = (plan: PlanType | null | undefined): PaymentProvider[] =>
  getCapabilities(plan).paymentProviders;
