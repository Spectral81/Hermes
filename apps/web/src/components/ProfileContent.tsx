'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  INCIDENT_LABELS,
  timeAgo,
  type Incident,
  type Profile,
} from '@uteq/shared';
import { HAvatar } from '@/components/ui/HAvatar';
import { HButton } from '@/components/ui/HButton';
import { HCard } from '@/components/ui/HCard';
import { BackIcon, LogoutIcon, ThumbUpIcon } from '@/components/ui/icons';
import { fetchIncidents } from '@/lib/incidents';
import { createClient } from '@/lib/supabase/client';
import { CATEGORY, HERMES } from '@/lib/theme';

const ROLE_LABELS: Record<string, string> = {
  estudiante: 'Estudiante',
  admin_general: 'Administrador',
  responsable_robos: 'Responsable · Robos',
  responsable_accidentes: 'Responsable · Accidentes',
  responsable_infraestructura: 'Responsable · Infraestructura',
};

export function ProfileContent() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [myIncidents, setMyIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const { data } = await supabase.rpc('ensure_my_profile');
      setProfile(data as Profile | null);

      try {
        const all = await fetchIncidents();
        setMyIncidents(all.filter((i) => i.created_by === user.id));
      } catch {
        // ignore
      }
      setLoading(false);
    }
    load();
  }, []);

  const stats = useMemo(() => {
    const reportes = myIncidents.length;
    const likes = myIncidents.reduce((sum, i) => sum + (i.likes_count ?? 0), 0);
    const activos = myIncidents.filter((i) => i.status === 'activo').length;
    return { reportes, likes, activos };
  }, [myIncidents]);

  const fullName = profile ? `${profile.nombre} ${profile.apellidos}` : 'Usuario UTEQ';

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  if (loading) {
    return (
      <main className="hermes-profile-page hermes-profile-loading">
        <span className="map-spinner" />
      </main>
    );
  }

  return (
    <main className="hermes-profile-page">
      <div className="hermes-profile-header">
        <div className="hermes-profile-nav">
          <Link href="/mapa" className="hermes-profile-nav-btn" aria-label="Volver">
            <BackIcon />
          </Link>
          <span className="hermes-profile-nav-title">Mi perfil</span>
          <span className="hermes-profile-nav-btn" aria-hidden />
        </div>
      </div>

      <div className="hermes-profile-body">
        <div className="hermes-profile-identity">
          <div className="hermes-profile-avatar-ring">
            <HAvatar name={fullName} size={76} />
          </div>
          <div>
            <h1 className="hermes-profile-name">{fullName}</h1>
            {profile && (
              <p className="hermes-profile-handle">
                {profile.matricula} · {ROLE_LABELS[profile.role] ?? profile.role}
              </p>
            )}
          </div>
        </div>

        <div className="hermes-profile-stats">
          {[
            { n: stats.reportes, l: 'Reportes', c: HERMES.blue },
            { n: stats.activos, l: 'Activos', c: HERMES.red },
            { n: stats.likes, l: 'Confirmac.', c: HERMES.green },
          ].map((s) => (
            <div key={s.l} className="hermes-profile-stat">
              <span className="hermes-profile-stat-num" style={{ color: s.c }}>{s.n}</span>
              <span className="hermes-profile-stat-label">{s.l}</span>
            </div>
          ))}
        </div>

        {profile && (
          <HCard className="hermes-profile-block">
            <p className="hermes-profile-section-label">DATOS DE LA CUENTA</p>
            <DataRow label="Correo" value={profile.email} />
            <DataRow label="Teléfono" value={profile.telefono} />
            <DataRow label="Matrícula" value={profile.matricula} />
          </HCard>
        )}

        <div className="hermes-profile-block-header">
          <h2>Mis reportes</h2>
          <span>{myIncidents.length}</span>
        </div>

        {myIncidents.length === 0 ? (
          <HCard className="hermes-profile-empty">
            <span aria-hidden>📍</span>
            <p>Aún no has creado reportes</p>
          </HCard>
        ) : (
          <div className="hermes-profile-reports">
            {myIncidents.slice(0, 5).map((r) => {
              const meta = CATEGORY[r.type];
              return (
                <HCard key={r.id} accent={meta.color} className="hermes-profile-report-card">
                  <div className="hermes-profile-report-row">
                    <span className="hermes-profile-report-glyph" style={{ backgroundColor: meta.bg, color: meta.color }}>
                      {meta.glyph}
                    </span>
                    <div className="hermes-profile-report-text">
                      <p>
                        {INCIDENT_LABELS[r.type]}
                        {r.description ? ` · ${r.description}` : ''}
                      </p>
                      <span>{timeAgo(r.created_at)}</span>
                    </div>
                    <span className="hermes-profile-report-likes">
                      <ThumbUpIcon />
                      {r.likes_count}
                    </span>
                  </div>
                </HCard>
              );
            })}
          </div>
        )}

        <div className="hermes-profile-logout">
          <HButton variant="ghost" full onClick={handleLogout}>
            <LogoutIcon /> Cerrar sesión
          </HButton>
        </div>
      </div>
    </main>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="hermes-profile-data-row">
      <span className="hermes-profile-data-label">{label}</span>
      <span className="hermes-profile-data-value">{value}</span>
    </div>
  );
}
