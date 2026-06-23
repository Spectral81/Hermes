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

export type IncidentType = 'robo' | 'accidente' | 'infraestructura' | 'panico';
export type InfraCategory = 'agua' | 'electricidad' | 'internet' | 'instalaciones' | 'equipamiento';
export type Severity = 'leve' | 'moderado' | 'grave';
export type IncidentStatus = 'activo' | 'en_proceso' | 'cerrado' | 'rechazado';

export interface Incident {
  id: string;
  type: IncidentType;
  category: InfraCategory | null;
  severity: Severity | null;
  description: string;
  lat: number;
  lng: number;
  status: IncidentStatus;
  likes_count: number;
  created_at: string;
  created_by: string;
  author_nombre: string | null;
  liked_by_me: boolean;
}

export interface CreateIncidentInput {
  type: IncidentType;
  description: string;
  lat: number;
  lng: number;
  category?: InfraCategory | null;
  severity?: Severity | null;
}

export const INCIDENT_LABELS: Record<IncidentType, string> = {
  robo: 'Robo',
  accidente: 'Accidente',
  infraestructura: 'Infraestructura',
  panico: 'Emergencia',
};

export const INFRA_CATEGORY_LABELS: Record<InfraCategory, string> = {
  agua: 'Agua',
  electricidad: 'Electricidad',
  internet: 'Internet',
  instalaciones: 'Instalaciones',
  equipamiento: 'Equipamiento',
};

export const SEVERITY_LABELS: Record<Severity, string> = {
  leve: 'Leve',
  moderado: 'Moderado',
  grave: 'Grave',
};

// Colores por tipo (estilo Waze)
export const INCIDENT_COLORS: Record<IncidentType, string> = {
  robo: '#ef4444',
  accidente: '#f97316',
  infraestructura: '#eab308',
  panico: '#dc2626',
};

/** Emoji en burbujas del mapa (móvil overlay + web) */
export const INCIDENT_EMOJI: Record<IncidentType, string> = {
  robo: '⚠️',
  accidente: '🚗',
  infraestructura: '🔧',
  panico: '🚨',
};

/** Nombres MaterialCommunityIcons para formularios y botones móvil */
export const INCIDENT_VECTOR_ICONS = {
  robo: 'shield-alert',
  accidente: 'car-emergency',
  infraestructura: 'wrench',
  panico: 'alarm-light',
} as const;

/** Iconos sugeridos por categoría de infraestructura */
export const INFRA_CATEGORY_ICONS = {
  agua: 'water',
  electricidad: 'flash',
  internet: 'wifi',
  instalaciones: 'office-building',
  equipamiento: 'desktop-classic',
} as const;

/** Iconos de navegación / acciones en la app móvil */
export const APP_ICONS = {
  brand: 'shield-check',
  profile: 'account',
  back: 'arrow-left',
  logout: 'logout',
  close: 'close',
  report: 'plus',
  recenter: 'crosshairs-gps',
  location: 'map-marker',
  like: 'thumb-up',
  likeOutline: 'thumb-up-outline',
} as const;

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} d`;
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
    return 'Demasiados intentos de correo. La cuenta puede estar creada: intenta iniciar sesión.';
  }
  if (msg.includes('Falta SUPABASE_SERVICE_ROLE_KEY')) {
    return 'Falta configurar SUPABASE_SERVICE_ROLE_KEY en Railway (Settings → API → service_role).';
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
