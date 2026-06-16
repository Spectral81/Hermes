'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const next = searchParams.get('next') ?? '/dashboard';
    const code = searchParams.get('code');
    let done = false;

    async function finish() {
      if (done) return;
      done = true;
      router.replace(next);
      router.refresh();
    }

    async function fail(message: string) {
      if (done) return;
      done = true;
      setError(message);
    }

    async function run() {
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          await fail(exchangeError.message);
          return;
        }
        await finish();
        return;
      }

      // Flujo con #access_token en el hash (confirmación por email)
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await finish();
        return;
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
          subscription.unsubscribe();
          finish();
        }
      });

      window.setTimeout(async () => {
        subscription.unsubscribe();
        const { data: { session: retrySession } } = await supabase.auth.getSession();
        if (retrySession) {
          await finish();
        } else {
          await fail('No se pudo confirmar el correo. Intenta iniciar sesión.');
        }
      }, 4000);
    }

    run();
  }, [router, searchParams]);

  if (error) {
    return (
      <main className="auth-page">
        <div className="auth-card">
          <div className="alert alert-error">{error}</div>
          <Link href="/login" className="btn-primary btn-link">Ir a login</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <p>Confirmando correo…</p>
      </div>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense>
      <AuthCallbackContent />
    </Suspense>
  );
}
