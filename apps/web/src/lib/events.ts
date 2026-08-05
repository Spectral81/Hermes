import type { CampusEvent } from '@uteq/shared';

/** Fin del día local de una fecha ISO. */
function endOfLocalDay(iso: string): Date | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const end = new Date(d);
  end.setHours(23, 59, 59, 999);
  return end;
}

/**
 * Evento ya “pasado de fecha”:
 * - Si hay ends_at → desaparece al terminar ese día (no a la hora exacta).
 * - Si no → al terminar el día de starts_at.
 */
export function isCampusEventPast(
  event: Pick<CampusEvent, 'starts_at' | 'ends_at'>,
  now = new Date(),
): boolean {
  if (event.ends_at) {
    const end = endOfLocalDay(event.ends_at);
    if (end) return end.getTime() < now.getTime();
  }
  if (event.starts_at) {
    const end = endOfLocalDay(event.starts_at);
    if (end) return end.getTime() < now.getTime();
  }
  return false;
}

/** Eventos abiertos y vigentes para mapa / listados públicos. */
export function isCampusEventVisibleOnMap(
  event: Pick<CampusEvent, 'status' | 'starts_at' | 'ends_at'>,
  now = new Date(),
): boolean {
  return event.status === 'abierto' && !isCampusEventPast(event, now);
}
