'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  emailMatchesMatricula,
  expectedUteqEmail,
  formatAuthError,
  passwordRuleResults,
  toAuthErrorMessage,
  validateRegister,
} from '@uteq/shared';
import { HButton } from '@/components/ui/HButton';
import { HInput } from '@/components/ui/HInput';
import { BackIcon, EyeIcon, LockIcon, MailIcon } from '@/components/ui/icons';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    matricula: '',
    nombre: '',
    apellidos: '',
    telefono: '',
    email: '',
    password: '',
  });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [availability, setAvailability] = useState<{
    emailAvailable: boolean;
    matriculaAvailable: boolean;
    emailMessage: string | null;
    matriculaMessage: string | null;
  } | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  function updateField(field: keyof typeof form, value: string) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'matricula' && /^\d{0,10}$/.test(value)) {
        const mat = value.trim();
        const suggested = mat.length === 10 ? expectedUteqEmail(mat) : '';
        const prevSuggested = prev.matricula.trim().length === 10
          ? expectedUteqEmail(prev.matricula.trim())
          : '';
        if (!prev.email || prev.email === prevSuggested) {
          next.email = suggested;
        }
      }
      return next;
    });
  }

  const checks = passwordRuleResults(form.password);
  const strength = checks.filter((c) => c.passed).length;
  const emailValid = useMemo(
    () =>
      form.email.length > 0 &&
      emailMatchesMatricula(form.email, form.matricula) &&
      (availability?.emailAvailable ?? true),
    [form.email, form.matricula, availability?.emailAvailable],
  );

  const matriculaValid = useMemo(
    () => /^\d{10}$/.test(form.matricula.trim()) && (availability?.matriculaAvailable ?? true),
    [form.matricula, availability?.matriculaAvailable],
  );

  useEffect(() => {
    const email = form.email.trim().toLowerCase();
    const matricula = form.matricula.trim();
    const ready = email.includes('@') && matricula.length === 10;

    if (!ready) {
      setAvailability(null);
      return;
    }

    const timer = window.setTimeout(async () => {
      setCheckingAvailability(true);
      try {
        const res = await fetch('/api/auth/check-registration', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, matricula }),
        });
        const data = await res.json();
        if (res.ok) {
          setAvailability({
            emailAvailable: Boolean(data.emailAvailable),
            matriculaAvailable: Boolean(data.matriculaAvailable),
            emailMessage: data.emailMessage ?? null,
            matriculaMessage: data.matriculaMessage ?? null,
          });
        }
      } catch {
        setAvailability(null);
      } finally {
        setCheckingAvailability(false);
      }
    }, 450);

    return () => window.clearTimeout(timer);
  }, [form.email, form.matricula]);

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!acceptedTerms) {
      setError('Debes aceptar los términos y la política de privacidad.');
      return;
    }

    const validationError = validateRegister({
      matricula: form.matricula,
      nombre: form.nombre,
      apellidos: form.apellidos,
      telefono: form.telefono,
      email: form.email,
      password: form.password,
    });
    if (validationError) {
      setError(validationError);
      return;
    }

    if (availability && !availability.emailAvailable) {
      setError(availability.emailMessage ?? 'Este correo ya está registrado.');
      return;
    }

    if (availability && !availability.matriculaAvailable) {
      setError(availability.matriculaMessage ?? 'Esta matrícula ya está registrada.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          matricula: form.matricula.trim(),
          nombre: form.nombre.trim(),
          apellidos: form.apellidos.trim(),
          telefono: form.telefono.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
        }),
      });

      let result: {
        ok?: boolean;
        email?: string;
        autoLogin?: boolean;
        error?: string;
        code?: string;
      } | null = null;
      const text = await res.text();
      try {
        result = text ? JSON.parse(text) : null;
      } catch {
        result = null;
      }

      if (!res.ok) {
        setError(
          result?.code
            ? formatAuthError({
                message: toAuthErrorMessage(result.error),
                code: result.code,
                status: res.status,
              })
            : toAuthErrorMessage(result?.error, `Error del servidor (HTTP ${res.status}).`),
        );
        return;
      }

      if (!result?.ok || !result.email) {
        setError('Respuesta inválida del servidor. Recarga la página e intenta de nuevo.');
        return;
      }

      if (result.autoLogin) {
        window.location.href = '/mapa';
        return;
      }

      window.location.href = `/verify-email?email=${encodeURIComponent(result.email)}`;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error de red';
      setError(`Error de conexión: ${msg}.`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="hermes-auth-page">
      <div className="hermes-auth-shell hermes-auth-shell-wide">
        <button
          type="button"
          className="hermes-back-btn"
          onClick={() => router.push('/')}
          aria-label="Volver"
        >
          <BackIcon />
        </button>

        <header className="hermes-auth-header">
          <h1>Crear cuenta</h1>
          <p>Completa tus datos institucionales UTEQ</p>
        </header>

        {error && <div className="hermes-alert-error">{error}</div>}

        <form onSubmit={handleRegister} className="hermes-auth-form">
          <div className="hermes-form-grid">
            <HInput
              label="Nombre"
              value={form.nombre}
              onChange={(e) => updateField('nombre', e.target.value)}
              autoComplete="given-name"
              valid={form.nombre.trim().length > 0}
            />
            <HInput
              label="Apellido"
              value={form.apellidos}
              onChange={(e) => updateField('apellidos', e.target.value)}
              autoComplete="family-name"
              valid={form.apellidos.trim().length > 0}
            />
          </div>

          <HInput
            label="Matrícula UTEQ"
            value={form.matricula}
            onChange={(e) => updateField('matricula', e.target.value.replace(/\D/g, '').slice(0, 10))}
            inputMode="numeric"
            autoComplete="off"
            helper={
              availability?.matriculaMessage ??
              (checkingAvailability ? 'Verificando matrícula…' : '10 dígitos')
            }
            error={
              availability && !availability.matriculaAvailable
                ? availability.matriculaMessage
                : null
            }
            valid={matriculaValid}
          />

          <HInput
            label="Correo institucional"
            type="email"
            value={form.email}
            onChange={(e) => updateField('email', e.target.value.toLowerCase())}
            placeholder="2020123456@uteq.edu.mx"
            autoComplete="email"
            icon={<MailIcon />}
            helper={
              availability?.emailMessage ??
              (checkingAvailability
                ? 'Verificando disponibilidad…'
                : form.matricula.trim().length === 10
                  ? `Debe ser ${expectedUteqEmail(form.matricula)}`
                  : 'Debe coincidir con tu matrícula @uteq.edu.mx')
            }
            error={
              availability && !availability.emailAvailable
                ? availability.emailMessage
                : null
            }
            valid={emailValid}
          />

          <HInput
            label="Teléfono"
            type="tel"
            value={form.telefono}
            onChange={(e) => updateField('telefono', e.target.value.replace(/\D/g, '').slice(0, 10))}
            inputMode="numeric"
            placeholder="4421234567"
            autoComplete="tel"
            helper="10 dígitos"
            valid={/^\d{10}$/.test(form.telefono.trim())}
          />

          <HInput
            label="Contraseña"
            type={showPassword ? 'text' : 'password'}
            value={form.password}
            onChange={(e) => updateField('password', e.target.value)}
            autoComplete="new-password"
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

          {form.password.length > 0 && (
            <>
              <div className="hermes-strength-row">
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className={`hermes-strength-bar ${i < strength ? `hermes-strength-${strength}` : ''}`}
                  />
                ))}
              </div>
              <div className="hermes-checks-grid">
                {checks.map((c) => (
                  <span key={c.label} className={c.passed ? 'hermes-check-ok' : 'hermes-check-pending'}>
                    {c.passed ? '✓' : '○'} {c.label}
                  </span>
                ))}
              </div>
            </>
          )}

          <label className="hermes-terms-row">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
            />
            <span>
              Acepto los <a href="#">Términos</a> y la <a href="#">Política de Privacidad</a> de HERMES UTEQ
            </span>
          </label>

          <HButton type="submit" full loading={loading} className="hermes-btn-round">
            Registrarse
          </HButton>
        </form>

        <p className="hermes-auth-footer">
          ¿Ya tienes cuenta? <Link href="/login">Inicia sesión</Link>
        </p>
      </div>
    </main>
  );
}
