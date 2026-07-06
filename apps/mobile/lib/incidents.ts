import type {
  CreateIncidentInput,
  Incident,
} from '@uteq/shared';
import { getWebApiUrl } from './web-api';
import { supabase } from './supabase';

function toError(error: unknown): Error {
  if (error && typeof error === 'object') {
    const e = error as { message?: string; hint?: string; details?: string; code?: string; error?: string };
    const parts = [e.message, e.error, e.details, e.hint].filter(Boolean);
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

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => null);
  if (!res.ok) throw toError(data);
  return data as T;
}

export async function fetchIncidents(): Promise<Incident[]> {
  const webApi = getWebApiUrl();
  if (webApi) {
    try {
      const data = await fetchJson<Record<string, unknown>[]>(`${webApi}/api/incidents`, {
        cache: 'no-store',
      });
      return (data ?? []).map(normalizeIncident);
    } catch (e) {
      throw toError(e);
    }
  }

  const { data, error } = await supabase.rpc('list_incidents');
  if (error) throw toError(error);
  return ((data ?? []) as Record<string, unknown>[]).map(normalizeIncident);
}

export async function createIncident(input: CreateIncidentInput): Promise<Incident> {
  const webApi = getWebApiUrl();
  if (webApi) {
    const data = await fetchJson<Record<string, unknown>>(`${webApi}/api/incidents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return normalizeIncident(data);
  }

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
  const webApi = getWebApiUrl();
  if (webApi) {
    return fetchJson<{ likes_count: number; liked: boolean }>(
      `${webApi}/api/incidents/${incidentId}/like`,
      { method: 'POST' },
    );
  }

  const { data, error } = await supabase.rpc('toggle_incident_like', {
    p_incident_id: incidentId,
  });
  if (error) throw toError(error);
  const row = Array.isArray(data) ? data[0] : data;
  return row as { likes_count: number; liked: boolean };
}
