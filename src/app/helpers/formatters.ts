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

/** Nombres visibles de los planes. El id interno no cambia (ej: 'pro_max' → 'Empresa'). */
const PLAN_LABELS: Record<string, string> = {
  free: 'Gratuito', basic: 'Básico', pro: 'Pro', team: 'Equipo', pro_max: 'Empresa',
};

/** Devuelve el nombre visible de un plan a partir de su id. */
export const planLabel = (plan: string | null | undefined): string =>
  plan ? (PLAN_LABELS[plan] ?? plan) : '';

/** Parse seguro: "YYYY-MM-DD" se ancla a mediodía local para evitar desfase de zona horaria */
const parseDate = (dateStr: string): Date =>
  dateStr.includes('T') ? new Date(dateStr) : new Date(dateStr + 'T12:00:00');

/** Formatea una fecha YYYY-MM-DD a texto legible (ej: "lunes, 5 de mayo") */
export const formatDateLong = (dateStr: string): string =>
  new Intl.DateTimeFormat('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long'
  }).format(parseDate(dateStr));

/** Fecha completa con año (ej: "lunes, 5 de mayo de 2025") */
export const formatDateFull = (dateStr: string | null): string =>
  dateStr
    ? parseDate(dateStr).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : '';

/** Fecha corta (ej: "05 may. 2025") */
export const formatDateShort = (dateStr: string): string =>
  parseDate(dateStr).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });

/** Fecha media sin día de semana (ej: "5 de mayo de 2025") */
export const formatDateMedium = (dateStr: string | null): string =>
  dateStr
    ? parseDate(dateStr).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';
