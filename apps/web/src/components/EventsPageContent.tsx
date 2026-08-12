'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  VENDOR_CATEGORY_LABELS,
  type CampusEvent,
  type CreateCampusEventInput,
  type CreateVendorApplicationInput,
  type EventVendorApplication,
  type Profile,
  type VendorCategory,
} from '@uteq/shared';
import { EventMapPicker } from '@/components/EventMapPicker';
import {
  EventCalendarGlyph,
  EventKermesIcon,
  EventPinGlyph,
  EventStoreGlyph,
} from '@/components/IncidentTypeGlyph';
import { HButton } from '@/components/ui/HButton';
import { HermesLogoLockup } from '@/components/ui/HermesLogo';
import { isCampusEventPast } from '@/lib/events';
import { createClient } from '@/lib/supabase/client';

const CATEGORIES = Object.keys(VENDOR_CATEGORY_LABELS) as VendorCategory[];

function formatEventDate(iso: string | null | undefined): string {
  if (!iso) return 'Fecha por confirmar';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Fecha por confirmar';
  return d.toLocaleDateString('es-MX', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatEventRange(starts: string | null | undefined, ends: string | null | undefined): string {
  if (!starts && !ends) return 'Fecha por confirmar';
  if (starts && ends) return `${formatEventDate(starts)} → ${formatEventDate(ends)}`;
  return formatEventDate(starts ?? ends);
}

function defaultEventStart(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  d.setHours(10, 0, 0, 0);
  return d.toISOString();
}

function defaultEventEnd(fromIso?: string | null): string {
  const d = fromIso ? new Date(fromIso) : new Date(defaultEventStart());
  if (Number.isNaN(d.getTime())) return defaultEventStart();
  // Por defecto: mismo día a las 22:00 (feria de día completo).
  d.setHours(22, 0, 0, 0);
  const start = fromIso ? new Date(fromIso) : d;
  if (d.getTime() <= start.getTime()) {
    d.setTime(start.getTime() + 6 * 60 * 60 * 1000);
  }
  return d.toISOString();
}

function toDatetimeLocalValue(iso: string | null | undefined, fallbackIso: string): string {
  const d = new Date(iso || fallbackIso);
  if (Number.isNaN(d.getTime())) return toDatetimeLocalValue(fallbackIso, fallbackIso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function emptyCreateForm(): CreateCampusEventInput {
  const starts_at = defaultEventStart();
  return {
    title: '',
    description: '',
    lat: 20.6534,
    lng: -100.4045,
    location_label: '',
    max_vendors: 20,
    starts_at,
    ends_at: defaultEventEnd(starts_at),
  };
}

async function authHeaders(): Promise<HeadersInit> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
}

export function EventsPageContent() {
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{
    event: CampusEvent;
    applications: EventVendorApplication[];
    my_application: EventVendorApplication | null;
  } | null>(null);
  const [filter, setFilter] = useState<'todos' | VendorCategory>('todos');
  const [showCreate, setShowCreate] = useState(false);
  const [showApply, setShowApply] = useState(false);
  const [busy, setBusy] = useState(false);

  const [createForm, setCreateForm] = useState<CreateCampusEventInput>(() => emptyCreateForm());

  const [applyForm, setApplyForm] = useState<CreateVendorApplicationInput>({
    business_name: '',
    group_name: '',
    what_they_sell: '',
    category: 'comida',
  });

  const isAdmin = profile?.role === 'admin_general';

  const loadEvents = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const res = await fetch('/api/events', { cache: 'no-store', credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error');
      setEvents(data as CampusEvent[]);
    } catch (e) {
      if (!silent) {
        setError(e instanceof Error ? e.message : 'No se pudieron cargar eventos');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (id: string, _opts?: { silent?: boolean }) => {
    const res = await fetch(`/api/events/${id}`, {
      cache: 'no-store',
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Error');
    setDetail(
      data as {
        event: CampusEvent;
        applications: EventVendorApplication[];
        my_application: EventVendorApplication | null;
      },
    );
  }, []);

  const refreshAll = useCallback(
    async (eventId?: string | null) => {
      await loadEvents();
      if (eventId) await loadDetail(eventId);
    },
    [loadEvents, loadDetail],
  );

  useEffect(() => {
    async function boot() {
      const supabase = createClient();
      const { data } = await supabase.rpc('ensure_my_profile');
      setProfile(data as Profile | null);
      await loadEvents();
    }
    void boot();
  }, [loadEvents]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    void loadDetail(selectedId).catch((e) => setError(e.message));
  }, [selectedId, loadDetail]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadEvents({ silent: true });
      if (selectedId) {
        void loadDetail(selectedId, { silent: true }).catch(() => {});
      }
    }, 10_000);
    return () => window.clearInterval(timer);
  }, [loadEvents, loadDetail, selectedId]);

  const visibleEvents = useMemo(
    () => events.filter((ev) => ev.status === 'abierto' && !isCampusEventPast(ev)),
    [events],
  );

  const vendorsVisible = useMemo(() => {
    const apps = detail?.applications ?? [];
    const accepted = apps.filter((a) => a.status === 'aceptado');
    if (filter === 'todos') return accepted;
    return accepted.filter((a) => a.category === filter);
  }, [detail, filter]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (!createForm.starts_at?.trim() || !createForm.ends_at?.trim()) {
        throw new Error('Indica fecha de inicio y fecha de fin');
      }
      const startMs = new Date(createForm.starts_at).getTime();
      const endMs = new Date(createForm.ends_at).getTime();
      if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) {
        throw new Error('La fecha de fin debe ser posterior al inicio');
      }
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: await authHeaders(),
        credentials: 'include',
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al crear');
      setShowCreate(false);
      setCreateForm(emptyCreateForm());
      setSelectedId(data.id as string);
      await refreshAll(data.id as string);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  async function handleApply(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/events/${selectedId}`, {
        method: 'POST',
        headers: await authHeaders(),
        credentials: 'include',
        body: JSON.stringify(applyForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al postular');
      setShowApply(false);
      setApplyForm({
        business_name: '',
        group_name: '',
        what_they_sell: '',
        category: 'comida',
      });
      await refreshAll(selectedId);
      void data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  async function reviewApp(appId: string, status: 'aceptado' | 'rechazado') {
    if (!selectedId) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/events/${selectedId}/applications/${appId}`, {
        method: 'PATCH',
        headers: await authHeaders(),
        credentials: 'include',
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error');
      await refreshAll(selectedId);
      void data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  async function toggleEventStatus() {
    if (!selectedId || !detail) return;
    const next = detail.event.status === 'abierto' ? 'cerrado' : 'abierto';
    setBusy(true);
    try {
      const res = await fetch(`/api/events/${selectedId}`, {
        method: 'PATCH',
        headers: await authHeaders(),
        credentials: 'include',
        body: JSON.stringify({ status: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error');
      await refreshAll(selectedId);
      void data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  const myApplication = detail?.my_application ?? null;
  const canApply =
    detail?.event.status === 'abierto' && !myApplication && !isAdmin;

  return (
    <div className="web-app events-app">
      <header className="web-app-header">
        <HermesLogoLockup size={28} />
        <div className="web-app-header-actions">
          {isAdmin && (
            <Link className="web-header-link" href="/dashboard">
              Panel
            </Link>
          )}
          <Link className="web-header-link" href="/asistente">
            Asistente
          </Link>
          <Link className="web-header-link" href="/mis-reportes">
            Mis reportes
          </Link>
          <Link className="web-header-link" href="/mapa">
            Mapa
          </Link>
          {isAdmin && (
            <HButton onClick={() => setShowCreate(true)} disabled={busy}>
              Crear evento
            </HButton>
          )}
        </div>
      </header>

      <div className="events-layout">
        <aside className="events-list-panel">
          <h1>Eventos</h1>
          <p className="events-sub">Ferias y puestos en el campus</p>
          {loading && <p>Cargando…</p>}
          {error && <p className="events-error">{error}</p>}
          <ul className="events-list">
            {visibleEvents.map((ev) => (
              <li key={ev.id}>
                <button
                  type="button"
                  className={`events-item${selectedId === ev.id ? ' active' : ''}`}
                  onClick={() => setSelectedId(ev.id)}
                >
                  <strong className="events-item-title">
                    <EventKermesIcon size={22} />
                    {ev.title}
                  </strong>
                  <span
                    className={`events-status ${ev.status === 'abierto' ? 'open' : 'closed'}`}
                  >
                    · {ev.status === 'abierto' ? 'Abierto' : 'Cerrado'}
                  </span>
                  <small className="events-item-meta">
                    <span className="events-meta-chip">
                      <EventCalendarGlyph size={16} />
                      {formatEventRange(ev.starts_at, ev.ends_at)}
                    </span>
                    <span className="events-meta-chip">
                      <EventPinGlyph size={16} />
                      {ev.location_label || 'Campus UTEQ'}
                    </span>
                    <span className="events-meta-chip">
                      <EventStoreGlyph size={16} />
                      {ev.accepted_count ?? 0}/{ev.max_vendors} puestos
                    </span>
                  </small>
                </button>
              </li>
            ))}
            {!loading && visibleEvents.length === 0 && (
              <li className="events-empty">Aún no hay eventos</li>
            )}
          </ul>
        </aside>

        <main className="events-detail-panel">
          {!detail && <p className="events-empty">Selecciona un evento</p>}
          {detail && (
            <>
              <div className="events-detail-head">
                <div>
                  <h2>{detail.event.title}</h2>
                  <p>{detail.event.description || 'Sin descripción'}</p>
                  <p className="events-meta events-meta-row">
                    <span className="events-meta-chip">
                      <EventCalendarGlyph size={18} />
                      {formatEventRange(detail.event.starts_at, detail.event.ends_at)}
                    </span>
                    <span className="events-meta-chip">
                      <EventPinGlyph size={18} />
                      {detail.event.location_label || `${detail.event.lat}, ${detail.event.lng}`}
                    </span>
                    <span className={detail.event.status === 'abierto' ? 'open' : 'closed'}>
                      {detail.event.status === 'abierto' ? 'Abierto' : 'Cerrado'}
                    </span>
                  </p>
                  {myApplication && (
                    <p className="events-my-app">
                      {myApplication.status === 'aceptado'
                        ? '✅ Tu solicitud fue aceptada'
                        : myApplication.status === 'pendiente'
                          ? '⏳ Solicitud en revisión'
                          : '❌ Solicitud rechazada'}
                    </p>
                  )}
                </div>
                <div className="events-detail-actions">
                  {isAdmin && (
                    <HButton onClick={toggleEventStatus} disabled={busy}>
                      {detail.event.status === 'abierto' ? 'Cerrar evento' : 'Abrir evento'}
                    </HButton>
                  )}
                  {canApply && (
                    <HButton onClick={() => setShowApply(true)} disabled={busy}>
                      Quiero participar
                    </HButton>
                  )}
                </div>
              </div>

              <div className="events-filters">
                {(['todos', ...CATEGORIES] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`events-chip${filter === c ? ' active' : ''}`}
                    onClick={() => setFilter(c)}
                  >
                    {c === 'todos' ? 'Todos' : VENDOR_CATEGORY_LABELS[c]}
                  </button>
                ))}
              </div>

                  <ul className="vendor-cards">
                {vendorsVisible.map((v) => (
                  <li key={v.id} className="vendor-card">
                    <span className="vendor-emoji">
                      <EventStoreGlyph size={28} />
                    </span>
                    <div>
                      <div className="vendor-title-row">
                        <strong>{v.business_name}</strong>
                        <span
                          className={
                            detail.event.status === 'abierto' ? 'vendor-open' : 'vendor-closed'
                          }
                        >
                          · {detail.event.status === 'abierto' ? 'Abierto' : 'Cerrado'}
                        </span>
                      </div>
                      <p>{v.what_they_sell}</p>
                      <small className="events-meta-chip">
                        <EventPinGlyph size={15} />
                        {detail.event.location_label || 'Campus'}
                      </small>
                    </div>
                  </li>
                ))}
                {vendorsVisible.length === 0 && (
                  <li className="events-empty">Sin negocios aceptados en esta categoría</li>
                )}
              </ul>

              {isAdmin && (
                <section className="events-admin-apps">
                  <h3>Solicitudes ({detail.applications.filter((a) => a.status === 'pendiente').length})</h3>
                  <ul>
                    {detail.applications
                      .filter((a) => a.status === 'pendiente')
                      .map((a) => (
                        <li key={a.id} className="events-app-row">
                          <div>
                            <strong>{a.business_name}</strong>
                            <span>
                              {' '}
                              · {a.group_name || 'Sin grupo'} · {VENDOR_CATEGORY_LABELS[a.category]}
                            </span>
                            <p>{a.what_they_sell}</p>
                            <small>{a.author_nombre}</small>
                          </div>
                          <div className="events-app-actions">
                            <button type="button" disabled={busy} onClick={() => reviewApp(a.id, 'aceptado')}>
                              Aceptar
                            </button>
                            <button type="button" disabled={busy} onClick={() => reviewApp(a.id, 'rechazado')}>
                              Rechazar
                            </button>
                          </div>
                        </li>
                      ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </main>
      </div>

      {showCreate && (
        <div className="events-modal-backdrop" onClick={() => setShowCreate(false)} role="presentation">
          <form
            className="events-modal events-modal-wide"
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleCreate}
          >
            <h3>Nuevo evento</h3>
            <label>
              Título
              <input
                required
                value={createForm.title}
                onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
              />
            </label>
            <label>
              Descripción
              <textarea
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              />
            </label>
            <div className="events-modal-grid events-modal-grid-2">
              <label>
                <span className="events-label-with-icon">
                  <EventCalendarGlyph size={18} />
                  Fecha de inicio
                </span>
                <input
                  type="datetime-local"
                  required
                  value={toDatetimeLocalValue(createForm.starts_at, defaultEventStart())}
                  onChange={(e) => {
                    const local = new Date(e.target.value);
                    if (Number.isNaN(local.getTime())) return;
                    const starts_at = local.toISOString();
                    const endMs = createForm.ends_at ? new Date(createForm.ends_at).getTime() : NaN;
                    setCreateForm({
                      ...createForm,
                      starts_at,
                      ends_at:
                        Number.isNaN(endMs) || endMs <= local.getTime()
                          ? defaultEventEnd(starts_at)
                          : createForm.ends_at,
                    });
                  }}
                />
              </label>
              <label>
                <span className="events-label-with-icon">
                  <EventCalendarGlyph size={18} />
                  Fecha de fin
                </span>
                <input
                  type="datetime-local"
                  required
                  value={toDatetimeLocalValue(
                    createForm.ends_at,
                    defaultEventEnd(createForm.starts_at),
                  )}
                  onChange={(e) => {
                    const local = new Date(e.target.value);
                    if (Number.isNaN(local.getTime())) return;
                    setCreateForm({ ...createForm, ends_at: local.toISOString() });
                  }}
                />
              </label>
            </div>
            <label>
              <span className="events-label-with-icon">
                <EventPinGlyph size={18} />
                Lugar (etiqueta)
              </span>
              <input
                value={createForm.location_label ?? ''}
                onChange={(e) => setCreateForm({ ...createForm, location_label: e.target.value })}
                placeholder="Ej. Entrada principal, patio central…"
              />
            </label>
            <div className="events-map-field">
              <span className="events-map-field-label events-label-with-icon">
                <EventPinGlyph size={18} />
                Ubicación en el mapa
              </span>
              <EventMapPicker
                lat={createForm.lat}
                lng={createForm.lng}
                onChange={(nextLat, nextLng) =>
                  setCreateForm({ ...createForm, lat: nextLat, lng: nextLng })
                }
              />
            </div>
            <label>
              <span className="events-label-with-icon">
                <EventStoreGlyph size={18} />
                Cupo puestos
              </span>
              <input
                type="number"
                min={1}
                required
                value={createForm.max_vendors}
                onChange={(e) =>
                  setCreateForm({ ...createForm, max_vendors: Number(e.target.value) })
                }
              />
            </label>
            <div className="events-modal-actions">
              <HButton type="button" variant="ghost" onClick={() => setShowCreate(false)}>
                Cancelar
              </HButton>
              <HButton type="submit" disabled={busy}>
                Crear y notificar
              </HButton>
            </div>
          </form>
        </div>
      )}

      {showApply && (
        <div className="events-modal-backdrop" onClick={() => setShowApply(false)} role="presentation">
          <form className="events-modal" onClick={(e) => e.stopPropagation()} onSubmit={handleApply}>
            <h3>Participar como negocio</h3>
            <label>
              Nombre del negocio
              <input
                required
                value={applyForm.business_name}
                onChange={(e) => setApplyForm({ ...applyForm, business_name: e.target.value })}
              />
            </label>
            <label>
              Grupo / organización
              <input
                value={applyForm.group_name ?? ''}
                onChange={(e) => setApplyForm({ ...applyForm, group_name: e.target.value })}
              />
            </label>
            <label>
              ¿Qué venderán?
              <textarea
                required
                value={applyForm.what_they_sell}
                onChange={(e) => setApplyForm({ ...applyForm, what_they_sell: e.target.value })}
              />
            </label>
            <label>
              Categoría
              <select
                value={applyForm.category}
                onChange={(e) =>
                  setApplyForm({ ...applyForm, category: e.target.value as VendorCategory })
                }
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {VENDOR_CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </label>
            <div className="events-modal-actions">
              <HButton type="button" variant="ghost" onClick={() => setShowApply(false)}>
                Cancelar
              </HButton>
              <HButton type="submit" disabled={busy}>
                Enviar solicitud
              </HButton>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
