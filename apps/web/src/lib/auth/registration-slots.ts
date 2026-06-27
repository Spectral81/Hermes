import type { SupabaseClient, User } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';

export interface RegistrationAvailability {
  emailAvailable: boolean;
  matriculaAvailable: boolean;
  canRegister: boolean;
  emailMessage: string | null;
  matriculaMessage: string | null;
}

async function findAuthUserByEmail(admin: SupabaseClient, email: string): Promise<User | null> {
  const target = email.trim().toLowerCase();
  let page = 1;

  while (page <= 10) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);

    const match = data.users.find((u) => u.email?.trim().toLowerCase() === target);
    if (match) return match;

    if (data.users.length < 200) break;
    page += 1;
  }

  return null;
}

async function isAuthUserActive(admin: SupabaseClient, userId: string): Promise<boolean> {
  const { data, error } = await admin.auth.admin.getUserById(userId);
  return !error && Boolean(data.user);
}

async function getProfileByEmail(admin: SupabaseClient, email: string) {
  const { data } = await admin
    .from('profiles')
    .select('id, email, matricula')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle();
  return data;
}

async function getProfileByMatricula(admin: SupabaseClient, matricula: string) {
  const { data } = await admin
    .from('profiles')
    .select('id, email, matricula')
    .eq('matricula', matricula.trim())
    .maybeSingle();
  return data;
}

/** Consulta en vivo contra Supabase (auth + profiles). */
export async function checkRegistrationAvailability(
  email: string,
  matricula: string,
): Promise<RegistrationAvailability> {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedMatricula = matricula.trim();

  if (!normalizedEmail && !normalizedMatricula) {
    return {
      emailAvailable: true,
      matriculaAvailable: true,
      canRegister: false,
      emailMessage: null,
      matriculaMessage: null,
    };
  }

  try {
    const admin = createAdminClient();

    let emailAvailable = true;
    let matriculaAvailable = true;
    let emailMessage: string | null = null;
    let matriculaMessage: string | null = null;

    if (normalizedEmail) {
      const authUser = await findAuthUserByEmail(admin, normalizedEmail);
      const profileByEmail = await getProfileByEmail(admin, normalizedEmail);

      if (authUser && profileByEmail && authUser.id === profileByEmail.id) {
        emailAvailable = false;
        emailMessage = 'Este correo ya está registrado. Inicia sesión.';
      } else if (authUser && !profileByEmail) {
        emailMessage = 'Detectamos un registro incompleto; al registrarte se liberará.';
      } else if (!authUser && profileByEmail) {
        emailMessage = 'Perfil anterior sin cuenta activa; puedes registrarte.';
      }
    }

    if (normalizedMatricula) {
      const profileByMatricula = await getProfileByMatricula(admin, normalizedMatricula);

      if (profileByMatricula) {
        const active = await isAuthUserActive(admin, profileByMatricula.id);
        if (active) {
          if (profileByMatricula.email === normalizedEmail || !normalizedEmail) {
            matriculaAvailable = false;
            matriculaMessage = 'Esta matrícula ya está registrada.';
          } else {
            matriculaAvailable = false;
            matriculaMessage = 'Esta matrícula ya está registrada con otro correo.';
          }
        } else {
          matriculaMessage = 'Matrícula de registro anterior; puedes usarla de nuevo.';
        }
      }
    }

    return {
      emailAvailable,
      matriculaAvailable,
      canRegister: emailAvailable && matriculaAvailable,
      emailMessage,
      matriculaMessage,
    };
  } catch {
    return {
      emailAvailable: true,
      matriculaAvailable: true,
      canRegister: true,
      emailMessage: null,
      matriculaMessage: null,
    };
  }
}

/** Elimina restos huérfanos antes de crear la cuenta. */
export async function prepareRegistrationSlots(
  email: string,
  matricula: string,
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedMatricula = matricula.trim();

  let admin: SupabaseClient;
  try {
    admin = createAdminClient();
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Falta SUPABASE_SERVICE_ROLE_KEY en Railway.',
      status: 503,
    };
  }

  const authUser = await findAuthUserByEmail(admin, normalizedEmail);
  const profileByEmail = await getProfileByEmail(admin, normalizedEmail);
  const profileByMatricula = await getProfileByMatricula(admin, normalizedMatricula);

  if (authUser && profileByEmail && authUser.id === profileByEmail.id) {
    return {
      ok: false,
      error: 'Este correo ya está registrado. Inicia sesión.',
      status: 409,
    };
  }

  if (profileByMatricula) {
    const matriculaActive = await isAuthUserActive(admin, profileByMatricula.id);
    if (matriculaActive && profileByMatricula.email !== normalizedEmail) {
      return {
        ok: false,
        error: 'Esta matrícula ya está registrada con otro correo.',
        status: 409,
      };
    }
    if (!matriculaActive || profileByMatricula.email === normalizedEmail) {
      await admin.from('profiles').delete().eq('id', profileByMatricula.id);
    }
  }

  if (authUser && !profileByEmail) {
    await admin.auth.admin.deleteUser(authUser.id);
  }

  if (profileByEmail && !authUser) {
    await admin.from('profiles').delete().eq('id', profileByEmail.id);
  }

  return { ok: true };
}

export async function createAuthUserWithAdmin(
  admin: SupabaseClient,
  input: {
    email: string;
    password: string;
    matricula: string;
    nombre: string;
    apellidos: string;
    telefono: string;
  },
) {
  return admin.auth.admin.createUser({
    email: input.email.trim().toLowerCase(),
    password: input.password,
    email_confirm: true,
    user_metadata: {
      matricula: input.matricula.trim(),
      nombre: input.nombre.trim(),
      apellidos: input.apellidos.trim(),
      telefono: input.telefono.trim(),
    },
  });
}
