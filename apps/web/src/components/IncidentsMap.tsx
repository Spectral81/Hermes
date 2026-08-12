'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  INCIDENT_LABELS,
  INCIDENT_VALIDATION_TARGET,
  timeAgo,
  type CampusEvent,
  type Incident,
} from '@uteq/shared';
import type { Profile } from '@uteq/shared';
import { AppToast, type ToastMessage } from '@/components/AppToast';
import { IncidentCard } from '@/components/IncidentCard';
import { EventCalendarGlyph, EventKermesIcon, EventPinGlyph, IncidentTypeGlyph } from '@/components/IncidentTypeGlyph';
import { ProfileDrawer } from '@/components/ProfileDrawer';
import { ReportSheet } from '@/components/ReportSheet';
import { HButton } from '@/components/ui/HButton';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { HermesLogoLockup } from '@/components/ui/HermesLogo';
import { filterNearbyRecentIncidents, formatDistance, isRecentIso } from '@/lib/geo';
import {
  getGeolocationPermission,
  readStoredUserLocation,
  requestUserLocationReliable,
  saveUserLocation,
} from '@/lib/geolocation';
import { isCampusEventVisibleOnMap } from '@/lib/events';
import { fetchIncidents } from '@/lib/incidents';
import { loadLeaflet } from '@/lib/leaflet';
import { createClient } from '@/lib/supabase/client';
import { CATEGORY } from '@/lib/theme';

const UTEQ_CENTER: [number, number] = [20.6534, -100.4045];

