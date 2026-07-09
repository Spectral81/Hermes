'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Incident, IncidentStatus, IncidentType, Profile, UserRole } from '@uteq/shared';
import { INCIDENT_LABELS, timeAgo } from '@uteq/shared';
import { HButton } from '@/components/ui/HButton';
import { HCard } from '@/components/ui/HCard';
import { createClient } from '@/lib/supabase/client';
import { CATEGORY, HERMES } from '@/lib/theme';

const ROLE_LABELS: Record<UserRole, string> = {
  estudiante: 'Estudiante',
  admin_general: 'Administrador general',
  responsable_robos: 'Responsable de robos',
  responsable_accidentes: 'Responsable de emergencias',
  responsable_infraestructura: 'Responsable de infraestructura',
};

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

function roleTypes(role: UserRole): IncidentType[] {
  if (role === 'admin_general') return ['robo', 'accidente', 'infraestructura', 'panico'];
  if (role === 'responsable_robos') return ['robo'];
  if (role === 'responsable_accidentes') return ['accidente', 'panico'];
  if (role === 'responsable_infraestructura') return ['infraestructura'];
  return [];
}

function castIncident(raw: Record<string, unknown>): Incident {
  return {
    id: String(raw.id),
    type: raw.type as Incident['type'],
    category: (raw.category as Incident['category']) ?? null,
    severity: (raw.severity as Incident['severity']) ?? null,
    description: String(raw.description ?? ''),
    lat: Number(raw.lat),
    lng: Number(raw.lng),
    status: (raw.status as IncidentStatus) ?? 'activo',
    likes_count: Number(raw.likes_count ?? 0),
    created_at: String(raw.created_at ?? new Date().toISOString()),
    created_by: String(raw.created_by),
    author_nombre: (raw.author_nombre as string | null) ?? null,
    liked_by_me: Boolean(raw.liked_by_me),
  };
}

