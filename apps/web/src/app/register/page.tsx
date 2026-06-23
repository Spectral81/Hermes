'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import {
  formatAuthError,
  getAuthErrorMessage,
  isUteqEmail,
  validateRegister,
} from '@uteq/shared';
import { HButton } from '@/components/ui/HButton';
import { HInput } from '@/components/ui/HInput';
import { BackIcon, EyeIcon, LockIcon, MailIcon } from '@/components/ui/icons';

function passwordChecks(pw: string) {
  return [
    { ok: pw.length >= 8, l: '8 caracteres' },
    { ok: /[A-Z]/.test(pw), l: 'Mayúscula' },
    { ok: /[0-9]/.test(pw), l: 'Número' },
    { ok: /[^A-Za-z0-9]/.test(pw), l: 'Símbolo' },
  ];
}

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState({
    matricula: '',
    nombre: '',
    apellidos: '',
    telefono: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function updateField(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const checks = passwordChecks(form.password);
  const strength = checks.filter((c) => c.ok).length;

  function validateStep1(): string | null {
    if (!form.nombre.trim()) return 'El nombre es obligatorio.';
    if (!form.apellidos.trim()) return 'El apellido es obligatorio.';
    if (!form.matricula.trim()) return 'La matrícula es obligatoria.';
    if (!isUteqEmail(form.email)) return 'Usa tu correo @uteq.edu.mx.';
    if (form.password.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
    if (!acceptedTerms) return 'Debes aceptar los términos y la política de privacidad.';
    return null;
  }

  function handleContinue(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const err = validateStep1();
    if (err) {
      setError(err);
      return;
    }
    setStep(2);
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (form.password !== form.confirmPassword) {
      setError('Las contraseñas no coinciden.');
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

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          matricula: form.matricula,
          nombre: form.nombre,
          apellidos: form.apellidos,
          telefono: form.telefono,
          email: form.email,
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
            ? formatAuthError({ message: result.error, code: result.code, status: res.status })
            : getAuthErrorMessage(result?.error ?? `Error del servidor (HTTP ${res.status}).`),
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
          onClick={() => (step === 2 ? setStep(1) : router.push('/'))}
          aria-label="Volver"
        >
          <BackIcon />
        </button>

        <header className="hermes-auth-header">
          <h1>Crear cuenta</h1>
          <p>
            Paso {step} de 2 · {step === 1 ? 'Datos personales' : 'Contacto y seguridad'}
          </p>
          <div className="hermes-progress">
            <span className="hermes-progress-bar hermes-progress-on" />
            <span className={`hermes-progress-bar ${step === 2 ? 'hermes-progress-on' : ''}`} />
          </div>
        </header>

        {error && <div className="hermes-alert-error">{error}</div>}

        {step === 1 ? (
          <form onSubmit={handleContinue} className="hermes-auth-form">
            <div className="hermes-form-grid">
              <HInput
                label="Nombre"
                value={form.nombre}
                onChange={(e) => updateField('nombre', e.target.value)}
                valid={form.nombre.trim().length > 0}
              />
              <HInput
                label="Apellido"
                value={form.apellidos}
                onChange={(e) => updateField('apellidos', e.target.value)}
                valid={form.apellidos.trim().length > 0}
              />
            </div>

            <HInput
              label="Matrícula UTEQ"
              value={form.matricula}
              onChange={(e) => updateField('matricula', e.target.value)}
              helper="10 dígitos"
              valid={/^\d{10}$/.test(form.matricula.trim())}
            />

            <HInput
              label="Correo institucional"
              type="email"
              value={form.email}
              onChange={(e) => updateField('email', e.target.value)}
              placeholder="nombre@uteq.edu.mx"
              autoComplete="email"
              icon={<MailIcon />}
              valid={form.email.length > 0 && isUteqEmail(form.email)}
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
                    <span key={c.l} className={c.ok ? 'hermes-check-ok' : 'hermes-check-pending'}>
                      {c.ok ? '✓' : '○'} {c.l}
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

            <HButton type="submit" full className="hermes-btn-round">
              Continuar
            </HButton>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="hermes-auth-form">
            <HInput
              label="Teléfono"
              type="tel"
              value={form.telefono}
              onChange={(e) => updateField('telefono', e.target.value)}
              placeholder="4421234567"
              valid={form.telefono.trim().length >= 10}
            />

            <HInput
              label="Confirmar contraseña"
              type={showPassword ? 'text' : 'password'}
              value={form.confirmPassword}
              onChange={(e) => updateField('confirmPassword', e.target.value)}
              autoComplete="new-password"
              icon={<LockIcon />}
              valid={form.confirmPassword.length > 0 && form.confirmPassword === form.password}
            />

            <HButton type="submit" full loading={loading} className="hermes-btn-round">
              Registrarse
            </HButton>
          </form>
        )}

        <p className="hermes-auth-footer">
          ¿Ya tienes cuenta? <Link href="/login">Inicia sesión</Link>
        </p>
      </div>
    </main>
  );
}
