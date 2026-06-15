import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { LogoutButton } from '@/components/LogoutButton';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

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
        <h2>Bienvenido{profile ? `, ${profile.nombre}` : ''}</h2>
        {profile ? (
          <dl className="profile-list">
            <div><dt>Matrícula</dt><dd>{profile.matricula}</dd></div>
            <div><dt>Correo</dt><dd>{profile.email}</dd></div>
            <div><dt>Teléfono</dt><dd>{profile.telefono}</dd></div>
            <div><dt>Rol</dt><dd>{profile.role}</dd></div>
          </dl>
        ) : (
          <p>No se encontró el perfil. Contacta al administrador.</p>
        )}
      </section>
    </main>
  );
}
