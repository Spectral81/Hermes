import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { LogoutButton } from '@/components/LogoutButton';
import type { Profile } from '@uteq/shared';

export default async function PerfilPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase.rpc('ensure_my_profile');
  const p = profile as Profile | null;

  return (
    <main className="profile-page">
      <header className="profile-header">
        <Link href="/mapa" className="profile-back">←</Link>
        <h1>Mi perfil</h1>
        <span style={{ width: 28 }} />
      </header>

      <div className="profile-avatar">👤</div>

      {p ? (
        <>
          <h2 className="profile-name">{p.nombre} {p.apellidos}</h2>
          <section className="dashboard-card profile-card">
            <dl className="profile-list">
              <div><dt>Matrícula</dt><dd>{p.matricula}</dd></div>
              <div><dt>Correo</dt><dd>{p.email}</dd></div>
              <div><dt>Teléfono</dt><dd>{p.telefono}</dd></div>
              <div><dt>Rol</dt><dd>{p.role}</dd></div>
            </dl>
          </section>
        </>
      ) : (
        <p className="profile-error">No se encontró el perfil.</p>
      )}

      <div className="profile-logout-wrap">
        <LogoutButton />
      </div>
    </main>
  );
}
