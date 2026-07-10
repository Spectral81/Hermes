import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { User } from '@supabase/supabase-js';

/** Usuario autenticado vía cookie (web) o Bearer JWT (app móvil). */
export async function getRequestUser(request: Request): Promise<User | null> {
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token) {
      const admin = createAdminClient();
      const { data, error } = await admin.auth.getUser(token);
      if (!error && data.user) return data.user;
    }
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
