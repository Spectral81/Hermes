import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  INCIDENT_COLORS,
  INCIDENT_LABELS,
  INCIDENT_VECTOR_ICONS,
  INFRA_CATEGORY_LABELS,
  SEVERITY_LABELS,
  type CreateIncidentInput,
  type IncidentType,
  type InfraCategory,
  type Severity,
} from '@uteq/shared';
import { createIncident } from '@/lib/incidents';

interface Props {
  visible: boolean;
  coords: { lat: number; lng: number } | null;
  onClose: () => void;
  onCreated: (incident: import('@uteq/shared').Incident) => void;
}

type ReportType = Exclude<IncidentType, 'panico'>;

const TYPE_OPTIONS: { type: ReportType; icon: keyof typeof MaterialCommunityIcons.glyphMap }[] = [
  { type: 'robo', icon: INCIDENT_VECTOR_ICONS.robo },
  { type: 'accidente', icon: INCIDENT_VECTOR_ICONS.accidente },
  { type: 'infraestructura', icon: INCIDENT_VECTOR_ICONS.infraestructura },
];

const INFRA_OPTIONS = Object.keys(INFRA_CATEGORY_LABELS) as InfraCategory[];
const SEVERITY_OPTIONS = Object.keys(SEVERITY_LABELS) as Severity[];

export function ReportSheet({ visible, coords, onClose, onCreated }: Props) {
  const [type, setType] = useState<ReportType | null>(null);
  const [category, setCategory] = useState<InfraCategory | null>(null);
  const [severity, setSeverity] = useState<Severity | null>(null);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setType(null);
    setCategory(null);
    setSeverity(null);
    setDescription('');
    setError(null);
    setLoading(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit() {
    if (!type) return;
    if (!coords) {
      setError('No se pudo obtener tu ubicación. Activa el GPS.');
      return;
    }
    if (type === 'infraestructura' && !category) {
      setError('Selecciona una categoría.');
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
      reset();
      onCreated(created);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear el reporte.');
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.titleRow}>
            <Text style={styles.title}>Reportar incidente</Text>
            <Pressable onPress={handleClose} hitSlop={10}>
              <MaterialCommunityIcons name="close" size={24} color="#6b7280" />
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Text style={styles.label}>Tipo</Text>
            <View style={styles.typeRow}>
              {TYPE_OPTIONS.map((opt) => {
                const active = type === opt.type;
                return (
                  <Pressable
                    key={opt.type}
                    style={[
                      styles.typeCard,
                      active && { borderColor: INCIDENT_COLORS[opt.type], backgroundColor: '#1a2332' },
                    ]}
                    onPress={() => {
                      setType(opt.type);
                      setCategory(null);
                      setSeverity(null);
                    }}
                  >
                    <View style={[styles.typeIcon, { backgroundColor: INCIDENT_COLORS[opt.type] }]}>
                      <MaterialCommunityIcons name={opt.icon} size={24} color="#fff" />
                    </View>
                    <Text style={styles.typeText}>{INCIDENT_LABELS[opt.type]}</Text>
                  </Pressable>
                );
              })}
            </View>

            {type === 'infraestructura' && (
              <>
                <Text style={styles.label}>Categoría</Text>
                <View style={styles.chips}>
                  {INFRA_OPTIONS.map((cat) => (
                    <Pressable
                      key={cat}
                      style={[styles.chip, category === cat && styles.chipActive]}
                      onPress={() => setCategory(cat)}
                    >
                      <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>
                        {INFRA_CATEGORY_LABELS[cat]}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            {type === 'accidente' && (
              <>
                <Text style={styles.label}>Gravedad</Text>
                <View style={styles.chips}>
                  {SEVERITY_OPTIONS.map((sev) => (
                    <Pressable
                      key={sev}
                      style={[styles.chip, severity === sev && styles.chipActive]}
                      onPress={() => setSeverity(sev)}
                    >
                      <Text style={[styles.chipText, severity === sev && styles.chipTextActive]}>
                        {SEVERITY_LABELS[sev]}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            <Text style={styles.label}>Descripción</Text>
            <TextInput
              style={styles.input}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe brevemente lo que pasó"
              placeholderTextColor="#6b7280"
              multiline
              numberOfLines={3}
            />

            <View style={styles.locationRow}>
              <MaterialCommunityIcons name="map-marker" size={18} color="#2563eb" />
              <Text style={styles.locationText}>
                {coords
                  ? `Ubicación: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`
                  : 'Obteniendo ubicación…'}
              </Text>
            </View>

            <Pressable
              style={[styles.submit, (!type || loading) && styles.submitDisabled]}
              onPress={handleSubmit}
              disabled={!type || loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>Enviar reporte</Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#0f1419',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#374151',
    marginBottom: 12,
  },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { color: '#e8edf4', fontSize: 20, fontWeight: '700' },
  error: { backgroundColor: '#3f1d1d', color: '#fca5a5', padding: 10, borderRadius: 8, marginBottom: 8 },
  label: { color: '#8b9cb3', fontSize: 14, marginTop: 16, marginBottom: 8, fontWeight: '600' },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#2d3a4d',
    gap: 8,
  },
  typeIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  typeText: { color: '#e8edf4', fontSize: 13, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#2d3a4d',
  },
  chipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipText: { color: '#8b9cb3', fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  input: {
    backgroundColor: '#1a2332',
    borderWidth: 1,
    borderColor: '#2d3a4d',
    borderRadius: 10,
    padding: 14,
    color: '#e8edf4',
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 },
  locationText: { color: '#8b9cb3', fontSize: 13 },
  submit: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
