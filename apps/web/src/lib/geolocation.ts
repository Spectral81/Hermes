export const LOCATION_STORAGE_KEY = 'hermes_user_location';

export interface UserCoords {
  lat: number;
  lng: number;
}

export async function requestUserLocation(): Promise<UserCoords | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return null;

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
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
    const parsed = JSON.parse(raw) as { lat?: number; lng?: number };
    if (!Number.isFinite(parsed.lat) || !Number.isFinite(parsed.lng)) return null;
    return { lat: parsed.lat!, lng: parsed.lng! };
  } catch {
    return null;
  }
}
