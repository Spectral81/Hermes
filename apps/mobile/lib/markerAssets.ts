import Constants from 'expo-constants';
import type { IncidentType } from '@uteq/shared';

const googleMapsKey =
  Constants.expoConfig?.android?.config?.googleMaps?.apiKey
  ?? Constants.expoConfig?.ios?.config?.googleMapsApiKey
  ?? process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY;

export const USE_GOOGLE_MAPS = Boolean(googleMapsKey);

export const PIN_COLORS: Partial<Record<IncidentType, string>> = {
  robo: 'red',
  accidente: 'orange',
  infraestructura: 'yellow',
  panico: 'purple',
};

export function pinColorFor(type: IncidentType): string {
  return PIN_COLORS[type] ?? 'red';
}
