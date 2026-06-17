import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { LogoutButton } from '@/components/LogoutButton';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile, error: profileError } = await supabase.rpc('ensure_my_profile');

  const displayProfile = profileError ? null : profile;

  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <div>
          <span className="auth-badge">UTEQ Seguridad</span>
          <h1>Panel</h1>
        </div>
        <LogoutButton />
      </header>

      <section className="dashboard-card">
        <h2>Bienvenido{displayProfile ? `, ${displayProfile.nombre}` : ''}</h2>
        {displayProfile ? (
          <dl className="profile-list">
            <div><dt>Matrícula</dt><dd>{displayProfile.matricula}</dd></div>
            <div><dt>Correo</dt><dd>{displayProfile.email}</dd></div>
            <div><dt>Teléfono</dt><dd>{displayProfile.telefono}</dd></div>
            <div><dt>Rol</dt><dd>{displayProfile.role}</dd></div>
          </dl>
        ) : (
          <p>
            No se encontró el perfil.
            {profileError ? ` Ejecuta el SQL 003_ensure_profile.sql en Supabase.` : ' Contacta al administrador.'}
          </p>
        )}
      </section>
    </main>
  );
}
