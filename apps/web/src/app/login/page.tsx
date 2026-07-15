'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { getAuthErrorMessage, validateLogin } from '@uteq/shared';
import { HButton } from '@/components/ui/HButton';
import { HInput } from '@/components/ui/HInput';
import { EyeIcon, LockIcon, MailIcon } from '@/components/ui/icons';
import { HermesLogoLockup } from '@/components/ui/HermesLogo';
import { requestUserLocationReliable, saveUserLocation } from '@/lib/geolocation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const emailValid = email.trim().toLowerCase().endsWith('@uteq.edu.mx');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const validationError = validateLogin({ email, password });
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const result = await res.json();

      if (!res.ok) {
        setError(getAuthErrorMessage(result.error ?? 'Error al iniciar sesión.'));
        setLoading(false);
        return;
      }

      const location = await requestUserLocationReliable();
      if (location) saveUserLocation(location);

      router.push(result.redirectTo ?? '/mapa');
      router.refresh();
    } catch {
      setError('No se pudo conectar con el servidor.');
      setLoading(false);
    }
  }

  return (
    <main className="hermes-auth-page">
      <div className="hermes-auth-shell">
        <HermesLogoLockup size={30} />

        <header className="hermes-auth-header">
          <h1>Bienvenido</h1>
          <p>Ingresa con tu cuenta institucional</p>
        </header>

        <form onSubmit={handleSubmit} className="hermes-auth-form">
          {error && <div className="hermes-alert-error">{error}</div>}

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

          <HInput
            label="Contraseña"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            icon={<LockIcon />}
            rightSlot={
              <button
                type="button"
                className="hermes-input-action"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                <EyeIcon off={showPassword} />
              </button>
            }
          />

          <div className="hermes-auth-options">
            <label className="hermes-checkbox-row">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span>Recordarme</span>
            </label>
            <Link href="/forgot-password" className="hermes-link-btn">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <HButton type="submit" full loading={loading} className="hermes-btn-round">
            Iniciar sesión
          </HButton>
        </form>

        <p className="hermes-auth-footer">
          ¿Eres nuevo? <Link href="/register">Crea una cuenta</Link>
        </p>

        <p className="hermes-auth-footer">
          <Link href="/mapa">Entrar al mapa sin iniciar sesión</Link>
        </p>
      </div>
    </main>
  );
}
