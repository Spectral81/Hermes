'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { HButton } from '@/components/ui/HButton';
import { HInput } from '@/components/ui/HInput';
import { BackIcon, MailIcon } from '@/components/ui/icons';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const emailValid = email.trim().toLowerCase().endsWith('@uteq.edu.mx');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!email.trim()) {
      setError('El correo es obligatorio.');
      return;
    }

    if (!emailValid) {
      setError('Usa tu correo institucional @uteq.edu.mx.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const result = await res.json();

      if (!res.ok) {
        setError(result.error ?? 'No se pudo enviar el correo.');
        return;
      }

      setMessage(
        result.message
          ?? 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.',
      );
    } catch {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="hermes-auth-page">
      <div className="hermes-auth-shell">
        <button
          type="button"
          className="hermes-back-btn"
          onClick={() => router.push('/login')}
          aria-label="Volver"
        >
          <BackIcon />
        </button>

        <header className="hermes-auth-header">
          <h1>Recuperar contraseña</h1>
          <p>Te enviaremos un enlace a tu correo institucional</p>
        </header>

        {error && <div className="hermes-alert-error">{error}</div>}
        {message && <div className="hermes-alert-info">{message}</div>}

        <form onSubmit={handleSubmit} className="hermes-auth-form">
          <HInput
            label="Correo institucional"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nombre@uteq.edu.mx"
            autoComplete="email"
            icon={<MailIcon />}
            valid={email.length > 0 && emailValid}
          />

          <HButton type="submit" full loading={loading} className="hermes-btn-round">
            Enviar enlace
          </HButton>
        </form>

        <p className="hermes-auth-footer">
          <Link href="/login">Volver a iniciar sesión</Link>
        </p>
      </div>
    </main>
  );
}
