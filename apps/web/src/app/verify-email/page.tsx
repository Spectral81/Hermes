'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email');

  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <span className="auth-badge">UTEQ</span>
          <h1>Verifica tu correo</h1>
          <p>
            Enviamos un enlace de confirmación
            {email ? ` a ${email}` : ' a tu correo institucional'}.
          </p>
        </div>

        <div className="alert alert-info">
          Revisa tu bandeja de entrada y spam. Debes confirmar el correo antes de iniciar sesión.
        </div>

        <Link href="/login" className="btn-primary btn-link">
          Ir a iniciar sesión
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
