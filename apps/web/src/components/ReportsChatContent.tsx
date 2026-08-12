'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { HermesLogoLockup } from '@/components/ui/HermesLogo';
import { createClient } from '@/lib/supabase/client';

type MapPin = {
  lat: number;
  lng: number;
  label: string;
};

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  map?: MapPin | null;
};

async function authHeaders(): Promise<HeadersInit> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
}

const SUGGESTIONS = [
  '¿Qué reportes hubo esta semana?',
  '¿Cuántos robos hay activos?',
  '¿Dónde hay más incidentes?',
  'Resume el último reporte',
];

function osmEmbedUrl(lat: number, lng: number) {
  const d = 0.004;
  const bbox = `${lng - d}%2C${lat - d}%2C${lng + d}%2C${lat + d}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`;
}

export function ReportsChatContent() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Hola, soy HERMES. Pregúntame sobre los últimos reportes del campus.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || loading) return;

    setError(null);
    setInput('');
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: 'user', text: message },
    ]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat/reports', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ message }),
      });
      const data = (await res.json()) as {
        reply?: string;
        error?: string;
        map?: MapPin | null;
      };
      if (!res.ok) {
        throw new Error(data.error || data.reply || 'No se pudo responder.');
      }
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: data.reply?.trim() || 'Sin respuesta.',
          map: data.map ?? null,
        },
      ]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error de red.';
      setError(msg);
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: 'assistant',
          text: msg,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(input);
  }

  return (
    <div className="hermes-chat-page">
      <header className="web-app-header">
        <HermesLogoLockup size={28} />
        <div className="web-app-header-actions">
          <Link className="web-header-link" href="/mapa">
            Mapa
          </Link>
          <Link className="web-header-link" href="/eventos">
            Eventos
          </Link>
        </div>
      </header>

      <main className="hermes-chat-shell">
        <div className="hermes-chat-intro">
          <h1>Asistente de reportes</h1>
          <p>Preguntas sobre los últimos incidentes del campus, con datos en vivo.</p>
        </div>

        <div className="hermes-chat-suggestions" aria-label="Sugerencias">
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" className="hermes-chat-chip" onClick={() => void send(s)}>
              {s}
            </button>
          ))}
        </div>

        <div className="hermes-chat-thread" role="log" aria-live="polite">
          {messages.map((m) => (
            <div key={m.id} className={`hermes-chat-msg hermes-chat-msg-${m.role}`}>
              <div className={`hermes-chat-bubble hermes-chat-bubble-${m.role}`}>{m.text}</div>
              {m.map && (
                <div className="hermes-chat-map">
                  <p className="hermes-chat-map-label">{m.map.label}</p>
                  <iframe
                    title={m.map.label}
                    src={osmEmbedUrl(m.map.lat, m.map.lng)}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                  <Link
                    className="hermes-chat-map-link"
                    href={`/mapa?lat=${m.map.lat}&lng=${m.map.lng}`}
                  >
                    Abrir en el mapa de HERMES
                  </Link>
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="hermes-chat-bubble hermes-chat-bubble-assistant hermes-chat-typing">
              Pensando…
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {error && <p className="hermes-chat-error">{error}</p>}

        <form className="hermes-chat-form" onSubmit={onSubmit}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ej. ¿Cuántos accidentes hay activos?"
            disabled={loading}
            maxLength={1000}
            aria-label="Tu pregunta"
          />
          <button type="submit" disabled={loading || !input.trim()}>
            Enviar
          </button>
        </form>
      </main>
    </div>
  );
}
