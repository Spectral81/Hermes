import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import type { Incident } from '@uteq/shared';
import { IncidentCard } from '@/components/IncidentCard';
import { IncidentMarker } from '@/components/IncidentMarker';
import { ReportSheet } from '@/components/ReportSheet';
import { fetchIncidents } from '@/lib/incidents';

// Centro del campus UTEQ (fallback si no hay GPS)
const CAMPUS_REGION: Region = {
  latitude: 20.6534,
  longitude: -100.4045,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

export default function HomeScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selected, setSelected] = useState<Incident | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [reportVisible, setReportVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadIncidents = useCallback(async () => {
    try {
      const data = await fetchIncidents();
      setIncidents(data);
    } catch {
      // silencioso
    }
  }, []);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        try {
          const pos = await Location.getCurrentPositionAsync({});
          const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCoords(c);
          mapRef.current?.animateToRegion({
            latitude: c.lat,
            longitude: c.lng,
            latitudeDelta: 0.008,
            longitudeDelta: 0.008,
          });
        } catch {
          setCoords({ lat: CAMPUS_REGION.latitude, lng: CAMPUS_REGION.longitude });
        }
      } else {
        setCoords({ lat: CAMPUS_REGION.latitude, lng: CAMPUS_REGION.longitude });
      }
      await loadIncidents();
      setLoading(false);
    })();
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
    try {
      const pos = await Location.getCurrentPositionAsync({});
      const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setCoords(c);
      mapRef.current?.animateToRegion({
        latitude: c.lat,
        longitude: c.lng,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008,
      });
    } catch {
      // ignore
    }
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_GOOGLE}
        initialRegion={CAMPUS_REGION}
        showsUserLocation
        showsMyLocationButton={false}
        onPress={() => setSelected(null)}
      >
        {incidents.map((incident) => (
          <Marker
            key={incident.id}
            coordinate={{ latitude: incident.lat, longitude: incident.lng }}
            onPress={() => setSelected(incident)}
            tracksViewChanges={false}
            anchor={{ x: 0.5, y: 1 }}
          >
            <IncidentMarker type={incident.type} likes={incident.likes_count} />
          </Marker>
        ))}
      </MapView>

      {/* Barra superior */}
      <View style={styles.topBar} pointerEvents="box-none">
        <View style={styles.badge}>
          <MaterialCommunityIcons name="shield-check" size={18} color="#2563eb" />
          <Text style={styles.badgeText}>UTEQ Seguridad</Text>
        </View>
        <Pressable style={styles.iconBtn} onPress={() => router.push('/(app)/profile')}>
          <MaterialCommunityIcons name="account" size={24} color="#111827" />
        </Pressable>
      </View>

      {loading && (
        <View style={styles.loadingPill}>
          <ActivityIndicator color="#2563eb" />
        </View>
      )}

      {/* Botón recentrar */}
      <Pressable style={styles.recenterBtn} onPress={recenter}>
        <MaterialCommunityIcons name="crosshairs-gps" size={24} color="#2563eb" />
      </Pressable>

      {/* FAB reportar */}
      {!selected && (
        <Pressable style={styles.fab} onPress={() => setReportVisible(true)}>
          <MaterialCommunityIcons name="plus" size={28} color="#fff" />
          <Text style={styles.fabText}>Reportar</Text>
        </Pressable>
      )}

      {selected && (
        <IncidentCard
          incident={selected}
          onClose={() => setSelected(null)}
          onLikeChange={handleLikeChange}
        />
      )}

      <ReportSheet
        visible={reportVisible}
        coords={coords}
        onClose={() => setReportVisible(false)}
        onCreated={() => {
          setReportVisible(false);
          loadIncidents();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1419' },
  topBar: {
    position: 'absolute',
    top: 50,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  badgeText: { fontWeight: '700', color: '#111827' },
  iconBtn: {
    backgroundColor: '#fff',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  loadingPill: {
    position: 'absolute',
    top: 110,
    alignSelf: 'center',
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 999,
    elevation: 4,
  },
  recenterBtn: {
    position: 'absolute',
    right: 16,
    bottom: 110,
    backgroundColor: '#fff',
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  fab: {
    position: 'absolute',
    bottom: 32,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 999,
    shadowColor: '#2563eb',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  fabText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