export function RoleDashboardContent() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<IncidentStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<IncidentType | 'all'>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const { data: profileData, error: profileError } = await supabase.rpc('ensure_my_profile');
        if (profileError) throw profileError;
        const p = profileData as Profile | null;
        setProfile(p);
        if (!p) throw new Error('No se pudo cargar el perfil.');

        const { data: adminRows, error: adminErr } = await supabase.rpc('list_incidents_admin');
        let rows = adminRows as Record<string, unknown>[] | null;
        if (adminErr || !rows) {
          const fallback = await fetch('/api/incidents', { cache: 'no-store' });
          const payload = (await fallback.json()) as Record<string, unknown>[];
          rows = Array.isArray(payload) ? payload : [];
        }

        const allowed = new Set(roleTypes(p.role));
        const scoped = rows
          .map(castIncident)
          .filter((i) => allowed.has(i.type))
          .sort((a, b) => b.created_at.localeCompare(a.created_at));

        setIncidents(scoped);
      } catch (e) {
        const message = e instanceof Error ? e.message : 'No se pudo cargar el dashboard.';
        setError(message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [supabase]);

  const visible = useMemo(() => {
    return incidents.filter((i) => {
      if (statusFilter !== 'all' && i.status !== statusFilter) return false;
      if (typeFilter !== 'all' && i.type !== typeFilter) return false;
      return true;
    });
  }, [incidents, statusFilter, typeFilter]);

  const role = profile?.role ?? 'estudiante';
  const canManage = role !== 'estudiante';
  const allowedTypes = roleTypes(role);

  async function updateStatus(incidentId: string, status: IncidentStatus) {
    setUpdatingId(incidentId);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('set_incident_status', {
        p_incident_id: incidentId,
        p_status: status,
      });
      if (rpcError) throw rpcError;

      const updatedRow = (Array.isArray(data) ? data[0] : data) as Record<string, unknown>;
      const updated = castIncident(updatedRow);
      setIncidents((prev) => prev.map((i) => (i.id === incidentId ? updated : i)));
    } catch (e) {
      const message = e instanceof Error ? e.message : 'No se pudo actualizar el estado.';
      setError(message);
    } finally {
      setUpdatingId(null);
    }
  }

  const stats = {
    total: incidents.length,
    activos: incidents.filter((i) => i.status === 'activo').length,
    enProceso: incidents.filter((i) => i.status === 'en_proceso').length,
    resueltos: incidents.filter((i) => i.status === 'cerrado').length,
  };

  if (loading) {
    return (
      <main className="hermes-admin-page">
        <div className="hermes-admin-center">
          <span className="map-spinner" />
        </div>
      </main>
    );
  }

  if (!canManage) {
    return (
      <main className="hermes-admin-page">
        <div className="hermes-admin-shell">
          <HCard className="hermes-admin-unauthorized">
            <h1>Panel restringido</h1>
            <p>Tu rol actual no tiene acceso al dashboard de gestión.</p>
          </HCard>
        </div>
      </main>
    );
  }

  return (
    <main className="hermes-admin-page">
      <div className="hermes-admin-shell">
        <header className="hermes-admin-hero">
          <p className="hermes-admin-eyebrow">PANEL HERMES</p>
          <h1>Gestión de incidentes</h1>
          <p className="hermes-admin-sub">{ROLE_LABELS[role]}</p>
        </header>

        {error && <div className="hermes-alert-error">{error}</div>}

        <section className="hermes-admin-stats">
          <Stat label="Total" value={stats.total} color={HERMES.blue} />
          <Stat label="Activos" value={stats.activos} color={HERMES.red} />
          <Stat label="En proceso" value={stats.enProceso} color={HERMES.amber} />
          <Stat label="Resueltos" value={stats.resueltos} color={HERMES.green} />
        </section>

        <section className="hermes-admin-filters">
          <div className="hermes-admin-chip-row">
            {(['all', 'activo', 'en_proceso', 'cerrado', 'rechazado'] as const).map((status) => (
              <button
                key={status}
                className={`map-chip ${statusFilter === status ? 'map-chip-active' : ''}`}
                onClick={() => setStatusFilter(status)}
              >
                {status === 'all' ? 'Todos' : STATUS_LABELS[status]}
              </button>
            ))}
          </div>

          <div className="hermes-admin-chip-row">
            <button
              className={`map-chip ${typeFilter === 'all' ? 'map-chip-active' : ''}`}
              onClick={() => setTypeFilter('all')}
            >
              Todos los tipos
            </button>
            {allowedTypes.map((type) => (
              <button
                key={type}
                className={`map-chip ${typeFilter === type ? 'map-chip-active' : ''}`}
                onClick={() => setTypeFilter(type)}
              >
                {CATEGORY[type].glyph} {INCIDENT_LABELS[type]}
              </button>
            ))}
          </div>
        </section>

        <section className="hermes-admin-list">
          {visible.length === 0 ? (
            <HCard className="hermes-admin-empty">
              <p>No hay reportes en esta vista.</p>
            </HCard>
          ) : (
            visible.map((incident) => {
              const meta = CATEGORY[incident.type];
              const updating = updatingId === incident.id;
              return (
                <HCard key={incident.id} accent={meta.color} className="hermes-admin-card">
                  <div className="hermes-admin-card-head">
                    <span
                      className="hermes-admin-glyph"
                      style={{ backgroundColor: meta.bg, color: meta.color }}
                    >
                      {meta.glyph}
                    </span>
                    <div className="hermes-admin-title-wrap">
                      <h3>{INCIDENT_LABELS[incident.type]}</h3>
                      <p>{timeAgo(incident.created_at)} · {incident.author_nombre ?? 'Anónimo'}</p>
                    </div>
                    <span
                      className="hermes-admin-status"
                      style={{
                        color: STATUS_COLORS[incident.status],
                        backgroundColor: `${STATUS_COLORS[incident.status]}22`,
                      }}
                    >
                      {STATUS_LABELS[incident.status]}
                    </span>
                  </div>

                  <p className="hermes-admin-desc">
                    {incident.description || 'Sin descripción'}
                  </p>

                  <div className="hermes-admin-actions">
                    {incident.status !== 'en_proceso' && (
                      <HButton
                        variant="secondary"
                        disabled={updating}
                        onClick={() => updateStatus(incident.id, 'en_proceso')}
                      >
                        En proceso
                      </HButton>
                    )}
                    {incident.status !== 'cerrado' && (
                      <HButton
                        variant="success"
                        disabled={updating}
                        onClick={() => updateStatus(incident.id, 'cerrado')}
                      >
                        Resolver
                      </HButton>
                    )}
                    {incident.status !== 'rechazado' && (
                      <HButton
                        variant="ghost"
                        disabled={updating}
                        onClick={() => updateStatus(incident.id, 'rechazado')}
                      >
                        Rechazar
                      </HButton>
                    )}
                  </div>
                </HCard>
              );
            })
          )}
        </section>
      </div>
    </main>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <HCard className="hermes-admin-stat-card">
      <strong style={{ color }}>{value}</strong>
      <span>{label}</span>
    </HCard>
  );
}

