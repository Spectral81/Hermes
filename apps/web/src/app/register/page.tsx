'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { getAuthErrorMessage, validateRegister } from '@uteq/shared';
import { createClient } from '@/lib/supabase/client';
import { getAppUrl } from '@/lib/config';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    matricula: '',
    nombre: '',
    apellidos: '',
    telefono: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function updateField(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
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
    const supabase = createClient();
    const email = form.email.trim().toLowerCase();

    const { error: authError } = await supabase.auth.signUp({
      email,
      password: form.password,
      options: {
        data: {
          matricula: form.matricula.trim(),
          nombre: form.nombre.trim(),
          apellidos: form.apellidos.trim(),
          telefono: form.telefono.trim(),
        },
        emailRedirectTo: `${getAppUrl()}/auth/callback?next=/dashboard`,
      },
    });

    if (authError) {
      setError(getAuthErrorMessage(authError.message));
      setLoading(false);
      return;
    }

    router.push(`/verify-email?email=${encodeURIComponent(email)}`);
  }

  return (
    <main className="auth-page">
      <div className="auth-card auth-card-wide">
        <div className="auth-header">
          <span className="auth-badge">UTEQ</span>
          <h1>Crear cuenta</h1>
          <p>Solo correos @uteq.edu.mx</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="alert alert-error">{error}</div>}

          <div className="form-grid">
            <label>
              Matrícula
              <input
                value={form.matricula}
                onChange={(e) => updateField('matricula', e.target.value)}
                placeholder="2023001234"
                required
              />
            </label>

            <label>
              Teléfono
              <input
                type="tel"
                value={form.telefono}
                onChange={(e) => updateField('telefono', e.target.value)}
                placeholder="4421234567"
                required
              />
            </label>
          </div>

          <div className="form-grid">
            <label>
              Nombre
              <input
                value={form.nombre}
                onChange={(e) => updateField('nombre', e.target.value)}
                required
              />
            </label>

            <label>
              Apellidos
              <input
                value={form.apellidos}
                onChange={(e) => updateField('apellidos', e.target.value)}
                required
              />
            </label>
          </div>

          <label>
            Correo institucional
            <input
              type="email"
              value={form.email}
              onChange={(e) => updateField('email', e.target.value)}
              placeholder="nombre@uteq.edu.mx"
              autoComplete="email"
              required
            />
          </label>

          <div className="form-grid">
            <label>
              Contraseña
              <input
                type="password"
                value={form.password}
                onChange={(e) => updateField('password', e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </label>

            <label>
              Confirmar contraseña
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(e) => updateField('confirmPassword', e.target.value)}
                autoComplete="new-password"
                required
              />
            </label>
          </div>

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Registrando…' : 'Registrarse'}
          </button>
        </form>

        <p className="auth-footer">
          ¿Ya tienes cuenta? <Link href="/login">Inicia sesión</Link>
        </p>
      </div>
    </main>
  );
}
