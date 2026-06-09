// ─── Utilidades de disponibilidad de horarios ─────────────────────────────────
// Lógica compartida entre los portales públicos de reserva (profesional y empresa).

import { IDayAvailability, ITimeSlot } from './models';

/** Fecha local de hoy en formato YYYY-MM-DD */
export const todayYmd = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** True si un slot "HH:mm" de hoy ya pasó */
export const isSlotPast = (slotTime: string): boolean => {
  const [h, m] = slotTime.split(':').map(Number);
  const slot   = new Date();
  slot.setHours(h, m, 0, 0);
  return slot < new Date();
};

/** Duración de un bloque inferida del paso entre los dos primeros slots (default 30min) */
export const inferSlotDuration = (slots: ITimeSlot[]): number => {
  if (slots.length < 2) return 30;
  const [h1, m1] = slots[0].time.split(':').map(Number);
  const [h2, m2] = slots[1].time.split(':').map(Number);
  return (h2 * 60 + m2) - (h1 * 60 + m1);
};

/**
 * Filtra la disponibilidad según la duración del servicio.
 * Marca como no disponibles los slots de hoy que ya pasaron y aquellos sin
 * suficientes bloques consecutivos libres (ej: 90min = 3 bloques de 30min seguidos).
 */
export function filterAvailabilityByDuration(
  avail: IDayAvailability[],
  duration: number | null | undefined,
): IDayAvailability[] {
  if (!duration) return avail;

  const todayStr = todayYmd();

  return avail.map(day => {
    const isToday      = day.date === todayStr;
    const slotDur      = inferSlotDuration(day.slots);
    const blocksNeeded = Math.ceil(duration / slotDur);

    const withPast = day.slots.map(slot => {
      if (isToday && isSlotPast(slot.time)) return { ...slot, available: false };
      return slot;
    });

    if (blocksNeeded <= 1) return { ...day, slots: withPast };

    const slotMap = new Map(withPast.map(s => [s.time, s.available]));

    const filteredSlots = withPast.map(slot => {
      if (!slot.available) return slot;

      const [h, m]   = slot.time.split(':').map(Number);
      const startMin = h * 60 + m;
      let canBook    = true;

      for (let b = 1; b < blocksNeeded; b++) {
        const nextMin  = startMin + b * slotDur;
        const nextTime = `${String(Math.floor(nextMin / 60)).padStart(2, '0')}:${String(nextMin % 60).padStart(2, '0')}`;
        if (!slotMap.get(nextTime)) { canBook = false; break; }
      }

      return canBook ? slot : { ...slot, available: false };
    });

    return { ...day, slots: filteredSlots };
  });
}