function formatShortEventWhen(iso: string | null | undefined): string {
  if (!iso) return 'Fecha por confirmar';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Fecha por confirmar';
  return d.toLocaleDateString('es-MX', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function isCampusFallback(location: { lat: number; lng: number }): boolean {
  return (
    Math.abs(location.lat - UTEQ_CENTER[0]) < 0.0001 &&
    Math.abs(location.lng - UTEQ_CENTER[1]) < 0.0001
  );
}

interface IncidentWithDistance extends Incident {
  distanceM: number;
}

function markerIcon(L: any, type: Incident['type'], likes: number) {
  const cat = CATEGORY[type];
  const badge =
    likes > 0
      ? `<span class="map-pin-badge">${likes > 99 ? '99+' : likes}</span>`
      : '';
  const srcByType: Record<Incident['type'], string> = {
    robo: '/markers/spy.png',
    accidente: '/markers/slip.png',
    infraestructura: '/markers/hammer.png',
    panico: '/markers/sos.png',
  };
  const glyph = `<span class="map-spy-float"><img class="map-spy-icon" src="${srcByType[type]}" alt="${cat.label}" width="36" height="36" draggable="false" /></span>`;
  const html = `
    <div class="map-emoji-wrap map-emoji-wrap-spy map-emoji-wrap-incident">
      <div class="map-emoji-pin" style="border-color:${cat.color}">
        ${glyph}
      </div>
      ${badge}
    </div>`;
  return L.divIcon({
    html,
    className: '',
    iconSize: [60, 60],
    iconAnchor: [30, 30],
  });
}

function eventMarkerIcon(L: any, title: string) {
  const html = `
    <div class="map-emoji-wrap map-emoji-wrap-spy map-emoji-wrap-event">
      <div class="map-emoji-pin" style="border-color:#F59E0B">
        <span class="event-balloon-float">
          <img class="event-balloon-icon" src="/markers/kermes-icon.png" alt="${title.replace(/"/g, '')}" width="40" height="40" draggable="false" />
        </span>
      </div>
    </div>`;
  return L.divIcon({
    html,
    className: '',
    iconSize: [64, 64],
    iconAnchor: [32, 32],
  });
}

/** Separa pines que caen en el mismo punto (p. ej. SOS + evento en el centro del campus). */
function spreadOverlapping(
  points: Array<{ lat: number; lng: number }>,
): Array<{ lat: number; lng: number }> {
  const buckets = new Map<string, number[]>();
  points.forEach((p, idx) => {
    const key = `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`;
    const list = buckets.get(key) ?? [];
    list.push(idx);
    buckets.set(key, list);
  });

  const out = points.map((p) => ({ ...p }));
  const step = 0.00018; // ~20 m
  for (const idxs of buckets.values()) {
    if (idxs.length < 2) continue;
    idxs.forEach((idx, i) => {
      if (i === 0) return;
      const angle = (i * 2 * Math.PI) / idxs.length;
      out[idx].lat += Math.cos(angle) * step;
      out[idx].lng += Math.sin(angle) * step;
    });
  }
  return out;
}

/** Ubicación rápida para pintar el mapa (caché o campus). El GPS se pide aparte. */
function initialMapLocation(): { lat: number; lng: number; fromCache: boolean } {
  const stored = readStoredUserLocation();
  if (stored) return { ...stored, fromCache: true };
  return { lat: UTEQ_CENTER[0], lng: UTEQ_CENTER[1], fromCache: false };
}

export function IncidentsMap() {
  const searchParams = useSearchParams();
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const layerRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const LRef = useRef<any>(null);
  const focusFromChatDone = useRef(false);

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [mapEvents, setMapEvents] = useState<CampusEvent[]>([]);
  const [selected, setSelected] = useState<Incident | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState<'locating' | 'pending' | 'ready' | 'denied'>(
    'locating',
  );
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [locating, setLocating] = useState(false);

  const sortedAlerts = useMemo((): IncidentWithDistance[] => {
    const visible = incidents.filter((i) => i.status !== 'cerrado' && i.status !== 'rechazado');
    return filterNearbyRecentIncidents(visible, coords);
  }, [incidents, coords]);

  /** Marcadores del mapa: alertas recientes visibles (sin cerrado/rechazado). */
  const mapIncidents = useMemo(() => {
    return incidents
      .filter(
        (i) =>
          i.status !== 'cerrado' &&
          i.status !== 'rechazado' &&
          isRecentIso(i.created_at) &&
          Number.isFinite(i.lat) &&
          Number.isFinite(i.lng),
      )
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [incidents]);

  const renderMarkers = useCallback((L: any, list: Incident[], events: CampusEvent[]) => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.clearLayers();

    const rawPoints = [
      ...list.map((inc) => ({ lat: inc.lat, lng: inc.lng })),
      ...events.map((ev) => ({ lat: ev.lat, lng: ev.lng })),
    ];
    const spread = spreadOverlapping(rawPoints);

    list.forEach((inc, idx) => {
      if (!Number.isFinite(inc.lat) || !Number.isFinite(inc.lng)) return;
      const pos = spread[idx];
      const marker = L.marker([pos.lat, pos.lng], {
        icon: markerIcon(L, inc.type, inc.likes_count),
        zIndexOffset: inc.type === 'panico' ? 500 : 100,
      });
      marker.on('click', () => setSelected(inc));
      marker.addTo(layer);
    });
    events.forEach((ev, eIdx) => {
      if (!Number.isFinite(ev.lat) || !Number.isFinite(ev.lng)) return;
      const pos = spread[list.length + eIdx];
      const marker = L.marker([pos.lat, pos.lng], {
        icon: eventMarkerIcon(L, ev.title),
        zIndexOffset: 200,
      });
      marker.bindPopup(
        `<strong>${ev.title}</strong><br/>${ev.location_label || 'Campus'}<br/><a href="/eventos">Ver evento</a>`,
      );
      marker.addTo(layer);
    });
  }, []);

  const loadIncidents = useCallback(async () => {
    try {
      const data = await fetchIncidents();
      setIncidents(data);
      setStatus('ready');
    } catch (e) {
      setStatus('error');
      setErrorMsg(e instanceof Error ? e.message : 'No se pudieron cargar los reportes.');
    }
  }, []);

  const loadMapEvents = useCallback(async () => {
    try {
      const res = await fetch('/api/events', { cache: 'no-store', credentials: 'include' });
      if (!res.ok) return;
      const data = (await res.json()) as CampusEvent[];
      setMapEvents(
        (data ?? [])
          .filter((e) => isCampusEventVisibleOnMap(e))
          .sort((a, b) => {
            const ta = a.starts_at ? new Date(a.starts_at).getTime() : Infinity;
            const tb = b.starts_at ? new Date(b.starts_at).getTime() : Infinity;
            return ta - tb;
          }),
      );
    } catch {
      // no bloquear mapa
    }
  }, []);

  useEffect(() => {
    if (LRef.current) renderMarkers(LRef.current, mapIncidents, mapEvents);
  }, [mapIncidents, mapEvents, renderMarkers]);

  useEffect(() => {
    if (status !== 'ready') return;
    const timer = window.setInterval(() => {
      void loadIncidents();
      void loadMapEvents();
    }, 10_000);
    return () => window.clearInterval(timer);
  }, [status, loadIncidents, loadMapEvents]);

  useEffect(() => {
    async function loadProfile() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase.rpc('ensure_my_profile');
        const p = data as Profile | null;
        if (p) setProfileName(`${p.nombre} ${p.apellidos}`);
      } catch {
        // sin sesión activa
      }
    }
    loadProfile();
  }, []);

  useEffect(() => {
    if (focusFromChatDone.current || !mapRef.current) return;
    const lat = Number(searchParams.get('lat'));
    const lng = Number(searchParams.get('lng'));
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    focusFromChatDone.current = true;
    mapRef.current.setView([lat, lng], 18);
  }, [searchParams, status]);

  const applyUserLocation = useCallback((location: { lat: number; lng: number }) => {
    setCoords(location);
    saveUserLocation(location);
    setLocationStatus('ready');
    if (mapRef.current) {
      mapRef.current.setView([location.lat, location.lng], 16);
    }
    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([location.lat, location.lng]);
    } else if (LRef.current && mapRef.current) {
      userMarkerRef.current = LRef.current.circleMarker([location.lat, location.lng], {
        radius: 9,
        color: '#3B82F6',
        fillColor: '#3B82F6',
        fillOpacity: 0.9,
        weight: 3,
      }).addTo(mapRef.current);
    }
  }, []);

  const locateMe = useCallback(async (showPromptOnFail = true) => {
    setLocating(true);
    setLocationStatus((prev) => (prev === 'ready' ? prev : 'locating'));
    try {
      const permission = await getGeolocationPermission();
      if (permission === 'denied') {
        setLocationStatus('denied');
        return null;
      }

      const location = await requestUserLocationReliable();
      if (location) {
        applyUserLocation(location);
        return location;
      }

      if (showPromptOnFail) {
        setLocationStatus(permission === 'prompt' ? 'pending' : 'denied');
      } else if (isCampusFallback(coords ?? { lat: UTEQ_CENTER[0], lng: UTEQ_CENTER[1] })) {
        setLocationStatus('pending');
      }
      return null;
    } finally {
      setLocating(false);
    }
  }, [applyUserLocation, coords]);

  async function handleAllowLocation() {
    const location = await locateMe(true);
    if (!location) return;
  }

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const L = await loadLeaflet();
        if (cancelled || !mapEl.current || mapRef.current) return;
        LRef.current = L;

        // Pintar rápido con caché/campus; luego pedir GPS real.
        const bootstrap = initialMapLocation();
        if (!cancelled) {
          setCoords({ lat: bootstrap.lat, lng: bootstrap.lng });
          setLocationStatus(bootstrap.fromCache ? 'ready' : 'locating');
        }

        const map = L.map(mapEl.current).setView([bootstrap.lat, bootstrap.lng], 16);
        // OSM .org bloquea o falla a menudo en producción; CartoCDN es estable.
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          maxZoom: 20,
          subdomains: 'abcd',
          attribution: '© OpenStreetMap © CARTO',
        }).addTo(map);

        mapRef.current = map;
        layerRef.current = L.layerGroup().addTo(map);

        // Recalcular tamaño tras layout (evita tiles grises en contenedores flex).
        requestAnimationFrame(() => {
          map.invalidateSize();
        });
        window.setTimeout(() => map.invalidateSize(), 250);

        userMarkerRef.current = L.circleMarker([bootstrap.lat, bootstrap.lng], {
          radius: 9,
          color: '#3B82F6',
          fillColor: '#3B82F6',
          fillOpacity: 0.9,
          weight: 3,
        }).addTo(map);

        map.on('click', () => setSelected(null));

        await loadIncidents();
        await loadMapEvents();

        if (cancelled) return;

        // Siempre refrescar GPS al abrir (no confiar solo en sessionStorage).
        const live = await requestUserLocationReliable();
        if (cancelled) return;
        if (live) {
          applyUserLocation(live);
        } else {
          const permission = await getGeolocationPermission();
          if (permission === 'denied') {
            setLocationStatus('denied');
          } else if (!bootstrap.fromCache || isCampusFallback(bootstrap)) {
            setLocationStatus('pending');
          }
        }
      } catch (e) {
        if (!cancelled) {
          setStatus('error');
          setErrorMsg(e instanceof Error ? e.message : 'No se pudo cargar el mapa.');
        }
      }
    }

    init();
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        userMarkerRef.current = null;
      }
    };
  }, [loadIncidents, loadMapEvents, applyUserLocation]);

  function handleLikeChange(
    id: string,
    likes: number,
    liked: boolean,
    verified?: boolean,
    verifiedNow?: boolean,
  ) {
    setIncidents((prev) =>
      prev.map((i) => (i.id === id ? { ...i, likes_count: likes, liked_by_me: liked } : i)),
    );
    setSelected((prev) =>
      prev && prev.id === id ? { ...prev, likes_count: likes, liked_by_me: liked } : prev,
    );
    if (verifiedNow) {
      setToast({
        id: `verified-${id}-${Date.now()}`,
        title: 'Reporte verificado',
        body: 'La comunidad confirmó esta alerta.',
        tone: 'success',
      });
    } else if (liked) {
      setToast({
        id: `validated-${id}-${Date.now()}`,
        title: 'Validación registrada',
        body: `Gracias. ${likes}/${INCIDENT_VALIDATION_TARGET} confirmaciones.`,
        tone: 'info',
      });
    }
  }

  function focusIncident(inc: Incident) {
    setSelected(inc);
    mapRef.current?.setView([inc.lat, inc.lng], 17);
    if ((inc.type === 'robo' || inc.type === 'accidente') && !inc.liked_by_me) {
      setToast({
        id: `can-validate-${inc.id}-${Date.now()}`,
        title: 'Puedes validar este reporte',
        body: 'Si lo viste, confirma que es real.',
        tone: 'warning',
      });
    }
  }

  function addIncidentToMap(incident: Incident) {
    setIncidents((prev) => {
      if (prev.some((i) => i.id === incident.id)) return prev;
      return [incident, ...prev];
    });
    mapRef.current?.setView([incident.lat, incident.lng], 17);
    setSelected(incident);
  }

  return (
    <div className="web-app">
      <header className="web-app-header">
        <HermesLogoLockup size={28} />
        <div className="web-app-header-actions">
          <a className="web-header-link" href="/asistente">
            Asistente
          </a>
          <a className="web-header-link" href="/eventos">
            Eventos
          </a>
          <a className="web-header-link" href="/mis-reportes">
            Mis reportes
          </a>
          <button
            type="button"
            className="web-app-avatar-btn"
            onClick={() => setProfileOpen(true)}
            aria-label="Mi perfil"
          >
            <ProfileAvatar name={profileName} size={40} />
          </button>
        </div>
      </header>

      <div className="web-app-body">
        {panelOpen && (
          <aside className="web-sidebar web-alerts-panel">
            <div className="web-sidebar-head">
              <div>
                <h2>Cerca de ti</h2>
                <p>
                  {mapEvents.length} eventos · {sortedAlerts.length} alertas
                </p>
              </div>
              <button
                type="button"
                className="web-panel-toggle"
                onClick={() => setPanelOpen(false)}
                aria-label="Ocultar panel"
              >
                ‹
              </button>
            </div>

            <div className="web-sidebar-scroll">
              <section className="web-events-section" aria-label="Eventos próximos">
                <div className="web-section-label">
                  <EventKermesIcon size={22} />
                  <span>Eventos próximos</span>
                </div>
                {mapEvents.length === 0 && status === 'ready' && (
                  <p className="web-alerts-empty">No hay eventos próximos</p>
                )}
                <ul className="web-events-list">
                  {mapEvents.map((ev) => (
                    <li key={ev.id}>
                      <button
                        type="button"
                        className="web-event-item"
                        onClick={() => {
                          if (mapRef.current && Number.isFinite(ev.lat) && Number.isFinite(ev.lng)) {
                            mapRef.current.setView([ev.lat, ev.lng], 17);
                          }
                          setSelected(null);
                        }}
                      >
                        <span className="web-event-glyph">
                          <EventKermesIcon size={28} />
                        </span>
                        <span className="web-alert-body">
                          <strong>{ev.title}</strong>
                          <span className="web-event-meta-line">
                            <EventPinGlyph size={15} />
                            {ev.location_label || 'Campus UTEQ'}
                          </span>
                          <small className="web-event-meta-line">
                            <EventCalendarGlyph size={15} />
                            {formatShortEventWhen(ev.starts_at)}
                            {ev.ends_at ? ` → ${formatShortEventWhen(ev.ends_at)}` : ''}
                          </small>
                        </span>
                        <a
                          className="web-event-link"
                          href="/eventos"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Ver
                        </a>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="web-alerts-section" aria-label="Alertas cercanas">
                <div className="web-section-label web-section-label-alerts">
                  <span>Alertas cercanas</span>
                </div>
                <ul className="web-alerts-list">
                  {sortedAlerts.length === 0 && status === 'ready' && (
                    <li className="web-alerts-empty">No hay alertas cercanas (1.5 km)</li>
                  )}
                  {sortedAlerts.map((inc, idx) => {
                    const meta = CATEGORY[inc.type];
                    const active = selected?.id === inc.id;
                    const canValidate = inc.type === 'robo' || inc.type === 'accidente';
                    const validations = Math.min(inc.likes_count, INCIDENT_VALIDATION_TARGET);
                    return (
                      <li key={inc.id}>
                        <button
                          type="button"
                          className={`web-alert-item web-alert-item-${inc.type}${active ? ' web-alert-item-active' : ''}`}
                          onClick={() => focusIncident(inc)}
                        >
                          <span className="web-alert-rank">{idx + 1}</span>
                          <span
                            className="web-alert-glyph"
                            style={{ backgroundColor: meta.bg }}
                          >
                            <IncidentTypeGlyph type={inc.type} size={26} />
                          </span>
                          <span className="web-alert-body">
                            <strong>{INCIDENT_LABELS[inc.type]}</strong>
                            <span>
                              {inc.description
                                ? inc.description.slice(0, 48) +
                                  (inc.description.length > 48 ? '…' : '')
                                : 'Sin descripción'}
                            </span>
                            <small>
                              {formatDistance(inc.distanceM)} · {timeAgo(inc.created_at)}
                              {canValidate
                                ? ` · ${validations}/${INCIDENT_VALIDATION_TARGET} validaciones`
                                : ''}
                            </small>
                          </span>
                          {canValidate && (
                            <span
                              className={`web-alert-likes${
                                validations >= INCIDENT_VALIDATION_TARGET
                                  ? ' web-alert-likes-ok'
                                  : ''
                              }`}
                            >
                              {validations}/{INCIDENT_VALIDATION_TARGET}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            </div>

            {selected && (
              <div className="web-sidebar-detail">
                <IncidentCard
                  incident={selected}
                  onClose={() => setSelected(null)}
                  onLikeChange={handleLikeChange}
                  variant="sidebar"
                />
              </div>
            )}
          </aside>
        )}

        <main className="web-map-area">
          <div ref={mapEl} className="web-map-canvas" />

          {!panelOpen && (
            <button
              type="button"
              className="web-panel-reopen"
              onClick={() => setPanelOpen(true)}
              aria-label="Mostrar alertas"
            >
              Alertas ({incidents.length})
            </button>
          )}

          {status === 'loading' && (
            <div className="web-map-overlay">
              <span className="map-spinner" />
            </div>
          )}
          {status === 'error' && (
            <div className="web-map-overlay web-map-overlay-error">{errorMsg}</div>
          )}

          {locationStatus === 'locating' && status !== 'loading' && (
            <div className="web-map-location-hint">Obteniendo tu ubicación…</div>
          )}

          {locationStatus === 'pending' && status !== 'loading' && (
            <div className="web-map-location-prompt">
              <p>Permite el acceso a tu ubicación para centrar el mapa y ordenar alertas cercanas.</p>
              <HButton onClick={handleAllowLocation} disabled={locating}>
                {locating ? 'Buscando…' : 'Permitir mi ubicación'}
              </HButton>
            </div>
          )}

          {locationStatus === 'denied' && (
            <div className="web-map-location-hint">
              Ubicación bloqueada en el navegador. Actívala en el candado de la barra de dirección o
              pulsa el botón ◎.
            </div>
          )}

          <button
            type="button"
            className="web-locate-fab"
            onClick={() => void locateMe(true)}
            disabled={locating}
            aria-label="Centrar en mi ubicación"
            title="Mi ubicación"
          >
            {locating ? '…' : '◎'}
          </button>

          <button
            type="button"
            className="web-fab"
            onClick={() => {
              setSelected(null);
              setReportOpen(true);
            }}
            aria-label="Nuevo reporte"
          >
            +
          </button>
        </main>
      </div>

      <AppToast toast={toast} onDismiss={() => setToast(null)} />

      <ReportSheet
        open={reportOpen}
        coords={coords}
        initialType={null}
        onClose={() => setReportOpen(false)}
        onCreated={(incident) => {
          setReportOpen(false);
          addIncidentToMap(incident);
          void (async () => {
            await loadIncidents();
            await loadMapEvents();
          })();
        }}
      />

      <ProfileDrawer open={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
}
