'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { INCIDENT_COLORS, INCIDENT_EMOJI, type Incident } from '@uteq/shared';
import { IncidentCard } from '@/components/IncidentCard';
import { ReportSheet } from '@/components/ReportSheet';
import { fetchIncidents } from '@/lib/incidents';

const UTEQ_CENTER: [number, number] = [20.6534, -100.4045];
const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

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

function markerIcon(L: any, color: string, emoji: string, likes: number) {
  const badge =
    likes > 0
      ? `<span style="position:absolute;top:-6px;right:-8px;min-width:20px;height:20px;padding:0 4px;border-radius:10px;background:#111827;color:#fff;font-size:10px;font-weight:800;border:2px solid #fff;display:flex;align-items:center;justify-content:center;">${likes > 99 ? '99+' : likes}</span>`
      : '';
  const html = `
    <div style="width:64px;height:78px;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;position:relative;">
      <div style="position:relative;width:52px;height:52px;border-radius:50%;background:${color};border:4px solid #fff;display:flex;align-items:center;justify-content:center;font-size:26px;line-height:1;">
        ${emoji}${badge}
      </div>
      <div style="width:0;height:0;margin-top:-1px;border-left:9px solid transparent;border-right:9px solid transparent;border-top:14px solid ${color};"></div>
    </div>`;
  return L.divIcon({
    html,
    className: '',
    iconSize: [64, 78],
    iconAnchor: [32, 78],
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
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  const renderMarkers = useCallback((L: any, list: Incident[]) => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.clearLayers();
    for (const inc of list) {
      if (!Number.isFinite(inc.lat) || !Number.isFinite(inc.lng)) continue;
      const marker = L.marker([inc.lat, inc.lng], {
        icon: markerIcon(L, INCIDENT_COLORS[inc.type], INCIDENT_EMOJI[inc.type] ?? '📍', inc.likes_count),
      });
      marker.on('click', () => setSelected(inc));
      marker.addTo(layer);
    }
  }, []);

  const loadIncidents = useCallback(async () => {
    try {
      const data = await fetchIncidents();
      setIncidents(data);
      if (LRef.current) renderMarkers(LRef.current, data);
      setStatus('ready');
    } catch (e) {
      setStatus('error');
      setErrorMsg(e instanceof Error ? e.message : 'No se pudieron cargar los reportes.');
    }
  }, [renderMarkers]);

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
          color: '#2563eb',
          fillColor: '#2563eb',
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
    if (LRef.current) renderMarkers(LRef.current, incidents);
  }, [incidents, renderMarkers]);

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

  return (
    <div className="map-screen">
      <div ref={mapEl} className="map-canvas-full" />

      <div className="map-top-bar">
        <div className="map-brand-pill">
          <span>🛡️</span>
          <span>
            UTEQ Seguridad{incidents.length > 0 ? ` · ${incidents.length} reportes` : ''}
          </span>
        </div>
        <Link href="/perfil" className="map-icon-btn" aria-label="Perfil">
          👤
        </Link>
      </div>

      {status === 'loading' && (
        <div className="map-loading-pill">Cargando mapa…</div>
      )}
      {status === 'error' && (
        <div className="map-loading-pill map-badge-error">{errorMsg}</div>
      )}

      <button type="button" className="map-recenter-btn" onClick={recenter} aria-label="Centrar ubicación">
        ⊕
      </button>

      {!selected && (
        <button type="button" className="map-fab" onClick={() => setReportOpen(true)}>
          <span>＋</span> Reportar
        </button>
      )}

      {selected && (
        <IncidentCard
          incident={selected}
          onClose={() => setSelected(null)}
          onLikeChange={handleLikeChange}
        />
      )}

      <ReportSheet
        open={reportOpen}
        coords={coords}
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
