'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { HButton } from '@/components/ui/HButton';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') ?? '';
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function resendVerification() {
    if (!email) {
      setError('No hay correo en la URL. Regístrate de nuevo o inicia sesión.');
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const result = await res.json();

      if (!res.ok) {
        setError(result.error ?? 'No se pudo reenviar el correo.');
        return;
      }

      setMessage(result.message ?? 'Correo de verificación enviado.');
    } catch {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="hermes-auth-page">
      <div className="hermes-auth-shell">
        <div className="hermes-verify-icon" aria-hidden>✉</div>

        <header className="hermes-auth-header">
          <h1>Verifica tu correo</h1>
          <p>
            Revisa tu bandeja institucional
            {email ? ` (${email})` : ''} y confirma tu cuenta.
          </p>
        </header>

        <div className="hermes-alert-info">
          Si no recibes el correo en unos minutos, revisa spam o reenvía la verificación.
        </div>

        {error && <div className="hermes-alert-error">{error}</div>}
        {message && <div className="hermes-alert-info">{message}</div>}

        <div className="hermes-auth-form">
          <HButton
            type="button"
            full
            className="hermes-btn-round"
            loading={loading}
            onClick={resendVerification}
          >
            Reenviar correo de verificación
          </HButton>

          <Link href="/login" className="hermes-btn-link">
            <HButton type="button" full variant="secondary" className="hermes-btn-round">
              Ir a iniciar sesión
            </HButton>
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}
