import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="auth-page">
      <div className="auth-card">
        <h1>404</h1>
        <p>Página no encontrada</p>
        <Link href="/login" className="btn-primary btn-link">
          Ir al login
        </Link>
      </div>
    </main>
  );
}
