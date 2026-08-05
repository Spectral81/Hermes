'use client';

import { useEffect, useRef } from 'react';
import { loadLeaflet } from '@/lib/leaflet';

const UTEQ_CENTER: [number, number] = [20.6534, -100.4045];

type Props = {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
};

/** Mapa pequeño: clic o arrastre del pin para ubicar el evento. */
export function EventMapPicker({ lat, lng, onChange }: Props) {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!mapEl.current || mapRef.current) return;
      try {
        const L = await loadLeaflet();
        if (cancelled || !mapEl.current) return;

        const startLat = Number.isFinite(lat) ? lat : UTEQ_CENTER[0];
        const startLng = Number.isFinite(lng) ? lng : UTEQ_CENTER[1];

        const map = L.map(mapEl.current, {
          zoomControl: true,
          attributionControl: false,
        }).setView([startLat, startLng], 16);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          maxZoom: 20,
          subdomains: 'abcd',
        }).addTo(map);

        const icon = L.divIcon({
          className: '',
          html: `<div class="event-picker-pin"><img src="/markers/event-pin.png" alt="" width="40" height="40" draggable="false" /></div>`,
          iconSize: [44, 44],
          iconAnchor: [22, 40],
        });

        const marker = L.marker([startLat, startLng], { icon, draggable: true }).addTo(map);
        marker.on('dragend', () => {
          const p = marker.getLatLng();
          onChangeRef.current(Number(p.lat.toFixed(6)), Number(p.lng.toFixed(6)));
        });

        map.on('click', (e: { latlng: { lat: number; lng: number } }) => {
          marker.setLatLng(e.latlng);
          onChangeRef.current(Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6)));
        });

        mapRef.current = map;
        markerRef.current = marker;

        requestAnimationFrame(() => map.invalidateSize());
        window.setTimeout(() => map.invalidateSize(), 200);
      } catch {
        // el formulario sigue usable con lat/lng numéricos
      }
    }

    void init();
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const cur = marker.getLatLng();
    if (Math.abs(cur.lat - lat) < 1e-6 && Math.abs(cur.lng - lng) < 1e-6) return;
    marker.setLatLng([lat, lng]);
  }, [lat, lng]);

  return (
    <div className="event-map-picker">
      <div ref={mapEl} className="event-map-picker-canvas" />
      <p className="event-map-picker-hint">Toca el mapa o arrastra el pin para ubicar el evento</p>
    </div>
  );
}
