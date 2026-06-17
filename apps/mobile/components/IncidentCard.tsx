import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  INCIDENT_COLORS,
  INCIDENT_LABELS,
  INFRA_CATEGORY_LABELS,
  SEVERITY_LABELS,
  timeAgo,
  type Incident,
} from '@uteq/shared';
import { toggleLike } from '@/lib/incidents';

interface Props {
  incident: Incident;
  onClose: () => void;
  onLikeChange: (id: string, likes: number, liked: boolean) => void;
}

// Tarjeta inferior estilo Waze al tocar un reporte
export function IncidentCard({ incident, onClose, onLikeChange }: Props) {
  const [busy, setBusy] = useState(false);
  const color = INCIDENT_COLORS[incident.type];

  const subtitle = [
    incident.category ? INFRA_CATEGORY_LABELS[incident.category] : null,
    incident.severity ? SEVERITY_LABELS[incident.severity] : null,
  ]
    .filter(Boolean)
    .join(' · ');

  async function handleLike() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await toggleLike(incident.id);
      onLikeChange(incident.id, res.likes_count, res.liked);
    } catch {
      // ignore
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.card}>
      <Pressable style={styles.close} onPress={onClose} hitSlop={10}>
        <MaterialCommunityIcons name="close" size={22} color="#6b7280" />
      </Pressable>

      <View style={styles.headerRow}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Text style={styles.title}>{INCIDENT_LABELS[incident.type]}</Text>
      </View>

      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

      {incident.description ? (
        <Text style={styles.description}>{incident.description}</Text>
      ) : (
        <Text style={styles.descriptionMuted}>Sin descripción</Text>
      )}

      <Text style={styles.meta}>
        {incident.author_nombre ? `${incident.author_nombre} · ` : ''}
        {timeAgo(incident.created_at)}
      </Text>

      <View style={styles.actions}>
        <Pressable
          style={[styles.likeBtn, incident.liked_by_me && styles.likeBtnActive]}
          onPress={handleLike}
          disabled={busy}
        >
          <MaterialCommunityIcons
            name={incident.liked_by_me ? 'thumb-up' : 'thumb-up-outline'}
            size={20}
            color={incident.liked_by_me ? '#fff' : '#2563eb'}
          />
          <Text style={[styles.likeText, incident.liked_by_me && styles.likeTextActive]}>
            {incident.likes_count}
          </Text>
        </Pressable>
        <Text style={styles.confirmHint}>Confirmar que sigue aquí</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 24,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  close: { position: 'absolute', top: 12, right: 12, zIndex: 2 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  title: { fontSize: 18, fontWeight: '700', color: '#111827' },
  subtitle: { color: '#6b7280', marginTop: 2, fontWeight: '500' },
  description: { color: '#374151', marginTop: 10, fontSize: 15, lineHeight: 21 },
  descriptionMuted: { color: '#9ca3af', marginTop: 10, fontStyle: 'italic' },
  meta: { color: '#9ca3af', marginTop: 10, fontSize: 13 },
  actions: { flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 12 },
  likeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: '#2563eb',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  likeBtnActive: { backgroundColor: '#2563eb' },
  likeText: { color: '#2563eb', fontWeight: '700', fontSize: 15 },
  likeTextActive: { color: '#fff' },
  confirmHint: { color: '#9ca3af', fontSize: 13, flex: 1 },
});
