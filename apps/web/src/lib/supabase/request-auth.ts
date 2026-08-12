import { createClient as createSupabaseJsClient } from '@supabase/supabase-js';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/** Usuario autenticado vía cookie (web) o Bearer JWT (app móvil). */
export async function getRequestUser(request: Request): Promise<User | null> {
  const authHeader =
    request.headers.get('Authorization') ?? request.headers.get('authorization');

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token) {
      try {
        const admin = createAdminClient();
        const { data, error } = await admin.auth.getUser(token);
        if (!error && data.user) return data.user;
        if (error) {
          console.warn('[auth] admin.getUser(token) failed:', error.message);
        }
      } catch (e) {
        console.warn('[auth] admin client error:', e);
      }

      // Fallback: validar JWT con anon key (por si el service role falla en prod).
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
      const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
      if (url && anon) {
        const client = createSupabaseJsClient(url, anon, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        const { data, error } = await client.auth.getUser(token);
        if (!error && data.user) return data.user;
        if (error) {
          console.warn('[auth] anon.getUser(token) failed:', error.message);
        }
      }
    }
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
