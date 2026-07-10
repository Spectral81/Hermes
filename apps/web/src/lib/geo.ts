import { INCIDENT_MAX_AGE_HOURS, INCIDENT_NEARBY_RADIUS_M } from '@uteq/shared';

/** Distancia en metros entre dos puntos (fórmula de Haversine). */
export function distanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function isRecentIso(iso: string, maxAgeHours = INCIDENT_MAX_AGE_HOURS): boolean {
  const created = new Date(iso);
  if (Number.isNaN(created.getTime())) return true;
  const diffMs = Date.now() - created.getTime();
  return diffMs < maxAgeHours * 60 * 60 * 1000;
}

/** Alertas recientes y cercanas, ordenadas por más recientes primero. */
export function filterNearbyRecentIncidents<T extends { lat: number; lng: number; created_at: string }>(
  items: T[],
  user: { lat: number; lng: number } | null,
  options?: { maxAgeHours?: number; radiusM?: number },
): (T & { distanceM: number })[] {
  const maxAgeHours = options?.maxAgeHours ?? INCIDENT_MAX_AGE_HOURS;
  const radiusM = options?.radiusM ?? INCIDENT_NEARBY_RADIUS_M;

  const recent = items.filter((i) => isRecentIso(i.created_at, maxAgeHours));

  const withDistance = recent.map((i) => ({
    ...i,
    distanceM: user
      ? distanceMeters(user.lat, user.lng, i.lat, i.lng)
      : Number.POSITIVE_INFINITY,
  }));

  const nearby = user
    ? withDistance.filter((i) => i.distanceM <= radiusM)
    : withDistance;

  return nearby.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}
