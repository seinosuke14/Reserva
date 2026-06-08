/** Formatea un número como precio CLP (ej: $15.000) */
export const formatCLP = (value: number): string =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value);

/**
 * IVA chileno. Debe coincidir con el helper del backend (api-crm/src/utils/vat.js).
 * Los precios de planes en BD son NETOS; al cliente se le cobra y se le muestra con IVA incluido.
 */
export const VAT_RATE = 0.19;

/** Valor con IVA incluido, redondeado al peso (igual criterio que el backend). */
export const withVat = (net: number): number => Math.round((net || 0) * (1 + VAT_RATE));

/** Formatea una fecha YYYY-MM-DD a texto legible (ej: "lunes, 5 de mayo") */
export const formatDateLong = (dateStr: string): string =>
  new Intl.DateTimeFormat('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long'
  }).format(new Date(dateStr + 'T12:00:00'));
