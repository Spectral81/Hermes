import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import type { Incident, IncidentType } from '@uteq/shared';
import { IncidentCard } from '@/components/IncidentCard';
import { MapMarkerOverlay } from '@/components/MapMarkerOverlay';
import { ReportSheet } from '@/components/ReportSheet';
import { fetchIncidents } from '@/lib/incidents';
import { USE_GOOGLE_MAPS } from '@/lib/markerAssets';
import { CATEGORY, HERMES, SHADOW } from '@/lib/theme';
import { HAvatar } from '@/components/ui';

const CAMPUS_REGION: Region = {
  latitude: 20.6534,
  longitude: -100.4045,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

type FilterKey = 'all' | IncidentType;

const FILTERS: { key: FilterKey; label: string; color?: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'robo', label: 'Robos', color: CATEGORY.robo.color },
  { key: 'accidente', label: 'Accidentes', color: CATEGORY.accidente.color },
  { key: 'infraestructura', label: 'Fallas', color: CATEGORY.infraestructura.color },
];

async function resolveLocation(): Promise<{ lat: number; lng: number }> {
  const fallback = { lat: CAMPUS_REGION.latitude, lng: CAMPUS_REGION.longitude };

  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return fallback;

    const last = await Location.getLastKnownPositionAsync();
    if (last) {
      return { lat: last.coords.latitude, lng: last.coords.longitude };
    }

    const pos = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('GPS timeout')), 5000),
      ),
    ]);
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    return fallback;
  }
}

