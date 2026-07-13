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

/** Emoji en burbujas del mapa (móvil + web), alineados con Flutter. */
export const INCIDENT_EMOJI: Record<IncidentType, string> = {
  robo: '🥷',
  accidente: '🚑',
  infraestructura: '🔧',
  panico: '🚨',
};

/** Validaciones comunitarias necesarias para marcar un reporte como verificado. */
export const INCIDENT_VALIDATION_TARGET = 3;

/** Radio (m) para mostrar alertas cercanas en mapa/lista y para push de validación. */
export const INCIDENT_NEARBY_RADIUS_M = 1500;

/** Horas que una alerta permanece visible en mapa/lista. */
export const INCIDENT_MAX_AGE_HOURS = 24;

/** UI crítica en mapa/lista (robo y SOS). */
export function isCriticalIncidentType(type: IncidentType): boolean {
  return type === 'robo' || type === 'panico';
}

/** Solo SOS/pánico dispara alertas por WhatsApp (mensajes salientes, sin chat). */
export function isSosIncidentType(type: IncidentType): boolean {
  return type === 'panico';
}

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

export function expectedUteqEmail(matricula: string, domain = UTEQ_EMAIL_DOMAIN): string {
  return `${matricula.trim().toLowerCase()}@${domain}`;
}

export function emailMatchesMatricula(
  email: string,
  matricula: string,
  domain = UTEQ_EMAIL_DOMAIN,
): boolean {
  const normalized = email.trim().toLowerCase();
  const mat = matricula.trim();
  if (!mat || !isUteqEmail(normalized, domain)) return false;
  return normalized.split('@')[0] === mat.toLowerCase();
}

export const PASSWORD_RULES = [
  { ok: (pw: string) => pw.length >= 8, label: '8 caracteres' },
  { ok: (pw: string) => /[A-Z]/.test(pw), label: 'Mayúscula' },
  { ok: (pw: string) => /[0-9]/.test(pw), label: 'Número' },
  { ok: (pw: string) => /[^A-Za-z0-9]/.test(pw), label: 'Símbolo' },
] as const;

export function passwordRuleResults(password: string) {
  return PASSWORD_RULES.map((rule) => ({ ...rule, passed: rule.ok(password) }));
}

export function validatePasswordStrength(password: string): string | null {
  const failed = passwordRuleResults(password).filter((r) => !r.passed);
  if (failed.length === 0) return null;
  return `La contraseña debe incluir: ${failed.map((r) => r.label.toLowerCase()).join(', ')}.`;
}

export function validateRegister(input: RegisterInput, domain = UTEQ_EMAIL_DOMAIN): string | null {
  if (!input.matricula.trim()) return 'La matrícula es obligatoria.';
  if (!/^\d{10}$/.test(input.matricula.trim())) return 'La matrícula debe tener 10 dígitos.';
  if (!input.nombre.trim()) return 'El nombre es obligatorio.';
  if (!input.apellidos.trim()) return 'Los apellidos son obligatorios.';
  if (!input.telefono.trim()) return 'El teléfono es obligatorio.';
  if (!/^\d{10}$/.test(input.telefono.trim().replace(/\s/g, ''))) {
    return 'El teléfono debe tener 10 dígitos.';
  }
  if (!isUteqEmail(input.email, domain)) {
    return `Usa tu correo institucional @${domain}.`;
  }
  if (!emailMatchesMatricula(input.email, input.matricula, domain)) {
    return `El correo debe coincidir con tu matrícula (ej. ${expectedUteqEmail(input.matricula, domain)}).`;
  }
  return validatePasswordStrength(input.password);
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
  if (msg.includes('Failed to fetch') || /network request failed/i.test(msg)) {
    return 'Sin conexión a Supabase. Revisa tu internet y EXPO_PUBLIC_SUPABASE_URL en apps/mobile/.env (debe ser https://xxx.supabase.co).';
  }
  return msg;
}

export function formatAuthError(error: {
  message?: string;
  code?: string;
  status?: number | null;
}): string {
  const main = toAuthErrorMessage(error.message ?? error);
  const extra = [error.code, error.status ? `HTTP ${error.status}` : '']
    .filter(Boolean)
    .join(' · ');
  return extra && !main.includes(String(error.status ?? '')) ? `${main} (${extra})` : main;
}

/** Convierte respuestas de error (string, objeto Supabase, `{}`, etc.) en texto legible. */
export function toAuthErrorMessage(
  error: unknown,
  fallback = 'Error desconocido. Revisa Supabase y las variables en Railway.',
): string {
  if (error == null) return fallback;

  if (typeof error === 'string') {
    const trimmed = error.trim();
    if (!trimmed || trimmed === '{}' || trimmed === '[object Object]') return fallback;
    return getAuthErrorMessage(trimmed);
  }

  if (error instanceof Error) {
    return toAuthErrorMessage(error.message, fallback);
  }

  if (typeof error === 'object') {
    const e = error as Record<string, unknown>;

    if (typeof e.message === 'string' && e.message.trim()) {
      return getAuthErrorMessage(e.message);
    }

    if (typeof e.error === 'string' && e.error.trim()) {
      return getAuthErrorMessage(e.error);
    }

    if (e.error && typeof e.error === 'object') {
      const nested = toAuthErrorMessage(e.error, '');
      if (nested) return nested;
    }

    if (e.code === 'confirm_failed') {
      return getAuthErrorMessage('Falta SUPABASE_SERVICE_ROLE_KEY en Railway.');
    }

    if (typeof e.code === 'string' && e.code.trim()) {
      return `${fallback} (${e.code})`;
    }
  }

  return fallback;
}

/** ——— Eventos / ferias ——— */
export type CampusEventStatus = 'abierto' | 'cerrado';
export type VendorCategory = 'comida' | 'snacks' | 'bebidas' | 'postres' | 'otro';
export type VendorApplicationStatus = 'pendiente' | 'aceptado' | 'rechazado';

export const VENDOR_CATEGORY_LABELS: Record<VendorCategory, string> = {
  comida: 'Comida',
  snacks: 'Snacks',
  bebidas: 'Bebidas',
  postres: 'Postres',
  otro: 'Otro',
};

export const VENDOR_CATEGORY_EMOJI: Record<VendorCategory, string> = {
  comida: '🌮',
  snacks: '🥪',
  bebidas: '☕',
  postres: '🍓',
  otro: '🛍️',
};

export interface CampusEvent {
  id: string;
  title: string;
  description: string;
  lat: number;
  lng: number;
  location_label: string;
  max_vendors: number;
  status: CampusEventStatus;
  starts_at: string | null;
  ends_at: string | null;
  created_by: string;
  created_at: string;
  accepted_count?: number;
  pending_count?: number;
}

export interface EventVendorApplication {
  id: string;
  event_id: string;
  user_id: string;
  business_name: string;
  group_name: string;
  what_they_sell: string;
  category: VendorCategory;
  status: VendorApplicationStatus;
  created_at: string;
  author_nombre?: string | null;
}

export interface CreateCampusEventInput {
  title: string;
  description: string;
  lat: number;
  lng: number;
  location_label?: string;
  max_vendors: number;
  starts_at?: string | null;
  ends_at?: string | null;
}

export interface CreateVendorApplicationInput {
  business_name: string;
  group_name?: string;
  what_they_sell: string;
  category: VendorCategory;
}
