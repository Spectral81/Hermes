import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { INCIDENT_LABELS, timeAgo, type Incident, type IncidentType } from '@uteq/shared';
import { HStatusBadge } from '@/components/ui';
import { fetchIncidents } from '@/lib/incidents';
import { distanceMeters, formatDistance, incidentStatusKind } from '@/lib/geo';
import { CATEGORY, HERMES, SHADOW } from '@/lib/theme';

type FilterKey = 'all' | IncidentType;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'robo', label: 'Robos' },
  { key: 'accidente', label: 'Accidentes' },
  { key: 'infraestructura', label: 'Fallas' },
];

export default function AlertsListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchIncidents();
      setIncidents(data);
    } catch {
      // silencioso
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        }
      } catch {
        // sin GPS
      }
      await load();
      setLoading(false);
    })();
  }, [load]);

  const sorted = useMemo(() => {
    const list = filter === 'all' ? incidents : incidents.filter((i) => i.type === filter);
    if (!coords) return list;
    return [...list].sort(
      (a, b) =>
        distanceMeters(coords.lat, coords.lng, a.lat, a.lng) -
        distanceMeters(coords.lat, coords.lng, b.lat, b.lng),
    );
  }, [incidents, filter, coords]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Alertas</Text>
          <Text style={styles.subtitle}>
            Últimas 24 h · Campus UTEQ · {incidents.length} activas
          </Text>
        </View>
        <Pressable style={styles.filterBtn} onPress={onRefresh}>
          <MaterialCommunityIcons name="refresh" size={20} color={HERMES.gray700} />
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersRow}
      >
        {FILTERS.map((f) => {
          const active = filter === f.key;
          const count =
            f.key === 'all' ? incidents.length : incidents.filter((i) => i.type === f.key).length;
          return (
            <Pressable
              key={f.key}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                {f.label} · {count}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={HERMES.blue} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: 24 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {sorted.length === 0 && (
            <Text style={styles.empty}>No hay alertas activas en el campus.</Text>
          )}
          {sorted.map((incident) => {
            const meta = CATEGORY[incident.type];
            const statusKind = incidentStatusKind(incident.status, incident.likes_count);
            const dist = coords
              ? formatDistance(distanceMeters(coords.lat, coords.lng, incident.lat, incident.lng))
              : null;

            return (
              <Pressable
                key={incident.id}
                style={styles.card}
                onPress={() => router.push(`/(app)/alert/${incident.id}`)}
                onLongPress={() => router.push(`/(app)/validate/${incident.id}`)}
              >
                <View style={[styles.accent, { backgroundColor: meta.color }]} />
                <View style={[styles.glyph, { backgroundColor: meta.bg }]}>
                  <Text style={[styles.glyphText, { color: meta.color }]}>{meta.glyph}</Text>
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {INCIDENT_LABELS[incident.type]}
                    {incident.description ? ` · ${incident.description}` : ''}
                  </Text>
                  <View style={styles.cardMeta}>
                    <HStatusBadge kind={statusKind} />
                    <Text style={styles.cardTime}>
                      {timeAgo(incident.created_at)}
                      {dist ? ` · ${dist}` : ''}
                    </Text>
                  </View>
                  {incident.likes_count > 0 && (
                    <Text style={styles.validations}>✓ {incident.likes_count} validaciones</Text>
                  )}
                </View>
                <MaterialCommunityIcons name="chevron-right" size={22} color={HERMES.gray300} />
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: HERMES.gray50 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: { fontSize: 28, fontWeight: '800', color: HERMES.gray900, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: HERMES.gray500, marginTop: 4 },
  filterBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.card,
  },
  filtersRow: { paddingHorizontal: 20, gap: 8, paddingBottom: 12 },
  filterChip: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: HERMES.gray200,
  },
  filterChipActive: { backgroundColor: HERMES.gray900, borderColor: HERMES.gray900 },
  filterChipText: { fontSize: 12, fontWeight: '700', color: HERMES.gray700 },
  filterChipTextActive: { color: '#fff' },
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 10 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { textAlign: 'center', color: HERMES.gray400, marginTop: 40, fontSize: 14 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    overflow: 'hidden',
    ...SHADOW.card,
  },
  accent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  glyph: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyphText: { fontSize: 18, fontWeight: '800' },
  cardBody: { flex: 1, minWidth: 0, gap: 6 },
  cardTitle: { fontSize: 14, fontWeight: '800', color: HERMES.gray900 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  cardTime: { fontSize: 12, color: HERMES.gray500 },
  validations: { fontSize: 12, color: HERMES.green, fontWeight: '700' },
});
