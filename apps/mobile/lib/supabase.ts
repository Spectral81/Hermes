import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

let client: SupabaseClient | null = null;

function readSupabaseConfig() {
  const url = (
    Constants.expoConfig?.extra?.supabaseUrl ?? process.env.EXPO_PUBLIC_SUPABASE_URL
  )?.trim();
  const key = (
    Constants.expoConfig?.extra?.supabaseAnonKey ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  )?.trim();
  return { url, key };
}

export function getSupabase(): SupabaseClient {
  if (client) return client;

  const { url, key } = readSupabaseConfig();
  if (!url || !key) {
    throw new Error(
      'Faltan EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY. '
      + 'Créalos en apps/mobile/.env o en la raíz del proyecto (.env).',
    );
  }

  client = createClient(url, key, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });

  return client;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const value = (getSupabase() as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === 'function' ? value.bind(getSupabase()) : value;
  },
});
