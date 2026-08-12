'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  INCIDENT_LABELS,
  timeAgo,
  type Incident,
  type IncidentStatus,
} from '@uteq/shared';
import { HermesLogoLockup } from '@/components/ui/HermesLogo';
import { HCard } from '@/components/ui/HCard';
import { ThumbUpIcon } from '@/components/ui/icons';
import { createClient } from '@/lib/supabase/client';
import { CATEGORY, HERMES } from '@/lib/theme';

const STATUS_LABELS: Record<IncidentStatus, string> = {
  activo: 'Activo',
  en_proceso: 'En proceso',
  cerrado: 'Resuelto',
  rechazado: 'Rechazado',
};

const STATUS_COLORS: Record<IncidentStatus, string> = {
  activo: HERMES.red,
  en_proceso: HERMES.amber,
  cerrado: HERMES.green,
  rechazado: HERMES.gray500,
};

function castIncident(raw: Record<string, unknown>): Incident {
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

export function MyReportsContent() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setIncidents([]);
          setError('Inicia sesión para ver tus reportes.');
          return;
        }

        const { data, error: qError } = await supabase
          .from('incidents')
          .select(
            'id, type, category, severity, description, lat, lng, status, likes_count, created_at, created_by',
          )
          .eq('created_by', user.id)
          .order('created_at', { ascending: false })
          .limit(100);

        if (qError) throw new Error(qError.message);
        setIncidents((data ?? []).map((row) => castIncident(row as Record<string, unknown>)));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudieron cargar tus reportes.');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  return (
    <div className="web-app my-reports-app">
      <header className="web-app-header">
        <HermesLogoLockup size={28} />
        <div className="web-app-header-actions">
          <Link className="web-header-link" href="/mapa">
            Mapa
          </Link>
          <Link className="web-header-link" href="/eventos">
            Eventos
          </Link>
          <Link className="web-header-link" href="/asistente">
            Asistente
          </Link>
          <Link className="web-header-link" href="/perfil">
            Perfil
          </Link>
        </div>
      </header>

      <main className="my-reports-page">
        <div className="my-reports-head">
          <h1>Mis reportes</h1>
          <p>Historial de los reportes que has creado en el campus.</p>
        </div>

        {loading && (
          <div className="my-reports-loading">
            <span className="map-spinner" />
          </div>
        )}

        {!loading && error && <p className="my-reports-error">{error}</p>}

        {!loading && !error && incidents.length === 0 && (
          <HCard className="hermes-profile-empty">
            <span aria-hidden>📍</span>
            <p>Aún no has creado reportes</p>
            <Link href="/mapa" className="web-header-link">
              Ir al mapa
            </Link>
          </HCard>
        )}

        {!loading && !error && incidents.length > 0 && (
          <div className="my-reports-list">
            {incidents.map((r) => {
              const meta = CATEGORY[r.type];
              const status = r.status as IncidentStatus;
              return (
                <HCard key={r.id} accent={meta.color} className="hermes-profile-report-card">
                  <div className="hermes-profile-report-row">
                    <div className="hermes-profile-report-text">
                      <p>
                        {INCIDENT_LABELS[r.type]}
                        {r.description ? ` · ${r.description}` : ''}
                      </p>
                      <span>
                        {timeAgo(r.created_at)} ·{' '}
                        <em style={{ color: STATUS_COLORS[status], fontStyle: 'normal' }}>
                          {STATUS_LABELS[status]}
                        </em>
                      </span>
                    </div>
                    <span className="hermes-profile-report-likes">
                      <ThumbUpIcon />
                      {r.likes_count}
                    </span>
                  </div>
                  {Number.isFinite(r.lat) && Number.isFinite(r.lng) && (
                    <Link
                      className="my-reports-map-link"
                      href={`/mapa?lat=${r.lat}&lng=${r.lng}`}
                    >
                      Ver en mapa
                    </Link>
                  )}
                </HCard>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
