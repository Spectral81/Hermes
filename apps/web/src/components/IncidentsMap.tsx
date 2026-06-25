'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Incident, IncidentType } from '@uteq/shared';
import { IncidentCard } from '@/components/IncidentCard';
import { ReportSheet } from '@/components/ReportSheet';
import { HAvatar } from '@/components/ui/HAvatar';
import { GpsIcon, RefreshIcon, ShieldIcon } from '@/components/ui/icons';
import { fetchIncidents } from '@/lib/incidents';
import { CATEGORY } from '@/lib/theme';

const UTEQ_CENTER: [number, number] = [20.6534, -100.4045];
const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

type FilterKey = 'all' | IncidentType;

const FILTERS: { key: FilterKey; label: string; color?: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'robo', label: 'Robos', color: CATEGORY.robo.color },
  { key: 'accidente', label: 'Accidentes', color: CATEGORY.accidente.color },
  { key: 'infraestructura', label: 'Fallas', color: CATEGORY.infraestructura.color },
  { key: 'panico', label: 'SOS', color: CATEGORY.panico.color },
];

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

function markerIcon(L: any, type: IncidentType, likes: number) {
  const cat = CATEGORY[type];
  const badge =
    likes > 0
      ? `<span class="map-pin-badge">${likes > 99 ? '99+' : likes}</span>`
      : '';
  const html = `
    <div class="map-pin-wrap">
      <svg width="40" height="50" viewBox="0 0 32 40" aria-hidden="true">
        <path d="M16 0 C7 0 0 7 0 16 C0 26 16 40 16 40 C16 40 32 26 32 16 C32 7 25 0 16 0 Z" fill="${cat.color}"/>
        <circle cx="16" cy="14" r="9" fill="#fff"/>
        <text x="16" y="18.5" text-anchor="middle" fill="${cat.color}" font-weight="800" font-size="13">${cat.glyph}</text>
      </svg>
      ${badge}
    </div>`;
  return L.divIcon({
    html,
    className: '',
    iconSize: [60, 70],
    iconAnchor: [30, 70],
  });
}

async function resolveLocation(): Promise<{ lat: number; lng: number }> {
  const fallback = { lat: UTEQ_CENTER[0], lng: UTEQ_CENTER[1] };
  if (!navigator.geolocation) return fallback;

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(fallback),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    );
  });
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
  const [reportType, setReportType] = useState<IncidentType | null>(null);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  const visibleIncidents = useMemo(
    () => (filter === 'all' ? incidents : incidents.filter((i) => i.type === filter)),
    [incidents, filter],
  );

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
      if (LRef.current) renderMarkers(LRef.current, filter === 'all' ? data : data.filter((i) => i.type === filter));
      setStatus('ready');
    } catch (e) {
      setStatus('error');
      setErrorMsg(e instanceof Error ? e.message : 'No se pudieron cargar los reportes.');
    }
  }, [filter, renderMarkers]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const L = await loadLeaflet();
        if (cancelled || !mapEl.current || mapRef.current) return;
        LRef.current = L;

        const location = await resolveLocation();
        if (!cancelled) setCoords(location);

        const map = L.map(mapEl.current).setView([location.lat, location.lng], 16);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap',
        }).addTo(map);

        mapRef.current = map;
        layerRef.current = L.layerGroup().addTo(map);

        userMarkerRef.current = L.circleMarker([location.lat, location.lng], {
          radius: 8,
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

  useEffect(() => {
    if (LRef.current) renderMarkers(LRef.current, visibleIncidents);
  }, [visibleIncidents, renderMarkers]);

  function handleLikeChange(id: string, likes: number, liked: boolean) {
    setIncidents((prev) =>
      prev.map((i) => (i.id === id ? { ...i, likes_count: likes, liked_by_me: liked } : i)),
    );
    setSelected((prev) =>
      prev && prev.id === id ? { ...prev, likes_count: likes, liked_by_me: liked } : prev,
    );
  }

  function addIncidentToMap(incident: Incident) {
    setIncidents((prev) => {
      if (prev.some((i) => i.id === incident.id)) return prev;
      return [incident, ...prev];
    });
    mapRef.current?.setView([incident.lat, incident.lng], 17);
    setSelected(incident);
  }

  async function recenter() {
    const location = await resolveLocation();
    setCoords(location);
    mapRef.current?.setView([location.lat, location.lng], 16);
    userMarkerRef.current?.setLatLng([location.lat, location.lng]);
  }

  function openReport(type: IncidentType | null) {
    setSelected(null);
    setReportType(type);
    setReportOpen(true);
  }

  return (
    <div className="map-screen">
      <div ref={mapEl} className="map-canvas-full" />

      <div className="map-top-bar">
        <div className="map-header-pill">
          <span className="map-header-shield"><ShieldIcon /></span>
          <div className="map-header-center">
            <span className="map-header-eyebrow">UTEQ CAMPUS</span>
            <span className="map-header-title">
              {incidents.length > 0 ? `${incidents.length} alertas activas` : 'Sin alertas cerca'}
            </span>
          </div>
          <div className="map-live-badge">
            <span className="map-live-dot" />
            <span>EN VIVO</span>
          </div>
        </div>
        <Link href="/perfil" className="map-avatar-link" aria-label="Perfil">
          <HAvatar name="UTEQ" size={48} />
        </Link>
      </div>

      <div className="map-chips-wrap">
        <div className="map-chips-row">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            const count =
              f.key === 'all' ? incidents.length : incidents.filter((i) => i.type === f.key).length;
            return (
              <button
                key={f.key}
                type="button"
                className={`map-chip${active ? ' map-chip-active' : ''}`}
                onClick={() => setFilter(f.key)}
              >
                {f.color && <span className="map-chip-dot" style={{ backgroundColor: f.color }} />}
                {f.label}
                {f.key === 'all' ? ` · ${count}` : count > 0 ? ` ${count}` : ''}
              </button>
            );
          })}
        </div>
      </div>

      <div className="map-fab-stack">
        <button type="button" className="map-mini-fab" onClick={recenter} aria-label="Centrar ubicación">
          <GpsIcon />
        </button>
        <button type="button" className="map-mini-fab" onClick={loadIncidents} aria-label="Actualizar">
          <RefreshIcon />
        </button>
      </div>

      {status === 'loading' && (
        <div className="map-loading-pill map-loading-spinner" aria-live="polite">
          <span className="map-spinner" />
        </div>
      )}
      {status === 'error' && (
        <div className="map-loading-pill map-badge-error">{errorMsg}</div>
      )}

      {selected ? (
        <IncidentCard
          incident={selected}
          onClose={() => setSelected(null)}
          onLikeChange={handleLikeChange}
        />
      ) : (
        <div className="map-bottom-bar">
          <button type="button" className="map-sos-btn" onClick={() => openReport('panico')}>
            <span className="map-sos-dot" />
            EMERGENCIA SOS
          </button>
          <button type="button" className="map-report-fab" onClick={() => openReport(null)} aria-label="Nuevo reporte">
            +
          </button>
        </div>
      )}

      <ReportSheet
        open={reportOpen}
        coords={coords}
        initialType={reportType}
        onClose={() => setReportOpen(false)}
        onCreated={(incident) => {
          setReportOpen(false);
          addIncidentToMap(incident);
          loadIncidents();
        }}
      />
    </div>
  );
}
