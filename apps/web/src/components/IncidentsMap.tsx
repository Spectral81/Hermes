'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { GoogleMap, MarkerF, useJsApiLoader } from '@react-google-maps/api';
import type { Incident, IncidentType } from '@uteq/shared';
import { IncidentCard } from '@/components/IncidentCard';
import { ReportSheet } from '@/components/ReportSheet';
import { HAvatar } from '@/components/ui/HAvatar';
import { HButton } from '@/components/ui/HButton';
import { GpsIcon, RefreshIcon } from '@/components/ui/icons';
import { HermesLogoLockup } from '@/components/ui/HermesLogo';
import { fetchIncidents } from '@/lib/incidents';
import { CATEGORY } from '@/lib/theme';

const UTEQ_CENTER = { lat: 20.6534, lng: -100.4045 };
const MAP_STYLE = { width: '100%', height: '100%' };

type FilterKey = 'all' | IncidentType;

const FILTERS: { key: FilterKey; label: string; color?: string; glyph?: string }[] = [
  { key: 'all', label: 'Todos los reportes', glyph: '◎' },
  { key: 'robo', label: 'Robos', color: CATEGORY.robo.color, glyph: CATEGORY.robo.glyph },
  { key: 'accidente', label: 'Accidentes', color: CATEGORY.accidente.color, glyph: CATEGORY.accidente.glyph },
  { key: 'infraestructura', label: 'Fallas', color: CATEGORY.infraestructura.color, glyph: CATEGORY.infraestructura.glyph },
  { key: 'panico', label: 'SOS', color: CATEGORY.panico.color, glyph: CATEGORY.panico.glyph },
];

function markerSvg(type: IncidentType): string {
  const cat = CATEGORY[type];
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="50" viewBox="0 0 32 40">
      <path d="M16 0 C7 0 0 7 0 16 C0 26 16 40 16 40 C16 40 32 26 32 16 C32 7 25 0 16 0 Z" fill="${cat.color}"/>
      <circle cx="16" cy="14" r="9" fill="#fff"/>
      <text x="16" y="18.5" text-anchor="middle" fill="${cat.color}" font-weight="800" font-size="13">${cat.glyph}</text>
    </svg>
  `)}`;
}

async function resolveLocation(): Promise<{ lat: number; lng: number }> {
  const fallback = UTEQ_CENTER;
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
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? '';
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
  });

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selected, setSelected] = useState<Incident | null>(null);
  const [coords, setCoords] = useState(UTEQ_CENTER);
  const [mapCenter, setMapCenter] = useState(UTEQ_CENTER);
  const [reportOpen, setReportOpen] = useState(false);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  const visibleIncidents = useMemo(
    () => (filter === 'all' ? incidents : incidents.filter((i) => i.type === filter)),
    [incidents, filter],
  );

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
    resolveLocation().then((loc) => {
      setCoords(loc);
      setMapCenter(loc);
    });
    loadIncidents();
  }, [loadIncidents]);

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
    setMapCenter({ lat: incident.lat, lng: incident.lng });
    setSelected(incident);
  }

  async function recenter() {
    const location = await resolveLocation();
    setCoords(location);
    setMapCenter(location);
  }

  const filterCounts = useMemo(() => {
    const counts: Record<FilterKey, number> = {
      all: incidents.length,
      robo: 0,
      accidente: 0,
      infraestructura: 0,
      panico: 0,
    };
    for (const i of incidents) counts[i.type]++;
    return counts;
  }, [incidents]);

  return (
    <div className="web-app">
      <header className="web-app-header">
        <HermesLogoLockup size={28} />
        <nav className="web-app-nav">
          <Link href="/mapa" className="web-app-nav-active">Mapa</Link>
          <Link href="/">Acerca de</Link>
          <Link href="/perfil">Perfil</Link>
        </nav>
        <Link href="/perfil" className="web-app-profile" aria-label="Mi perfil">
          <HAvatar name="UTEQ" size={36} />
        </Link>
      </header>

      <div className="web-app-body">
        <aside className="web-sidebar">
          <div className="web-sidebar-head">
            <h2>Reportes del campus</h2>
            <p>{incidents.length} alertas activas</p>
          </div>

          <p className="web-sidebar-label">FILTRAR POR TIPO</p>
          <ul className="web-filter-list">
            {FILTERS.map((f) => {
              const active = filter === f.key;
              const count = filterCounts[f.key];
              return (
                <li key={f.key}>
                  <button
                    type="button"
                    className={`web-filter-item${active ? ' web-filter-item-active' : ''}`}
                    onClick={() => setFilter(f.key)}
                  >
                    <span
                      className="web-filter-glyph"
                      style={f.color ? { backgroundColor: `${f.color}18`, color: f.color } : undefined}
                    >
                      {f.glyph}
                    </span>
                    <span className="web-filter-text">
                      <strong>{f.label}</strong>
                      <small>{count} reporte{count !== 1 ? 's' : ''}</small>
                    </span>
                    {f.color && <span className="web-filter-dot" style={{ backgroundColor: f.color }} />}
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="web-sidebar-actions">
            <HButton full onClick={() => { setSelected(null); setReportOpen(true); }}>
              + Nuevo reporte
            </HButton>
            <div className="web-sidebar-tools">
              <button type="button" className="web-tool-btn" onClick={recenter} aria-label="Centrar ubicación">
                <GpsIcon /> Mi ubicación
              </button>
              <button type="button" className="web-tool-btn" onClick={loadIncidents} aria-label="Actualizar">
                <RefreshIcon /> Actualizar
              </button>
            </div>
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

        <main className="web-map-area">
          {!apiKey && (
            <div className="web-map-fallback">
              <p>Configura <code>NEXT_PUBLIC_GOOGLE_MAPS_KEY</code> en Railway para ver Google Maps.</p>
            </div>
          )}
          {apiKey && loadError && (
            <div className="web-map-fallback">
              <p>No se pudo cargar Google Maps. Verifica la API key.</p>
            </div>
          )}
          {apiKey && isLoaded && (
            <GoogleMap
              mapContainerStyle={MAP_STYLE}
              center={mapCenter}
              zoom={16}
              onClick={() => setSelected(null)}
              options={{
                disableDefaultUI: false,
                zoomControl: true,
                streetViewControl: false,
                mapTypeControl: false,
                fullscreenControl: true,
              }}
            >
              <MarkerF
                position={coords}
                icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 9,
                  fillColor: '#3B82F6',
                  fillOpacity: 1,
                  strokeColor: '#fff',
                  strokeWeight: 3,
                }}
                title="Tu ubicación"
              />
              {visibleIncidents.map((inc) => (
                <MarkerF
                  key={inc.id}
                  position={{ lat: inc.lat, lng: inc.lng }}
                  icon={{
                    url: markerSvg(inc.type),
                    scaledSize: new google.maps.Size(40, 50),
                    anchor: new google.maps.Point(20, 50),
                  }}
                  onClick={() => setSelected(inc)}
                />
              ))}
            </GoogleMap>
          )}
          {status === 'loading' && (
            <div className="web-map-overlay">
              <span className="map-spinner" />
            </div>
          )}
          {status === 'error' && (
            <div className="web-map-overlay web-map-overlay-error">{errorMsg}</div>
          )}
        </main>
      </div>

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
    </div>
  );
}
