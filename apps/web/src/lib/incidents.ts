import type { CreateIncidentInput, Incident } from '@uteq/shared';

function toError(error: unknown): Error {
  if (error && typeof error === 'object') {
    const e = error as { message?: string; error?: string };
    return new Error(e.error ?? e.message ?? 'Error desconocido');
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
  const res = await fetch('/api/incidents', { cache: 'no-store' });
  const data = await res.json();
  if (!res.ok) throw toError(data);
  return ((data ?? []) as Record<string, unknown>[]).map(normalizeIncident);
}

export async function createIncident(input: CreateIncidentInput): Promise<Incident> {
  const res = await fetch('/api/incidents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) throw toError(data);
  return normalizeIncident(data as Record<string, unknown>);
}

export async function toggleLike(incidentId: string): Promise<{
  likes_count: number;
  liked: boolean;
  verified: boolean;
  verified_now: boolean;
}> {
  const res = await fetch(`/api/incidents/${incidentId}/like`, { method: 'POST' });
  const data = await res.json();
  if (!res.ok) throw toError(data);
  return {
    likes_count: Number(data.likes_count ?? 0),
    liked: Boolean(data.liked),
    verified: Boolean(data.verified),
    verified_now: Boolean(data.verified_now),
  };
}
