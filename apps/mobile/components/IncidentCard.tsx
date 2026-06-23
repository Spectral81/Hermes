import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  INCIDENT_LABELS,
  INFRA_CATEGORY_LABELS,
  SEVERITY_LABELS,
  timeAgo,
  type Incident,
} from '@uteq/shared';
import { toggleLike } from '@/lib/incidents';
import { CATEGORY, HERMES, SHADOW } from '@/lib/theme';
import { HAvatar } from '@/components/ui';

interface Props {
  incident: Incident;
  onClose: () => void;
  onLikeChange: (id: string, likes: number, liked: boolean) => void;
}

export function IncidentCard({ incident, onClose, onLikeChange }: Props) {
  const [busy, setBusy] = useState(false);
  const meta = CATEGORY[incident.type];

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
        <MaterialCommunityIcons name="close" size={18} color={HERMES.gray500} />
      </Pressable>

      <View style={styles.headerRow}>
        <View style={[styles.glyph, { backgroundColor: meta.bg }]}>
          <Text style={[styles.glyphText, { color: meta.color }]} allowFontScaling={false}>
            {meta.glyph}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>
            {INCIDENT_LABELS[incident.type]}
            {subtitle ? ` · ${subtitle}` : ''}
          </Text>
          <Text style={styles.meta}>
            {incident.author_nombre ? `${incident.author_nombre} · ` : ''}
            {timeAgo(incident.created_at)}
          </Text>
        </View>
      </View>

      {incident.description ? (
        <Text style={styles.description}>{incident.description}</Text>
      ) : (
        <Text style={styles.descriptionMuted}>Sin descripción</Text>
      )}

      <View style={styles.footerRow}>
        {incident.author_nombre ? <HAvatar name={incident.author_nombre} size={28} /> : null}
        <View style={{ flex: 1 }} />
        <Pressable
          style={[styles.likeBtn, incident.liked_by_me && styles.likeBtnActive]}
          onPress={handleLike}
          disabled={busy}
        >
          <MaterialCommunityIcons
            name={incident.liked_by_me ? 'thumb-up' : 'thumb-up-outline'}
            size={18}
            color={incident.liked_by_me ? '#fff' : HERMES.blue}
          />
          <Text style={[styles.likeText, incident.liked_by_me && styles.likeTextActive]}>
            {incident.likes_count}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 36,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    ...SHADOW.float,
  },
  close: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: HERMES.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingRight: 28 },
  glyph: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  glyphText: { fontSize: 20, fontWeight: '800' },
  title: { fontSize: 16, fontWeight: '800', color: HERMES.gray900, letterSpacing: -0.3 },
  meta: { color: HERMES.gray500, marginTop: 2, fontSize: 12 },
  description: { color: HERMES.gray700, marginTop: 12, fontSize: 14, lineHeight: 20 },
  descriptionMuted: { color: HERMES.gray400, marginTop: 12, fontStyle: 'italic', fontSize: 14 },
  footerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14, gap: 10 },
  likeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: HERMES.blue,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  likeBtnActive: { backgroundColor: HERMES.blue },
  likeText: { color: HERMES.blue, fontWeight: '800', fontSize: 15 },
  likeTextActive: { color: '#fff' },
});
