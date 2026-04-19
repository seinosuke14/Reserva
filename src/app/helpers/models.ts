// ─── Interfaces compartidas del dominio ──────────────────────────────────────
// Archivo centralizado para evitar duplicación de interfaces en componentes.

/** Servicio interno (dashboard) — incluye estado activo */
export interface IService {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
  isActive: boolean;
}

/** Servicio público (portal de reservas) — sin estado activo */
export interface IPublicService {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
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

/** Método de pago público */
export interface IPublicPaymentMethod {
  provider: 'webpay' | 'mercadopago' | 'transfer';
  transferInfo?: {
    bankName: string;
    accountType: string;
    accountNumber: string;
    rut: string;
    holderName: string;
    email: string;
  };
}
