import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  INCIDENT_LABELS,
  INFRA_CATEGORY_LABELS,
  SEVERITY_LABELS,
  type CreateIncidentInput,
  type Incident,
  type IncidentType,
  type InfraCategory,
  type Severity,
} from '@uteq/shared';
import { createIncident } from '@/lib/incidents';
import { CATEGORY, HERMES } from '@/lib/theme';
import { HButton } from '@/components/ui';

interface Props {
  visible: boolean;
  coords: { lat: number; lng: number } | null;
  initialType?: IncidentType | null;
  onClose: () => void;
  onCreated: (incident: Incident) => void;
}

const TYPE_OPTIONS: IncidentType[] = ['robo', 'accidente', 'infraestructura', 'panico'];
const INFRA_OPTIONS = Object.keys(INFRA_CATEGORY_LABELS) as InfraCategory[];
const SEVERITY_OPTIONS = Object.keys(SEVERITY_LABELS) as Severity[];
const MAX_DESC = 500;

export function ReportSheet({ visible, coords, initialType, onClose, onCreated }: Props) {
  const [type, setType] = useState<IncidentType | null>(null);
  const [category, setCategory] = useState<InfraCategory | null>(null);
  const [severity, setSeverity] = useState<Severity | null>(null);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setType(initialType ?? null);
      setCategory(null);
      setSeverity(null);
      setDescription('');
      setError(null);
      setLoading(false);
    }
  }, [visible, initialType]);

  function handleClose() {
    onClose();
  }

  async function handleSubmit() {
    if (!type) {
      setError('Selecciona una categoría.');
      return;
    }
    if (!coords) {
      setError('No se pudo obtener tu ubicación. Activa el GPS.');
      return;
    }
    if (type === 'infraestructura' && !category) {
      setError('Selecciona una categoría de falla.');
      return;
    }

    setLoading(true);
    setError(null);
    const payload: CreateIncidentInput = {
      type,
      description: description.trim(),
      lat: coords.lat,
      lng: coords.lng,
      category: type === 'infraestructura' ? category : null,
      severity: type === 'accidente' ? severity : null,
    };

    try {
      const created = await createIncident(payload);
      onCreated(created);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear el reporte.');
      setLoading(false);
    }
  }

  const isSos = type === 'panico';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTouch} onPress={handleClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.titleRow}>
            <Text style={styles.title}>{isSos ? 'Emergencia SOS' : 'Nuevo reporte'}</Text>
            <Pressable style={styles.closeBtn} onPress={handleClose} hitSlop={10}>
              <MaterialCommunityIcons name="close" size={18} color={HERMES.gray700} />
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {error ? (
              <View style={styles.errorBox}>
                <MaterialCommunityIcons name="alert-circle" size={16} color={HERMES.red} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Text style={styles.sectionLabel}>CATEGORÍA</Text>
            <View style={styles.typeGrid}>
              {TYPE_OPTIONS.map((opt) => {
                const meta = CATEGORY[opt];
                const active = type === opt;
                return (
                  <Pressable
                    key={opt}
                    style={[
                      styles.typeCard,
                      { borderColor: active ? meta.color : HERMES.gray200, backgroundColor: active ? meta.bg : '#fff' },
                    ]}
                    onPress={() => {
                      setType(opt);
                      setCategory(null);
                      setSeverity(null);
                    }}
                  >
                    <View style={[styles.typeGlyph, { backgroundColor: meta.color }]}>
                      <Text style={styles.typeGlyphText} allowFontScaling={false}>{meta.glyph}</Text>
                    </View>
                    <Text style={[styles.typeText, { color: active ? meta.color : HERMES.gray700 }]}>
                      {opt === 'panico' ? 'SOS' : INCIDENT_LABELS[opt]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {type === 'infraestructura' && (
              <>
                <Text style={styles.sectionLabel}>TIPO DE FALLA</Text>
                <View style={styles.chips}>
                  {INFRA_OPTIONS.map((cat) => {
                    const active = category === cat;
                    return (
                      <Pressable
                        key={cat}
                        style={[styles.chip, active && styles.chipActive]}
                        onPress={() => setCategory(cat)}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>
                          {INFRA_CATEGORY_LABELS[cat]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}

            {type === 'accidente' && (
              <>
                <Text style={styles.sectionLabel}>GRAVEDAD</Text>
                <View style={styles.chips}>
                  {SEVERITY_OPTIONS.map((sev) => {
                    const active = severity === sev;
                    return (
                      <Pressable
                        key={sev}
                        style={[styles.chip, active && styles.chipActive]}
                        onPress={() => setSeverity(sev)}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>
                          {SEVERITY_LABELS[sev]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}

            <Text style={styles.sectionLabel}>DESCRIPCIÓN</Text>
            <View style={styles.descBox}>
              <TextInput
                style={styles.descInput}
                value={description}
                onChangeText={(t) => t.length <= MAX_DESC && setDescription(t)}
                placeholder={isSos ? '¿Qué está pasando? (opcional)' : 'Describe brevemente lo que pasó'}
                placeholderTextColor={HERMES.gray400}
                multiline
              />
              <Text style={styles.counter}>{description.length} / {MAX_DESC}</Text>
            </View>

            <View style={styles.locationPill}>
              <MaterialCommunityIcons name="map-marker" size={18} color={HERMES.blue} />
              <View style={{ flex: 1 }}>
                <Text style={styles.locationTitle}>
                  {coords ? 'Tu ubicación actual' : 'Obteniendo ubicación…'}
                </Text>
                <Text style={styles.locationSub}>
                  {coords ? `GPS · ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}` : 'Activa el GPS'}
                </Text>
              </View>
            </View>

            <View style={styles.actions}>
              <View style={{ flex: 1 }}>
                <HButton label="Cancelar" variant="ghost" full onPress={handleClose} />
              </View>
              <View style={{ flex: 1 }}>
                <HButton
                  label={isSos ? 'Enviar SOS' : 'Enviar reporte'}
                  variant={isSos ? 'danger' : 'primary'}
                  full
                  loading={loading}
                  onPress={handleSubmit}
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  backdropTouch: { flex: 1 },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    maxHeight: '88%',
  },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: HERMES.gray200, marginBottom: 14 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  title: { fontSize: 22, fontWeight: '800', color: HERMES.gray900, letterSpacing: -0.4 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: HERMES.gray100, alignItems: 'center', justifyContent: 'center' },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  errorText: { color: '#991B1B', flex: 1, fontSize: 13 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: HERMES.gray500, letterSpacing: 0.4, marginBottom: 8, marginTop: 4 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  typeCard: {
    width: '47.5%',
    height: 56,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  typeGlyph: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  typeGlyphText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  typeText: { fontSize: 14, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  chip: { height: 34, paddingHorizontal: 14, borderRadius: 999, backgroundColor: HERMES.gray100, alignItems: 'center', justifyContent: 'center' },
  chipActive: { backgroundColor: HERMES.gray900 },
  chipText: { fontSize: 13, fontWeight: '600', color: HERMES.gray700 },
  chipTextActive: { color: '#fff' },
  descBox: { minHeight: 90, borderRadius: 12, borderWidth: 1.5, borderColor: HERMES.gray200, padding: 12, marginBottom: 14 },
  descInput: { flex: 1, fontSize: 14, color: HERMES.gray900, lineHeight: 20, textAlignVertical: 'top', padding: 0, minHeight: 50 },
  counter: { fontSize: 11, color: HERMES.gray400, textAlign: 'right', marginTop: 4 },
  locationPill: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: HERMES.blueSoft, borderRadius: 12, padding: 12 },
  locationTitle: { fontSize: 13, fontWeight: '700', color: HERMES.gray900 },
  locationSub: { fontSize: 11, color: HERMES.gray500, marginTop: 1 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 20 },
});
