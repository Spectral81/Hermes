import { useEffect, useState } from 'react';
import { Pressable } from 'react-native';
import type MapView from 'react-native-maps';
import type { Incident } from '@uteq/shared';
import { IncidentMarker, MARKER_LAYOUT } from '@/components/IncidentMarker';

interface Props {
  incident: Incident;
  mapRef: React.RefObject<MapView | null>;
  mapReady: boolean;
  refreshKey: number;
  onPress: () => void;
}

export function MapMarkerOverlay({
  incident,
  mapRef,
  mapReady,
  refreshKey,
  onPress,
}: Props) {
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!mapReady) return;

    let alive = true;

    (async () => {
      const map = mapRef.current;
      if (!map) return;

      for (let attempt = 0; attempt < 6; attempt += 1) {
        if (!alive) return;
        try {
          const p = await map.pointForCoordinate({
            latitude: incident.lat,
            longitude: incident.lng,
          });
          if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) {
            setPoint({ x: p.x, y: p.y });
            return;
          }
        } catch {
          // reintentar
        }
        await new Promise((r) => setTimeout(r, 120));
      }
    })();

    return () => {
      alive = false;
    };
  }, [mapReady, mapRef, incident.lat, incident.lng, incident.id, refreshKey]);

  if (!point) return null;

  return (
    <Pressable
      onPress={onPress}
      style={{
        position: 'absolute',
        left: point.x - MARKER_LAYOUT.width / 2,
        top: point.y - MARKER_LAYOUT.height,
        width: MARKER_LAYOUT.width,
        height: MARKER_LAYOUT.height,
        alignItems: 'center',
        justifyContent: 'flex-end',
      }}
    >
      <IncidentMarker type={incident.type} likes={incident.likes_count} />
    </Pressable>
  );
}
