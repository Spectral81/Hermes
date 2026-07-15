export const LOCATION_STORAGE_KEY = 'hermes_user_location';

/** Ubicación guardada más antigua que esto se ignora (ms). */
const LOCATION_MAX_AGE_MS = 30 * 60 * 1000;

export interface UserCoords {
  lat: number;
  lng: number;
}

export async function requestUserLocation(
  options?: PositionOptions,
): Promise<UserCoords | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return null;

  const opts: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 12000,
    maximumAge: 60_000,
    ...options,
  };

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),
      () => resolve(null),
      opts,
    );
  });
}

/** Intenta alta precisión y luego un intento más tolerante. */
export async function requestUserLocationReliable(): Promise<UserCoords | null> {
  const precise = await requestUserLocation({
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 30_000,
  });
  if (precise) return precise;

  return requestUserLocation({
    enableHighAccuracy: false,
    timeout: 15000,
    maximumAge: 120_000,
  });
}

export function saveUserLocation(coords: UserCoords) {
  try {
    sessionStorage.setItem(
      LOCATION_STORAGE_KEY,
      JSON.stringify({ ...coords, ts: Date.now() }),
    );
  } catch {
    // ignore storage errors
  }
}

export function readStoredUserLocation(): UserCoords | null {
  try {
    const raw = sessionStorage.getItem(LOCATION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { lat?: number; lng?: number; ts?: number };
    if (!Number.isFinite(parsed.lat) || !Number.isFinite(parsed.lng)) return null;
    if (typeof parsed.ts === 'number' && Date.now() - parsed.ts > LOCATION_MAX_AGE_MS) {
      sessionStorage.removeItem(LOCATION_STORAGE_KEY);
      return null;
    }
    return { lat: parsed.lat!, lng: parsed.lng! };
  } catch {
    return null;
  }
}

export async function getGeolocationPermission(): Promise<PermissionState | 'unsupported'> {
  if (typeof navigator === 'undefined' || !navigator.permissions?.query) {
    return 'unsupported';
  }
  try {
    const status = await navigator.permissions.query({ name: 'geolocation' });
    return status.state;
  } catch {
    return 'unsupported';
  }
}
