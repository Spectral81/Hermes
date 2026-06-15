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
  if (message.includes('Invalid login credentials')) {
    return 'Correo o contraseña incorrectos.';
  }
  if (message.includes('Email not confirmed')) {
    return 'Confirma tu correo antes de iniciar sesión.';
  }
  if (message.includes('User already registered')) {
    return 'Este correo ya está registrado.';
  }
  if (message.includes('uteq.edu.mx') || message.includes('institucionales')) {
    return message;
  }
  return 'Ocurrió un error. Intenta de nuevo.';
}
