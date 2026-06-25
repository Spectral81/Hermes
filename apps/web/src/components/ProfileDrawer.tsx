'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  INCIDENT_LABELS,
  timeAgo,
  type Incident,
  type Profile,
} from '@uteq/shared';
import { HButton } from '@/components/ui/HButton';
import { HCard } from '@/components/ui/HCard';
import { CloseIcon, LogoutIcon, ThumbUpIcon } from '@/components/ui/icons';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
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

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ProfileDrawer({ open, onClose }: Props) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [myIncidents, setMyIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;

    async function load() {
      setLoading(true);
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
  }, [open]);

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
    window.location.href = '/';
  }

  if (!open) return null;

  return (
    <div className="profile-drawer-backdrop" onClick={onClose} role="presentation">
      <aside
        className="profile-drawer"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Mi perfil"
      >
        <button type="button" className="profile-drawer-close" onClick={onClose} aria-label="Cerrar">
          <CloseIcon />
        </button>

        {loading ? (
          <div className="profile-drawer-loading">
            <span className="map-spinner" />
          </div>
        ) : (
          <>
            <div className="profile-drawer-hero">
              <ProfileAvatar name={fullName} size={88} />
              <h2>{fullName}</h2>
              {profile && (
                <p className="profile-drawer-role">
                  {profile.matricula} · {ROLE_LABELS[profile.role] ?? profile.role}
                </p>
              )}
            </div>

            <div className="profile-drawer-stats">
              {[
                { n: stats.reportes, l: 'Reportes', c: HERMES.blue },
                { n: stats.activos, l: 'Activos', c: HERMES.red },
                { n: stats.likes, l: 'Confirmac.', c: HERMES.green },
              ].map((s) => (
                <div key={s.l} className="profile-drawer-stat">
                  <span style={{ color: s.c }}>{s.n}</span>
                  <small>{s.l}</small>
                </div>
              ))}
            </div>

            {profile && (
              <div className="profile-drawer-account">
                <p className="profile-drawer-label">DATOS DE LA CUENTA</p>
                <DataRow label="Correo" value={profile.email} />
                <DataRow label="Teléfono" value={profile.telefono} />
                <DataRow label="Matrícula" value={profile.matricula} />
              </div>
            )}

            <div className="profile-drawer-reports-head">
              <h3>Mis reportes</h3>
              <span>{myIncidents.length}</span>
            </div>

            <div className="profile-drawer-reports">
              {myIncidents.length === 0 ? (
                <p className="profile-drawer-empty">Aún no has creado reportes</p>
              ) : (
                myIncidents.slice(0, 5).map((r) => {
                  const meta = CATEGORY[r.type];
                  return (
                    <HCard key={r.id} accent={meta.color} className="hermes-profile-report-card">
                      <div className="hermes-profile-report-row">
                        <span
                          className="hermes-profile-report-glyph"
                          style={{ backgroundColor: meta.bg, color: meta.color }}
                        >
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
                })
              )}
            </div>

            <div className="profile-drawer-footer">
              <HButton variant="ghost" full onClick={handleLogout}>
                <LogoutIcon /> Cerrar sesión
              </HButton>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="profile-drawer-data-row">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
