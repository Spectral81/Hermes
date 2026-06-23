const path = require('path');
const fs = require('fs');

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const i = trimmed.indexOf('=');
    if (i <= 0) continue;
    const key = trimmed.slice(0, i).trim();
    let val = trimmed.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"'))
      || (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnv(path.join(__dirname, '.env'));
loadEnv(path.join(__dirname, '../../.env'));

const base = require('./app.json').expo;
const googleMapsKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY;

/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  ...base,
  ios: {
    ...base.ios,
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'UTEQ Seguridad usa tu ubicación para mostrar y reportar incidentes cercanos.',
    },
    ...(googleMapsKey
      ? { config: { googleMapsApiKey: googleMapsKey } }
      : {}),
  },
  android: {
    ...base.android,
    permissions: ['ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION'],
    ...(googleMapsKey
      ? { config: { googleMaps: { apiKey: googleMapsKey } } }
      : {}),
  },
  plugins: [
    'expo-router',
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'UTEQ Seguridad usa tu ubicación para mostrar y reportar incidentes cercanos.',
      },
    ],
  ],
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    webApiUrl: process.env.EXPO_PUBLIC_WEB_API_URL,
  },
};
