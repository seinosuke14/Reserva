// ─── Interfaces compartidas del dominio ──────────────────────────────────────
// Archivo centralizado para evitar duplicación de interfaces en componentes.

/** Categoría de servicios (propia del profesional o compartida por la empresa) */
export interface IServiceCategory {
  id: string;
  name: string;
}

/** Servicio interno (dashboard) — incluye estado activo */
export interface IService {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
  isActive: boolean;
  serviceImage?: string | null;
  categoryId?: string | null;
  category?: IServiceCategory | null;
}

/** Servicio público (portal de reservas) — sin estado activo */
export interface IPublicService {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
  serviceImage?: string | null;
  categoryId?: string | null;
}

/** Slot de tiempo */
export interface ITimeSlot {
  time: string;
  available: boolean;
}

/** Disponibilidad de un día */
export interface IDayAvailability {
  date: string;
  slots: ITimeSlot[];
}

/** Datos bancarios para pago por transferencia */
export interface ITransferInfo {
  bankName: string;
  accountType: string;
  accountNumber: string;
  rut: string;
  holderName: string;
  email: string;
}

/** Método de pago público */
export interface IPublicPaymentMethod {
  provider: 'webpay' | 'flow' | 'mercadopago' | 'transfer' | 'khipu' | 'mercadopago_connect';
  transferInfo?: ITransferInfo;
}
