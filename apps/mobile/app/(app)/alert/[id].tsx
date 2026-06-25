import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Circle, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  INCIDENT_LABELS,
  INFRA_CATEGORY_LABELS,
  SEVERITY_LABELS,
  timeAgo,
  type Incident,
} from '@uteq/shared';
import { HAvatar, HStatusBadge } from '@/components/ui';
import { fetchIncidents, toggleLike } from '@/lib/incidents';
import { incidentStatusKind } from '@/lib/geo';
import { USE_GOOGLE_MAPS } from '@/lib/markerAssets';
import { CATEGORY, HERMES, SHADOW } from '@/lib/theme';

export default function AlertDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const all = await fetchIncidents();
      const found = all.find((i) => i.id === id) ?? null;
      setIncident(found);
    } catch {
      setIncident(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleLike() {
    if (!incident || busy) return;
    setBusy(true);
    try {
      const res = await toggleLike(incident.id);
      setIncident((prev) =>
        prev ? { ...prev, likes_count: res.likes_count, liked_by_me: res.liked } : prev,
      );
    } catch {
      // ignore
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={HERMES.blue} />
      </View>
    );
  }

  if (!incident) {
    return (
      <View style={[styles.center, { padding: 24 }]}>
        <Text style={styles.missing}>No se encontró el reporte.</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backLink}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  const meta = CATEGORY[incident.type];
  const statusKind = incidentStatusKind(incident.status, incident.likes_count);
  const subtitle = [
    incident.category ? INFRA_CATEGORY_LABELS[incident.category] : null,
    incident.severity ? SEVERITY_LABELS[incident.severity] : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={styles.container}>
      <View style={[styles.nav, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.navBtn} onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={HERMES.gray900} />
        </Pressable>
        <Text style={styles.navTitle}>Detalle</Text>
        <View style={styles.navBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { backgroundColor: meta.color }]}>
          <View style={styles.heroTop}>
            <Text style={styles.heroType}>
              {INCIDENT_LABELS[incident.type].toUpperCase()}
              {subtitle ? ` · ${subtitle.toUpperCase()}` : ''}
            </Text>
            <HStatusBadge kind={statusKind} />
          </View>
          <Text style={styles.heroQuote}>
            "{incident.description || 'Sin descripción'}"
          </Text>
          <Text style={styles.heroMeta}>
            {timeAgo(incident.created_at)} · Campus UTEQ
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>REPORTADO POR</Text>
          <View style={styles.personCard}>
            <HAvatar name={incident.author_nombre} size={44} />
            <View style={{ flex: 1 }}>
              <Text style={styles.personName}>{incident.author_nombre ?? 'Anónimo'}</Text>
              <Text style={styles.personRole}>Estudiante</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            VALIDACIONES · {incident.likes_count}
          </Text>
          <View style={styles.validCard}>
            <Pressable
              style={[styles.likeBtn, incident.liked_by_me && styles.likeBtnActive]}
              onPress={handleLike}
              disabled={busy}
            >
              <MaterialCommunityIcons
                name={incident.liked_by_me ? 'thumb-up' : 'thumb-up-outline'}
                size={20}
                color={incident.liked_by_me ? '#fff' : HERMES.blue}
              />
              <Text style={[styles.likeText, incident.liked_by_me && styles.likeTextActive]}>
                {incident.liked_by_me ? 'Confirmaste este reporte' : 'Confirmar reporte'}
              </Text>
            </Pressable>
            {incident.likes_count > 0 && (
              <Text style={styles.validHint}>
                {incident.likes_count} persona{incident.likes_count === 1 ? '' : 's'} confirmaron este incidente.
              </Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>UBICACIÓN</Text>
          <View style={styles.mapCard}>
            <MapView
              style={styles.map}
              provider={USE_GOOGLE_MAPS ? PROVIDER_GOOGLE : undefined}
              scrollEnabled={false}
              zoomEnabled={false}
              rotateEnabled={false}
              pitchEnabled={false}
              initialRegion={{
                latitude: incident.lat,
                longitude: incident.lng,
                latitudeDelta: 0.004,
                longitudeDelta: 0.004,
              }}
            >
              <Circle
                center={{ latitude: incident.lat, longitude: incident.lng }}
                radius={80}
                strokeColor="rgba(59,130,246,0.5)"
                fillColor="rgba(59,130,246,0.12)"
              />
              <Marker coordinate={{ latitude: incident.lat, longitude: incident.lng }} />
            </MapView>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: HERMES.gray50 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: HERMES.gray50 },
  missing: { fontSize: 16, color: HERMES.gray600, marginBottom: 12 },
  backLink: { color: HERMES.blue, fontWeight: '700' },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: HERMES.gray200,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: HERMES.gray100,
  },
  navTitle: { fontSize: 17, fontWeight: '800', color: HERMES.gray900 },
  scroll: { paddingBottom: 32 },
  hero: {
    margin: 16,
    borderRadius: 18,
    padding: 20,
    gap: 12,
    ...SHADOW.float,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  heroType: { flex: 1, color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
  heroQuote: { color: '#fff', fontSize: 20, fontWeight: '800', lineHeight: 28 },
  heroMeta: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '600' },
  section: { paddingHorizontal: 16, marginBottom: 16 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: HERMES.gray400,
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  personCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    ...SHADOW.card,
  },
  personName: { fontSize: 16, fontWeight: '800', color: HERMES.gray900 },
  personRole: { fontSize: 13, color: HERMES.gray500, marginTop: 2 },
  validCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    gap: 10,
    ...SHADOW.card,
  },
  likeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    borderColor: HERMES.blue,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  likeBtnActive: { backgroundColor: HERMES.blue },
  likeText: { color: HERMES.blue, fontWeight: '800', fontSize: 14 },
  likeTextActive: { color: '#fff' },
  validHint: { fontSize: 13, color: HERMES.gray600, lineHeight: 18 },
  mapCard: {
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: HERMES.gray200,
    ...SHADOW.card,
  },
  map: { flex: 1 },
});
