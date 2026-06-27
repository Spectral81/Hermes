import { toAuthErrorMessage } from '@uteq/shared';
import Constants from 'expo-constants';

export function getWebApiUrl(): string | null {
  const fromEnv = process.env.EXPO_PUBLIC_WEB_API_URL?.replace(/\/$/, '');
  if (fromEnv) return fromEnv;

  const extra = Constants.expoConfig?.extra as { webApiUrl?: string } | undefined;
  return extra?.webApiUrl?.replace(/\/$/, '') ?? null;
}

export async function registerViaWebApi(
  baseUrl: string,
  input: {
    matricula: string;
    nombre: string;
    apellidos: string;
    telefono: string;
    email: string;
    password: string;
  },
): Promise<{
  ok: boolean;
  autoLogin?: boolean;
  email?: string;
  error?: string;
  code?: string;
}> {
  const res = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  const text = await res.text();
  let result: {
    ok?: boolean;
    autoLogin?: boolean;
    email?: string;
    error?: unknown;
    code?: string;
  } | null = null;

  try {
    result = text ? JSON.parse(text) : null;
  } catch {
    result = null;
  }

  if (!res.ok) {
    return {
      ok: false,
      error: toAuthErrorMessage(
        result?.error ?? result,
        `Error del servidor (HTTP ${res.status}).`,
      ),
      code: result?.code,
    };
  }

  return { ok: true, autoLogin: result?.autoLogin, email: result?.email };
}

export async function confirmRegistrationViaWebApi(
  baseUrl: string,
  userId: string,
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`${baseUrl}/api/auth/confirm-registration`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });

  const result = await res.json().catch(() => null);
  if (!res.ok) {
    return { ok: false, error: result?.error ?? 'No se pudo confirmar el registro.' };
  }

  return { ok: true };
}
