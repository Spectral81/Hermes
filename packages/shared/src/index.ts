export const UTEQ_EMAIL_DOMAIN = 'uteq.edu.mx';

export type UserRole =
  | 'estudiante'
  | 'admin_general'
  | 'responsable_robos'
  | 'responsable_accidentes'
  | 'responsable_infraestructura';

export interface Profile {
  id: string;
  matricula: string;
  nombre: string;
  apellidos: string;
  telefono: string;
  email: string;
  role: UserRole;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RegisterInput {
  matricula: string;
  nombre: string;
  apellidos: string;
  telefono: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export function isUteqEmail(email: string, domain = UTEQ_EMAIL_DOMAIN): boolean {
  const normalized = email.trim().toLowerCase();
  return normalized.endsWith(`@${domain}`) && normalized.includes('@');
}

export function validateRegister(input: RegisterInput, domain = UTEQ_EMAIL_DOMAIN): string | null {
  if (!input.matricula.trim()) return 'La matrícula es obligatoria.';
  if (!input.nombre.trim()) return 'El nombre es obligatorio.';
  if (!input.apellidos.trim()) return 'Los apellidos son obligatorios.';
  if (!input.telefono.trim()) return 'El teléfono es obligatorio.';
  if (!isUteqEmail(input.email, domain)) {
    return `Usa tu correo institucional @${domain}.`;
  }
  if (input.password.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
  return null;
}

export function validateLogin(input: LoginInput): string | null {
  if (!input.email.trim()) return 'El correo es obligatorio.';
  if (!input.password) return 'La contraseña es obligatoria.';
  return null;
}

export function getAuthErrorMessage(message: string): string {
  const msg = message?.trim() ?? '';
  if (!msg) return 'Error desconocido. Revisa Supabase y las variables en Railway.';

  if (msg.includes('Invalid login credentials')) {
    return 'Correo o contraseña incorrectos.';
  }
  if (msg.includes('Email not confirmed')) {
    return 'Confirma tu correo antes de iniciar sesión.';
  }
  if (msg.includes('User already registered') || msg.includes('already been registered')) {
    return 'Este correo ya está registrado.';
  }
  if (msg.includes('Database error saving new user')) {
    return 'Error en la base de datos. Ejecuta el SQL en Supabase (001_profiles.sql).';
  }
  if (msg.includes('duplicate key') || msg.includes('profiles_matricula') || msg.includes('profiles_email') || msg.includes('ya registrado')) {
    return 'Esa matrícula o correo ya está registrado.';
  }
  if (msg.includes('uteq.edu.mx') || msg.includes('institucionales') || msg.includes('matrícula') || msg.includes('teléfono')) {
    return msg;
  }
  if (msg.includes('Signups not allowed')) {
    return 'Registro desactivado en Supabase → Authentication → Providers → Email → Enable sign ups.';
  }
  if (msg.includes('Email rate limit')) {
    return 'Demasiados intentos. Espera unos minutos.';
  }
  if (msg.includes('Failed to fetch')) {
    return 'No se pudo conectar a Supabase. Revisa NEXT_PUBLIC_SUPABASE_URL en Railway.';
  }
  return msg;
}

export function formatAuthError(error: {
  message?: string;
  code?: string;
  status?: number | null;
}): string {
  const main = getAuthErrorMessage(error.message ?? '');
  const extra = [error.code, error.status ? `HTTP ${error.status}` : '']
    .filter(Boolean)
    .join(' · ');
  return extra && !main.includes(String(error.status ?? '')) ? `${main} (${extra})` : main;
}
