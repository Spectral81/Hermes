import type { IncidentStatus } from '@uteq/shared';
import type { StatusKind } from '@/lib/theme';

export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
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
  if (!Number.isFinite(meters)) return '—';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function incidentStatusKind(status: IncidentStatus, likes: number): StatusKind {
  if (likes >= 3) return 'verified';
  switch (status) {
    case 'activo':
      return 'active';
    case 'en_proceso':
      return 'resolving';
    case 'cerrado':
      return 'resolved';
    case 'rechazado':
      return 'false';
    default:
      return 'pending';
  }
}
