'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { isPrivilegedRole, type Incident, type Profile } from '@uteq/shared';
import { HermesLogoLockup } from '@/components/ui/HermesLogo';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { HButton } from '@/components/ui/HButton';
import { LogoutIcon } from '@/components/ui/icons';
import { createClient } from '@/lib/supabase/client';
import { HERMES } from '@/lib/theme';
import { WearableDevicesPanel } from '@/components/WearableDevicesPanel';

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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const { data } = await supabase.rpc('ensure_my_profile');
      setProfile(data as Profile | null);

      try {
        const { data: rows } = await supabase
          .from('incidents')
          .select('id, status, likes_count, created_by')
          .eq('created_by', user.id)
          .limit(200);
        setMyIncidents(
          (rows ?? []).map((row) => ({
            id: String(row.id),
            type: 'robo',
            category: null,
            severity: null,
            description: '',
            lat: 0,
            lng: 0,
            status: (row.status as Incident['status']) ?? 'activo',
            likes_count: Number(row.likes_count ?? 0),
            created_at: '',
            created_by: String(row.created_by),
            author_nombre: null,
            liked_by_me: false,
          })),
        );
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
  const privilegedRole = isPrivilegedRole(profile?.role);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  if (loading) {
    return (
      <div className="web-app my-reports-app">
        <div className="hermes-profile-loading hermes-profile-loading-fill">
          <span className="map-spinner" />
        </div>
      </div>
    );
  }

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
          <Link className="web-header-link" href="/mis-reportes">
            Mis reportes
          </Link>
          <Link className="web-header-link" href="/asistente">
            Asistente
          </Link>
        </div>
      </header>

      <main className="profile-shell">
        <section className="profile-hero-card">
          <ProfileAvatar name={fullName} size={72} />
          <div className="profile-hero-text">
            <h1>{fullName}</h1>
            {profile && (
              <p>
                {ROLE_LABELS[profile.role] ?? profile.role}
                {profile.matricula ? ` · ${profile.matricula}` : ''}
              </p>
            )}
          </div>
        </section>

        <section className="profile-stats-row" aria-label="Resumen de reportes">
          <Link href="/mis-reportes" className="profile-stat-chip">
            <strong style={{ color: HERMES.blue }}>{stats.reportes}</strong>
            <span>Reportes</span>
          </Link>
          <div className="profile-stat-chip">
            <strong style={{ color: HERMES.red }}>{stats.activos}</strong>
            <span>Activos</span>
          </div>
          <div className="profile-stat-chip">
            <strong style={{ color: HERMES.green }}>{stats.likes}</strong>
            <span>Confirmaciones</span>
          </div>
        </section>

        {profile && (
          <section className="profile-panel">
            <h2>Cuenta</h2>
            <dl className="profile-dl">
              <div>
                <dt>Correo</dt>
                <dd>{profile.email}</dd>
              </div>
              <div>
                <dt>Teléfono</dt>
                <dd>{profile.telefono || '—'}</dd>
              </div>
              <div>
                <dt>Matrícula</dt>
                <dd>{profile.matricula}</dd>
              </div>
            </dl>
          </section>
        )}

        <section className="profile-panel">
          <WearableDevicesPanel />
        </section>

        {privilegedRole && (
          <section className="profile-actions">
            <Link href="/dashboard" className="profile-action-link">
              Dashboard de gestión
            </Link>
          </section>
        )}

        <div className="profile-logout-wrap">
          <HButton variant="ghost" onClick={handleLogout}>
            <LogoutIcon /> Cerrar sesión
          </HButton>
        </div>
      </main>
    </div>
  );
}
