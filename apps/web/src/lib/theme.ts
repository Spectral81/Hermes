import type { IncidentType } from '@uteq/shared';

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

export interface CategoryMeta {
  color: string;
  bg: string;
  label: string;
  glyph: string;
}

export const CATEGORY: Record<IncidentType, CategoryMeta> = {
  robo: { color: '#EF4444', bg: '#FEF2F2', label: 'Robo', glyph: '⚠' },
  accidente: { color: '#F59E0B', bg: '#FFFBEB', label: 'Accidente', glyph: '✚' },
  infraestructura: { color: '#3B82F6', bg: '#EFF6FF', label: 'Falla', glyph: '⚡' },
  panico: { color: '#DC2626', bg: '#FEE2E2', label: 'SOS', glyph: '!' },
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
