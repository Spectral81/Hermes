'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Wearable = {
  id: string;
  device_code: string;
  label: string;
  active: boolean;
  last_sos_at: string | null;
  created_at: string;
};

async function authHeaders(): Promise<HeadersInit> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
}

export function WearableDevicesPanel({ compact = false }: { compact?: boolean }) {
  const [items, setItems] = useState<Wearable[]>([]);
  const [code, setCode] = useState('');
  const [label, setLabel] = useState('Pulsera SOS');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/wearables', { headers: await authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudieron cargar las pulseras');
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onPair(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setOkMsg(null);
    try {
      const res = await fetch('/api/wearables', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ device_code: code, label }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo vincular');
      setCode('');
      setOkMsg(`Pulsera ${data.device_code} vinculada.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al vincular');
    } finally {
      setSaving(false);
    }
  }

  async function onUnlink(id: string) {
    if (!window.confirm('¿Desvincular esta pulsera?')) return;
    setError(null);
    try {
      const res = await fetch(`/api/wearables/${id}`, {
        method: 'DELETE',
        headers: await authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo desvincular');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al desvincular');
    }
  }

  return (
    <section className={`wearable-panel${compact ? ' wearable-panel-compact' : ''}`}>
      <div className="wearable-panel-head">
        <h3>Pulsera SOS</h3>
        <p>
          Escribe el código de tu ESP32 (el de la etiqueta o el del programa). Así sabremos quién
          envió la emergencia.
        </p>
      </div>

      {loading ? (
        <p className="wearable-muted">Cargando…</p>
      ) : items.length === 0 ? (
        <p className="wearable-muted">Aún no tienes pulsera vinculada.</p>
      ) : (
        <ul className="wearable-list">
          {items.map((w) => (
            <li key={w.id}>
              <div>
                <strong>{w.label}</strong>
                <span>{w.device_code}</span>
              </div>
              <button type="button" onClick={() => void onUnlink(w.id)}>
                Quitar
              </button>
            </li>
          ))}
        </ul>
      )}

      <form className="wearable-form" onSubmit={onPair}>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Código ej. HMS-A1B2"
          maxLength={32}
          required
          aria-label="Código de pulsera"
        />
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Nombre (opcional)"
          maxLength={60}
          aria-label="Nombre de la pulsera"
        />
        <button type="submit" disabled={saving || !code.trim()}>
          {saving ? 'Vinculando…' : 'Vincular'}
        </button>
      </form>

      {error && <p className="wearable-error">{error}</p>}
      {okMsg && <p className="wearable-ok">{okMsg}</p>}
    </section>
  );
}
