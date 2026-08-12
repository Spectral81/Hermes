/** Centro aproximado del campus UTEQ (Querétaro). */
export const UTEQ_CAMPUS_CENTER = { lat: 20.6534, lng: -100.4045 } as const;

/** Puntos de referencia legibles (aprox.) para el asistente — nunca se exponen como coords al usuario. */
const LANDMARKS: Array<{ name: string; lat: number; lng: number }> = [
  { name: 'el centro del campus', lat: 20.6534, lng: -100.4045 },
  { name: 'el estacionamiento', lat: 20.6546, lng: -100.4052 },
  { name: 'el acceso principal', lat: 20.6526, lng: -100.4036 },
  { name: 'la zona de edificios académicos', lat: 20.6538, lng: -100.4038 },
  { name: 'las canchas / área deportiva', lat: 20.6542, lng: -100.406 },
  { name: 'la zona de cafetería / servicios', lat: 20.6529, lng: -100.4048 },
];

function toRad(d: number) {
  return (d * Math.PI) / 180;
}

export function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function cardinalDirection(from: { lat: number; lng: number }, to: { lat: number; lng: number }) {
  const y = Math.sin(toRad(to.lng - from.lng)) * Math.cos(toRad(to.lat));
  const x =
    Math.cos(toRad(from.lat)) * Math.sin(toRad(to.lat)) -
    Math.sin(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.cos(toRad(to.lng - from.lng));
  const brng = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  const dirs = ['norte', 'noreste', 'este', 'sureste', 'sur', 'suroeste', 'oeste', 'noroeste'];
  return dirs[Math.round(brng / 45) % 8];
}

/** Descripción humana de una ubicación en campus (sin coordenadas). */
export function describeCampusLocation(lat: number, lng: number): string {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return 'ubicación no disponible';

  let best = LANDMARKS[0];
  let bestDist = Infinity;
  for (const lm of LANDMARKS) {
    const d = distanceMeters({ lat, lng }, lm);
    if (d < bestDist) {
      bestDist = d;
      best = lm;
    }
  }

  if (bestDist <= 120) return `cerca de ${best.name}`;
  if (bestDist <= 250) return `por ${best.name}`;

  const fromCenter = distanceMeters({ lat, lng }, UTEQ_CAMPUS_CENTER);
  const dir = cardinalDirection(UTEQ_CAMPUS_CENTER, { lat, lng });
  if (fromCenter <= 100) return 'cerca del centro del campus';
  if (fromCenter <= 350) return `en la zona ${dir} del campus`;
  return `hacia el ${dir}, en los alrededores del campus`;
}
