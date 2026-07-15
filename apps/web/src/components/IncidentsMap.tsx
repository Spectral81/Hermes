'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  INCIDENT_LABELS,
  INCIDENT_VALIDATION_TARGET,
  timeAgo,
  type Incident,
} from '@uteq/shared';
import type { Profile } from '@uteq/shared';
import { AppToast, type ToastMessage } from '@/components/AppToast';
import { IncidentCard } from '@/components/IncidentCard';
import { IncidentTypeGlyph } from '@/components/IncidentTypeGlyph';
import { ProfileDrawer } from '@/components/ProfileDrawer';
import { ReportSheet } from '@/components/ReportSheet';
import { HButton } from '@/components/ui/HButton';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { HermesLogoLockup } from '@/components/ui/HermesLogo';
import { filterNearbyRecentIncidents, formatDistance } from '@/lib/geo';
import {
  readStoredUserLocation,
  requestUserLocation,
  saveUserLocation,
} from '@/lib/geolocation';
import { fetchIncidents } from '@/lib/incidents';
import { createClient } from '@/lib/supabase/client';
import { CATEGORY } from '@/lib/theme';

const UTEQ_CENTER: [number, number] = [20.6534, -100.4045];
const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

interface IncidentWithDistance extends Incident {
  distanceM: number;
}

function loadLeaflet(): Promise<any> {
  return new Promise((resolve, reject) => {
    const w = window as any;
    if (w.L) return resolve(w.L);

    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = LEAFLET_CSS;
      document.head.appendChild(link);
    }

    const existing = document.querySelector(`script[src="${LEAFLET_JS}"]`) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve(w.L));
      existing.addEventListener('error', reject);
      return;
    }

    const script = document.createElement('script');
    script.src = LEAFLET_JS;
    script.async = true;
    script.onload = () => resolve(w.L);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function markerIcon(L: any, type: Incident['type'], likes: number) {
  const cat = CATEGORY[type];
  const badge =
    likes > 0
      ? `<span class="map-pin-badge">${likes > 99 ? '99+' : likes}</span>`
      : '';
  const glyph =
    type === 'robo'
      ? `<span class="map-spy-float"><img class="map-spy-icon" src="/markers/spy.png" alt="Robo" width="32" height="32" draggable="false" /></span>`
      : `<span class="map-emoji-glyph">${cat.glyph}</span>`;
  const html = `
    <div class="map-emoji-wrap${type === 'robo' ? ' map-emoji-wrap-spy' : ''}">
      <div class="map-emoji-pin" style="border-color:${cat.color}">
        ${glyph}
      </div>
      ${badge}
    </div>`;
  return L.divIcon({
    html,
    className: '',
    iconSize: [52, 52],
    iconAnchor: [26, 26],
  });
}

async function resolveLocation(): Promise<{ lat: number; lng: number }> {
  const stored = readStoredUserLocation();
  if (stored) return stored;

  const live = await requestUserLocation();
  if (live) {
    saveUserLocation(live);
    return live;
  }

  return { lat: UTEQ_CENTER[0], lng: UTEQ_CENTER[1] };
}

export function IncidentsMap() {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const layerRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const LRef = useRef<any>(null);

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selected, setSelected] = useState<Incident | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState<'pending' | 'ready' | 'denied'>('pending');
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const sortedAlerts = useMemo((): IncidentWithDistance[] => {
    return filterNearbyRecentIncidents(incidents, coords);
  }, [incidents, coords]);

  const renderMarkers = useCallback((L: any, list: Incident[]) => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.clearLayers();
    for (const inc of list) {
      if (!Number.isFinite(inc.lat) || !Number.isFinite(inc.lng)) continue;
      const marker = L.marker([inc.lat, inc.lng], {
        icon: markerIcon(L, inc.type, inc.likes_count),
      });
      marker.on('click', () => setSelected(inc));
      marker.addTo(layer);
    }
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

  useEffect(() => {
    if (LRef.current) renderMarkers(LRef.current, sortedAlerts);
  }, [sortedAlerts, renderMarkers]);

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

  async function handleAllowLocation() {
    const location = await requestUserLocation();
    if (location) {
      applyUserLocation(location);
      return;
    }
    setLocationStatus('denied');
  }

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const L = await loadLeaflet();
        if (cancelled || !mapEl.current || mapRef.current) return;
        LRef.current = L;

        const location = await resolveLocation();
        if (!cancelled) {
          setCoords(location);
          const usedStored = Boolean(readStoredUserLocation());
          const isCampus =
            Math.abs(location.lat - UTEQ_CENTER[0]) < 0.0001 &&
            Math.abs(location.lng - UTEQ_CENTER[1]) < 0.0001;
          setLocationStatus(usedStored || !isCampus ? 'ready' : 'pending');
        }

        const map = L.map(mapEl.current).setView([location.lat, location.lng], 16);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap',
        }).addTo(map);

        mapRef.current = map;
        layerRef.current = L.layerGroup().addTo(map);

        userMarkerRef.current = L.circleMarker([location.lat, location.lng], {
          radius: 9,
          color: '#3B82F6',
          fillColor: '#3B82F6',
          fillOpacity: 0.9,
          weight: 3,
        }).addTo(map);

        map.on('click', () => setSelected(null));

        await loadIncidents();
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
      }
    };
  }, [loadIncidents]);

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
          <a className="web-header-link" href="/eventos">
            Eventos
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
                <h2>Alertas cercanas</h2>
                <p>
                  {sortedAlerts.length} cercanas · más recientes · validación visible
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
                      className={`web-alert-item${active ? ' web-alert-item-active' : ''}`}
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
                            ? inc.description.slice(0, 48) + (inc.description.length > 48 ? '…' : '')
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
                            validations >= INCIDENT_VALIDATION_TARGET ? ' web-alert-likes-ok' : ''
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

          {locationStatus === 'pending' && status !== 'loading' && (
            <div className="web-map-location-prompt">
              <p>Permite el acceso a tu ubicación para centrar el mapa y ordenar alertas cercanas.</p>
              <HButton onClick={handleAllowLocation}>Permitir mi ubicación</HButton>
            </div>
          )}

          {locationStatus === 'denied' && (
            <div className="web-map-location-hint">
              Ubicación no disponible. Mostrando campus UTEQ.
            </div>
          )}

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
          loadIncidents();
        }}
      />

      <ProfileDrawer open={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
}
