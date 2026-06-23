'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { HButton } from '@/components/ui/HButton';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email');

  return (
    <main className="hermes-auth-page">
      <div className="hermes-auth-shell">
        <div className="hermes-verify-icon" aria-hidden>✉</div>

        <header className="hermes-auth-header">
          <h1>Verifica tu correo</h1>
          <p>
            Si tu registro fue exitoso ya puedes iniciar sesión
            {email ? `, ${email}` : ''}.
          </p>
        </header>

        <div className="hermes-alert-info">
          El servidor activa tu cuenta automáticamente. Si no recibes el correo, intenta iniciar sesión.
        </div>

        <Link href="/login" className="hermes-btn-link">
          <HButton full className="hermes-btn-round">Ir a iniciar sesión</HButton>
        </Link>
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
