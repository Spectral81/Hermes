import type { CreateIncidentInput, Incident } from '@uteq/shared';
import { createClient } from '@/lib/supabase/client';

function toError(error: unknown): Error {
  if (error && typeof error === 'object') {
    const e = error as { message?: string; hint?: string; details?: string; code?: string };
    const parts = [e.message, e.details, e.hint].filter(Boolean);
    const msg = parts.join(' · ') || 'Error desconocido';
    if (e.code === 'PGRST202' || /function .*does not exist|could not find the function/i.test(msg)) {
      return new Error('La base de datos no tiene las funciones de reportes. Ejecuta el SQL 004_incidents.sql en Supabase.');
    }
    return new Error(msg);
  }
  return new Error(String(error));
}

function normalizeIncident(raw: Record<string, unknown>): Incident {
  return {
    id: String(raw.id),
    type: raw.type as Incident['type'],
    category: (raw.category as Incident['category']) ?? null,
    severity: (raw.severity as Incident['severity']) ?? null,
    description: String(raw.description ?? ''),
    lat: Number(raw.lat),
    lng: Number(raw.lng),
    status: (raw.status as Incident['status']) ?? 'activo',
    likes_count: Number(raw.likes_count ?? 0),
    created_at: String(raw.created_at ?? new Date().toISOString()),
    created_by: String(raw.created_by),
    author_nombre: (raw.author_nombre as string | null) ?? null,
    liked_by_me: Boolean(raw.liked_by_me),
  };
}

export async function fetchIncidents(): Promise<Incident[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('list_incidents');
  if (error) throw toError(error);
  return ((data ?? []) as Record<string, unknown>[]).map(normalizeIncident);
}

export async function createIncident(input: CreateIncidentInput): Promise<Incident> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('create_incident', {
    p_type: input.type,
    p_description: input.description,
    p_lat: input.lat,
    p_lng: input.lng,
    p_category: input.category ?? null,
    p_severity: input.severity ?? null,
  });
  if (error) throw toError(error);
  return normalizeIncident(data as Record<string, unknown>);
}

export async function toggleLike(
  incidentId: string,
): Promise<{ likes_count: number; liked: boolean }> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('toggle_incident_like', {
    p_incident_id: incidentId,
  });
  if (error) throw toError(error);
  const row = Array.isArray(data) ? data[0] : data;
  return row as { likes_count: number; liked: boolean };
}
