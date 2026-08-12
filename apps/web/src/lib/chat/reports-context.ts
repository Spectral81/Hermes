import { INCIDENT_LABELS, type IncidentType } from '@uteq/shared';
import { describeCampusLocation } from '@/lib/chat/campus-landmarks';
import { createAdminClient } from '@/lib/supabase/admin';

export type ReportsChatMapPin = {
  lat: number;
  lng: number;
  label: string;
};

export type ReportsChatContext = {
  semanal: string;
  zonas: string;
  recientes: string;
  totalActivos: number;
  /** Pin del reporte más reciente (para mapa en la UI; el modelo no debe leer coords). */
  latestPin: ReportsChatMapPin | null;
};

/** Contexto de reportes para el chatbot (mismo espíritu que mi-agente-ia/server.js). */
export async function obtenerContextoReportes(): Promise<ReportsChatContext> {
  const admin = createAdminClient();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await admin
    .from('incidents')
    .select('type, status, description, lat, lng, created_at')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as Array<{
    type: string;
    status: string;
    description: string | null;
    lat: number;
    lng: number;
    created_at: string;
  }>;

  const byType = new Map<string, number>();
  const byPlace = new Map<string, number>();
  let totalActivos = 0;

  for (const row of rows) {
    const label = INCIDENT_LABELS[row.type as IncidentType] ?? row.type ?? 'Otro';
    byType.set(label, (byType.get(label) ?? 0) + 1);

    if (row.status === 'activo' || row.status === 'en_proceso') {
      totalActivos += 1;
    }

    const lat = Number(row.lat);
    const lng = Number(row.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      const place = describeCampusLocation(lat, lng);
      byPlace.set(place, (byPlace.get(place) ?? 0) + 1);
    }
  }

  const semanal =
    [...byType.entries()]
      .map(([cat, total]) => `${cat}: ${total}`)
      .join(', ') || 'Sin reportes';

  const zonas =
    [...byPlace.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([place, cantidad]) => `${place} (${cantidad})`)
      .join('; ') || 'Sin zonas destacadas';

  const recientes =
    rows
      .slice(0, 20)
      .map((r) => {
        const tipo = INCIDENT_LABELS[r.type as IncidentType] ?? r.type;
        const desc = (r.description ?? '').trim().slice(0, 120) || 'Sin descripción';
        const lugar = describeCampusLocation(Number(r.lat), Number(r.lng));
        return `- ${tipo} [${r.status}] ${r.created_at} · ${lugar}: ${desc}`;
      })
      .join('\n') || 'Sin reportes recientes';

  const top = rows[0];
  let latestPin: ReportsChatMapPin | null = null;
  if (top) {
    const lat = Number(top.lat);
    const lng = Number(top.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      const tipo = INCIDENT_LABELS[top.type as IncidentType] ?? top.type;
      latestPin = {
        lat,
        lng,
        label: `${tipo} · ${describeCampusLocation(lat, lng)}`,
      };
    }
  }

  return { semanal, zonas, recientes, totalActivos, latestPin };
}
