/** Formatea un número como precio CLP (ej: $15.000) */
export const formatCLP = (value: number): string =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value);

/** Formatea una fecha YYYY-MM-DD a texto legible (ej: "lunes, 5 de mayo") */
export const formatDateLong = (dateStr: string): string =>
  new Intl.DateTimeFormat('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long'
  }).format(new Date(dateStr + 'T12:00:00'));
