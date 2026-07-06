import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  INCIDENT_LABELS,
  INCIDENT_VALIDATION_TARGET,
  INFRA_CATEGORY_LABELS,
  SEVERITY_LABELS,
  timeAgo,
  type Incident,
} from '@uteq/shared';
import { HButton } from '@/components/ui';
import { fetchIncidents, toggleLike } from '@/lib/incidents';
import { distanceMeters, formatDistance } from '@/lib/geo';
import { CATEGORY, HERMES, SHADOW } from '@/lib/theme';

export default function ValidateReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const all = await fetchIncidents();
      setIncident(all.find((i) => i.id === id) ?? null);
    } catch {
      setIncident(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      } catch {
        // sin GPS
      }
    })();
  }, [load]);

  const validations = incident?.likes_count ?? 0;
  const target = INCIDENT_VALIDATION_TARGET;
  const remaining = Math.max(0, target - validations);

  const subtitle = useMemo(() => {
    if (!incident) return '';
    const parts = [
      incident.category ? INFRA_CATEGORY_LABELS[incident.category] : null,
      incident.severity ? SEVERITY_LABELS[incident.severity] : null,
      timeAgo(incident.created_at),
    ].filter(Boolean);
    return parts.join(' · ');
  }, [incident]);

  const distanceLabel = useMemo(() => {
    if (!incident || !coords) return '—';
    const meters = distanceMeters(coords.lat, coords.lng, incident.lat, incident.lng);
    return `${formatDistance(meters)} de ti`;
  }, [incident, coords]);

  async function handleConfirm() {
    if (!incident || busy) return;
    setBusy(true);
    try {
      if (!incident.liked_by_me) {
        const res = await toggleLike(incident.id);
        setIncident((prev) =>
          prev ? { ...prev, likes_count: res.likes_count, liked_by_me: res.liked } : prev,
        );
      }
      Alert.alert('Gracias', 'Tu validación ayuda a verificar alertas en el campus.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Error', 'No se pudo registrar tu validación. Intenta de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  function handleReject() {
    Alert.alert(
      'Reporte marcado como falso',
      'Gracias por ayudarnos a mantener alertas confiables. Revisaremos este reporte.',
      [{ text: 'OK', onPress: () => router.back() }],
    );
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

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.nav}>
        <Pressable style={styles.closeBtn} onPress={() => router.back()} hitSlop={10}>
          <MaterialCommunityIcons name="close" size={22} color={HERMES.gray700} />
        </Pressable>
        <Text style={styles.navTitle}>Validar reporte</Text>
        <View style={styles.closeBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.reportCard}>
          <View style={styles.reportHeader}>
            <View style={[styles.glyph, { backgroundColor: meta.bg }]}>
              <Text style={[styles.glyphText, { color: meta.color }]}>{meta.glyph}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.reportType}>{INCIDENT_LABELS[incident.type].toUpperCase()}</Text>
              <Text style={styles.reportSubtitle}>{subtitle}</Text>
            </View>
          </View>

          <Text style={styles.quote}>
            "{incident.description || 'Sin descripción'}"
          </Text>

          <View style={styles.metaRow}>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>LUGAR</Text>
              <Text style={styles.metaValue}>Campus UTEQ</Text>
            </View>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>DISTANCIA</Text>
              <Text style={styles.metaValue}>{distanceLabel}</Text>
            </View>
          </View>
        </View>

        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>VALIDACIONES</Text>
            <Text style={styles.progressCount}>
              {Math.min(validations, target)} / {target}
            </Text>
          </View>
          <View style={styles.progressBar}>
            {Array.from({ length: target }, (_, i) => (
              <View
                key={i}
                style={[styles.progressSegment, i < validations && styles.progressSegmentDone]}
              />
            ))}
          </View>
          <Text style={styles.progressHint}>
            {remaining === 0
              ? 'Reporte verificado por la comunidad'
              : remaining === 1
                ? 'Una validación más para verificar el reporte'
                : `${remaining} validaciones más para verificar el reporte`}
          </Text>
        </View>

        <Text style={styles.question}>¿Es real y preciso este reporte?</Text>

        <HButton
          label="✓  Sí, es real"
          full
          loading={busy}
          onPress={handleConfirm}
          variant="success"
          style={styles.confirmBtn}
        />

        <Pressable style={styles.rejectBtn} onPress={handleReject} disabled={busy}>
          <Text style={styles.rejectBtnText}>✕  Es falso</Text>
        </Pressable>

        <Pressable style={styles.unsureBtn} onPress={() => router.back()} disabled={busy}>
          <Text style={styles.unsureText}>No estoy seguro</Text>
        </Pressable>
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
    paddingBottom: 12,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    ...SHADOW.card,
  },
  navTitle: { fontSize: 17, fontWeight: '800', color: HERMES.gray900 },
  scroll: { paddingHorizontal: 20, paddingBottom: 32 },
  reportCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    gap: 14,
    ...SHADOW.card,
  },
  reportHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  glyph: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyphText: { fontSize: 22, fontWeight: '800' },
  reportType: { fontSize: 18, fontWeight: '800', color: HERMES.gray900, letterSpacing: -0.3 },
  reportSubtitle: { fontSize: 13, color: HERMES.gray500, marginTop: 2, fontWeight: '600' },
  quote: {
    fontSize: 15,
    lineHeight: 22,
    color: HERMES.gray700,
    fontStyle: 'italic',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: HERMES.gray50,
    borderRadius: 12,
    padding: 12,
  },
  metaCell: { flex: 1, gap: 4 },
  metaLabel: { fontSize: 10, fontWeight: '800', color: HERMES.gray400, letterSpacing: 0.5 },
  metaValue: { fontSize: 13, fontWeight: '700', color: HERMES.gray800 },
  progressSection: { marginTop: 24, gap: 10 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel: { fontSize: 11, fontWeight: '800', color: HERMES.gray400, letterSpacing: 0.6 },
  progressCount: { fontSize: 14, fontWeight: '800', color: HERMES.gray900 },
  progressBar: { flexDirection: 'row', gap: 6, height: 8 },
  progressSegment: { flex: 1, borderRadius: 4, backgroundColor: HERMES.gray200 },
  progressSegmentDone: { backgroundColor: HERMES.green },
  progressHint: { fontSize: 13, color: HERMES.gray500, fontWeight: '500' },
  question: {
    marginTop: 28,
    marginBottom: 16,
    fontSize: 17,
    fontWeight: '800',
    color: HERMES.gray900,
    textAlign: 'center',
  },
  confirmBtn: { borderRadius: 14, marginBottom: 12 },
  rejectBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: HERMES.red,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  rejectBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  unsureBtn: { alignItems: 'center', paddingVertical: 8 },
  unsureText: { fontSize: 15, fontWeight: '700', color: HERMES.gray500 },
});
