import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="hermes-auth-page">
      <div className="hermes-auth-shell" style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0 }}>404</h1>
        <p style={{ color: '#6b7280', marginTop: 8 }}>Página no encontrada</p>
        <Link href="/" className="hermes-btn hermes-btn-primary hermes-btn-full hermes-btn-link" style={{ marginTop: 24 }}>
          Ir al inicio
        </Link>
      </div>
    </main>
  );
}
