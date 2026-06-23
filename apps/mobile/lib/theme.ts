import type { IncidentType } from '@uteq/shared';

// HERMES Design System — tokens portados del sistema de diseño.
// Tema claro, azul primario #3B82F6, tipografía Sora (display) + Inter (body).
export const HERMES = {
  blue: '#3B82F6',
  blueDark: '#1D4ED8',
  blueSoft: '#EFF6FF',
  red: '#EF4444',
  redIntense: '#DC2626',
  green: '#10B981',
  amber: '#F59E0B',
  purple: '#8B5CF6',

  gray900: '#0F172A',
  gray800: '#1F2937',
  gray700: '#374151',
  gray600: '#4B5563',
  gray500: '#6B7280',
  gray400: '#9CA3AF',
  gray300: '#D1D5DB',
  gray200: '#E5E7EB',
  gray100: '#F3F4F6',
  gray50: '#F9FAFB',
  white: '#FFFFFF',
} as const;

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 14,
  xl: 18,
  pill: 999,
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

// Sombras reutilizables (iOS shadow* + Android elevation)
export const SHADOW = {
  card: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  float: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fab: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
} as const;

export interface CategoryMeta {
  color: string;
  bg: string;
  label: string;
  glyph: string;
}

// Metadatos por tipo de incidente (los 4 soportados por el backend).
// Mapeo de diseño: infraestructura = "Falla" (azul), panico = "SOS" (rojo intenso).
export const CATEGORY: Record<IncidentType, CategoryMeta> = {
  robo: { color: '#EF4444', bg: '#FEF2F2', label: 'Robo', glyph: '⚠' },
  accidente: { color: '#F59E0B', bg: '#FFFBEB', label: 'Accidente', glyph: '✚' },
  infraestructura: { color: '#3B82F6', bg: '#EFF6FF', label: 'Falla', glyph: '⚡' },
  panico: { color: '#DC2626', bg: '#FEE2E2', label: 'SOS', glyph: '!' },
};

export type StatusKind = 'verified' | 'pending' | 'resolving' | 'resolved' | 'false' | 'active';

export const STATUS_META: Record<StatusKind, { bg: string; fg: string; dot: string; label: string }> = {
  verified: { bg: '#ECFDF5', fg: '#047857', dot: HERMES.green, label: 'Verificado' },
  pending: { bg: '#FFFBEB', fg: '#92400E', dot: HERMES.amber, label: 'Pendiente' },
  resolving: { bg: '#FFF7ED', fg: '#9A3412', dot: '#EA580C', label: 'En proceso' },
  resolved: { bg: '#F0FDF4', fg: '#166534', dot: HERMES.green, label: 'Resuelto' },
  false: { bg: '#FEF2F2', fg: '#991B1B', dot: HERMES.red, label: 'Falso' },
  active: { bg: '#FEE2E2', fg: '#991B1B', dot: HERMES.redIntense, label: 'Activo' },
};

export const AVATAR_COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EC4899', '#6366F1'];

export function avatarColor(seed: string): string {
  const code = seed.charCodeAt(0) || 0;
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

export function initials(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