export default function HomeScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selected, setSelected] = useState<Incident | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [reportVisible, setReportVisible] = useState(false);
  const [reportType, setReportType] = useState<IncidentType | null>(null);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [regionTick, setRegionTick] = useState(0);

  const loadIncidents = useCallback(async () => {
    try {
      const data = await fetchIncidents();
      setIncidents(data);
      setRegionTick((t) => t + 1);
    } catch {
      // silencioso
    }
  }, []);

  const visibleIncidents = useMemo(
    () => (filter === 'all' ? incidents : incidents.filter((i) => i.type === filter)),
    [incidents, filter],
  );

  function addIncidentToMap(incident: Incident) {
    setIncidents((prev) => {
      if (prev.some((i) => i.id === incident.id)) return prev;
      return [incident, ...prev];
    });
    setRegionTick((t) => t + 1);
    mapRef.current?.animateToRegion({
      latitude: incident.lat,
      longitude: incident.lng,
      latitudeDelta: 0.004,
      longitudeDelta: 0.004,
    });
    setSelected(incident);
  }

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const location = await resolveLocation();
      if (!cancelled) {
        setCoords(location);
        mapRef.current?.animateToRegion({
          latitude: location.lat,
          longitude: location.lng,
          latitudeDelta: 0.008,
          longitudeDelta: 0.008,
        });
      }
      await loadIncidents();
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [loadIncidents]);

  function handleLikeChange(id: string, likes: number, liked: boolean) {
    setIncidents((prev) =>
      prev.map((i) => (i.id === id ? { ...i, likes_count: likes, liked_by_me: liked } : i)),
    );
    setSelected((prev) =>
      prev && prev.id === id ? { ...prev, likes_count: likes, liked_by_me: liked } : prev,
    );
  }

  async function recenter() {
    const location = await resolveLocation();
    setCoords(location);
    mapRef.current?.animateToRegion({
      latitude: location.lat,
      longitude: location.lng,
      latitudeDelta: 0.008,
      longitudeDelta: 0.008,
    });
  }

  function openReport(type: IncidentType | null) {
    setSelected(null);
    setReportType(type);
    setReportVisible(true);
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={USE_GOOGLE_MAPS ? PROVIDER_GOOGLE : undefined}
        initialRegion={CAMPUS_REGION}
        showsUserLocation
        showsMyLocationButton={false}
        onPress={() => setSelected(null)}
        onMapReady={() => {
          setMapReady(true);
          setRegionTick((t) => t + 1);
        }}
        onRegionChangeComplete={() => setRegionTick((t) => t + 1)}
      />

      {mapReady && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          {visibleIncidents.map((incident) => (
            <MapMarkerOverlay
              key={incident.id}
              incident={incident}
              mapRef={mapRef}
              mapReady={mapReady}
              refreshKey={regionTick}
              onPress={() => setSelected(incident)}
            />
          ))}
        </View>
      )}

      <View style={styles.topBar} pointerEvents="box-none">
        <View style={styles.headerPill}>
          <MaterialCommunityIcons name="shield-check" size={20} color={HERMES.blue} />
          <View style={styles.headerCenter}>
            <Text style={styles.headerEyebrow}>UTEQ CAMPUS</Text>
            <Text style={styles.headerTitle}>
              {incidents.length > 0 ? `${incidents.length} alertas activas` : 'Sin alertas cerca'}
            </Text>
          </View>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>EN VIVO</Text>
          </View>
        </View>
        <Pressable onPress={() => router.push('/(app)/(tabs)/profile')}>
          <HAvatar name="UTEQ" size={48} />
        </Pressable>
      </View>

      <View style={styles.chipsWrap} pointerEvents="box-none">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {FILTERS.map((f) => {
            const active = filter === f.key;
            const count =
              f.key === 'all' ? incidents.length : incidents.filter((i) => i.type === f.key).length;
            return (
              <Pressable
                key={f.key}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setFilter(f.key)}
              >
                {f.color && <View style={[styles.chipDot, { backgroundColor: f.color }]} />}
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {f.label}
                  {f.key === 'all' ? ` · ${count}` : count > 0 ? ` ${count}` : ''}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.rightStack} pointerEvents="box-none">
        <Pressable style={styles.miniFab} onPress={recenter}>
          <MaterialCommunityIcons name="crosshairs-gps" size={22} color={HERMES.gray700} />
        </Pressable>
        <Pressable style={styles.miniFab} onPress={loadIncidents}>
          <MaterialCommunityIcons name="refresh" size={22} color={HERMES.gray700} />
        </Pressable>
      </View>

      {loading && (
        <View style={styles.loadingPill}>
          <ActivityIndicator color={HERMES.blue} />
        </View>
      )}

      {selected ? (
        <IncidentCard
          incident={selected}
          onClose={() => setSelected(null)}
          onLikeChange={handleLikeChange}
        />
      ) : (
        <Pressable
          style={styles.reportFab}
          onPress={() => openReport(null)}
          accessibilityLabel="Nuevo reporte"
        >
          <MaterialCommunityIcons name="plus" size={26} color="#fff" />
        </Pressable>
      )}

      <ReportSheet
        visible={reportVisible}
        coords={coords}
        initialType={reportType}
        onClose={() => setReportVisible(false)}
        onCreated={(incident) => {
          setReportVisible(false);
          addIncidentToMap(incident);
          loadIncidents();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: HERMES.gray100 },
  topBar: {
    position: 'absolute',
    top: 52,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerPill: {
    flex: 1,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: 14,
    ...SHADOW.float,
  },
  headerCenter: { flex: 1 },
  headerEyebrow: {
    fontSize: 10,
    color: HERMES.gray500,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  headerTitle: { fontSize: 13, color: HERMES.gray900, fontWeight: '700', marginTop: -1 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: HERMES.green },
  liveText: { color: HERMES.green, fontSize: 11, fontWeight: '800' },
  chipsWrap: { position: 'absolute', top: 112, left: 0, right: 0 },
  chipsRow: { paddingHorizontal: 16, gap: 8 },
  chip: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.97)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    ...SHADOW.card,
  },
  chipActive: { backgroundColor: HERMES.gray900 },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipText: { fontSize: 12, fontWeight: '700', color: HERMES.gray700 },
  chipTextActive: { color: '#fff' },
  rightStack: { position: 'absolute', right: 16, top: 170, gap: 12 },
  miniFab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.fab,
  },
  loadingPill: {
    position: 'absolute',
    top: 160,
    alignSelf: 'center',
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 999,
    ...SHADOW.card,
  },
  reportFab: {
    position: 'absolute',
    right: 16,
    bottom: 20,
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: HERMES.blue,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: HERMES.blue,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
});
