import { createClient } from '@supabase/supabase-js';

export async function confirmUserEmail(userId: string): Promise<{ ok: boolean; error?: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceKey) {
    return { ok: false, error: 'Falta SUPABASE_SERVICE_ROLE_KEY en Railway.' };
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: { user }, error: fetchError } = await admin.auth.admin.getUserById(userId);
  if (fetchError || !user) {
    return { ok: false, error: fetchError?.message ?? 'Usuario no encontrado.' };
  }

  if (user.email_confirmed_at) {
    return { ok: true };
  }

  const createdAt = new Date(user.created_at).getTime();
  if (Date.now() - createdAt > 15 * 60 * 1000) {
    return { ok: false, error: 'Ventana de confirmación expirada. Inicia sesión o contacta soporte.' };
  }

  const { error } = await admin.auth.admin.updateUserById(userId, { email_confirm: true });
  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}
