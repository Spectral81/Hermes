import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  INCIDENT_LABELS,
  timeAgo,
  type Incident,
  type Profile,
} from '@uteq/shared';
import { fetchIncidents } from '@/lib/incidents';
import { supabase } from '@/lib/supabase';
import { CATEGORY, HERMES, SHADOW } from '@/lib/theme';
import { HAvatar, HButton, HCard } from '@/components/ui';

const ROLE_LABELS: Record<string, string> = {
  estudiante: 'Estudiante',
  admin_general: 'Administrador',
  responsable_robos: 'Responsable · Robos',
  responsable_accidentes: 'Responsable · Accidentes',
  responsable_infraestructura: 'Responsable · Infraestructura',
};

const TAB_BAR_HEIGHT = 62;

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [myIncidents, setMyIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const { data } = await supabase.rpc('ensure_my_profile');
      setProfile(data as Profile | null);

      try {
        const all = await fetchIncidents();
        setMyIncidents(all.filter((i) => i.created_by === user.id));
      } catch {
        // ignore
      }
      setLoading(false);
    }
    load();
  }, []);

  const stats = useMemo(() => {
    const reportes = myIncidents.length;
    const likes = myIncidents.reduce((sum, i) => sum + (i.likes_count ?? 0), 0);
    const activos = myIncidents.filter((i) => i.status === 'activo').length;
    return { reportes, likes, activos };
  }, [myIncidents]);

  const fullName = profile ? `${profile.nombre} ${profile.apellidos}` : 'Usuario UTEQ';

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={HERMES.blue} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.headerBg, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.navTitle}>Mi perfil</Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: TAB_BAR_HEIGHT + insets.bottom + 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileCard}>
          <View style={styles.avatarRing}>
            <HAvatar name={fullName} size={72} />
          </View>
          <Text style={styles.name}>{fullName}</Text>
          {profile && (
            <Text style={styles.handle}>
              {profile.matricula} · {ROLE_LABELS[profile.role] ?? profile.role}
            </Text>
          )}
        </View>

        <View style={styles.statsGrid}>
          {[
            { n: stats.reportes, l: 'Reportes', c: HERMES.blue },
            { n: stats.activos, l: 'Activos', c: HERMES.red },
            { n: stats.likes, l: 'Confirmac.', c: HERMES.green },
          ].map((s) => (
            <View key={s.l} style={styles.statCard}>
              <Text style={[styles.statNum, { color: s.c }]}>{s.n}</Text>
              <Text style={styles.statLabel}>{s.l}</Text>
            </View>
          ))}
        </View>

        {profile && (
          <HCard style={styles.block}>
            <Text style={styles.sectionLabel}>DATOS DE LA CUENTA</Text>
            <Row icon="email-outline" label="Correo" value={profile.email} />
            <Row icon="phone-outline" label="Teléfono" value={profile.telefono} />
            <Row icon="card-account-details-outline" label="Matrícula" value={profile.matricula} />
          </HCard>
        )}

        <View style={styles.blockHeader}>
          <Text style={styles.blockTitle}>Mis reportes</Text>
          <Text style={styles.blockCount}>{myIncidents.length}</Text>
        </View>

        {myIncidents.length === 0 ? (
          <HCard style={styles.emptyCard}>
            <MaterialCommunityIcons name="map-marker-off-outline" size={28} color={HERMES.gray400} />
            <Text style={styles.emptyText}>Aún no has creado reportes</Text>
          </HCard>
        ) : (
          <View style={{ gap: 8 }}>
            {myIncidents.slice(0, 5).map((r) => {
              const meta = CATEGORY[r.type];
              return (
                <Pressable key={r.id} onPress={() => router.push(`/(app)/alert/${r.id}`)}>
                  <HCard accent={meta.color} padding={12}>
                    <View style={styles.reportRow}>
                      <View style={[styles.reportGlyph, { backgroundColor: meta.bg }]}>
                        <Text style={[styles.reportGlyphText, { color: meta.color }]} allowFontScaling={false}>
                          {meta.glyph}
                        </Text>
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.reportTitle} numberOfLines={1}>
                          {INCIDENT_LABELS[r.type]}
                          {r.description ? ` · ${r.description}` : ''}
                        </Text>
                        <Text style={styles.reportTime}>{timeAgo(r.created_at)}</Text>
                      </View>
                      <View style={styles.reportLikes}>
                        <MaterialCommunityIcons name="thumb-up" size={13} color={HERMES.gray400} />
                        <Text style={styles.reportLikesText}>{r.likes_count}</Text>
                      </View>
                    </View>
                  </HCard>
                </Pressable>
              );
            })}
          </View>
        )}

        <View style={styles.logout}>
          <HButton label="Cerrar sesión" variant="ghost" icon="logout" full onPress={handleLogout} />
        </View>
      </ScrollView>
    </View>
  );
}

function Row({
  icon,
  label,
  value,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.dataRow}>
      <MaterialCommunityIcons name={icon} size={18} color={HERMES.gray400} />
      <Text style={styles.dataLabel}>{label}</Text>
      <Text style={styles.dataValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: HERMES.gray50 },
  center: { flex: 1, backgroundColor: HERMES.gray50, justifyContent: 'center', alignItems: 'center' },
  headerBg: {
    backgroundColor: HERMES.blue,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  navTitle: { color: '#fff', fontSize: 17, fontWeight: '800' },
  profileCard: {
    marginTop: -36,
    marginBottom: 18,
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    ...SHADOW.float,
  },
  avatarRing: {
    padding: 4,
    borderRadius: 42,
    backgroundColor: HERMES.gray50,
    marginBottom: 12,
  },
  name: {
    fontSize: 20,
    fontWeight: '800',
    color: HERMES.gray900,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  handle: { fontSize: 13, color: HERMES.gray500, marginTop: 4, textAlign: 'center' },
  statsGrid: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    ...SHADOW.card,
  },
  statNum: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  statLabel: { fontSize: 10, color: HERMES.gray500, fontWeight: '700', marginTop: 2 },
  block: { marginBottom: 18 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: HERMES.gray500,
    letterSpacing: 0.4,
    marginBottom: 12,
  },
  dataRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8 },
  dataLabel: { fontSize: 13, color: HERMES.gray500, width: 72, paddingTop: 1 },
  dataValue: { flex: 1, fontSize: 13, color: HERMES.gray900, fontWeight: '600', textAlign: 'right' },
  blockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  blockTitle: { fontSize: 16, fontWeight: '800', color: HERMES.gray900 },
  blockCount: { fontSize: 13, fontWeight: '700', color: HERMES.gray400 },
  emptyCard: { alignItems: 'center', gap: 8, paddingVertical: 24 },
  emptyText: { color: HERMES.gray500, fontSize: 13 },
  reportRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reportGlyph: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportGlyphText: { fontSize: 14, fontWeight: '800' },
  reportTitle: { fontSize: 13, fontWeight: '700', color: HERMES.gray900 },
  reportTime: { fontSize: 11, color: HERMES.gray500, marginTop: 1 },
  reportLikes: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  reportLikesText: { fontSize: 12, color: HERMES.gray400, fontWeight: '700' },
  logout: { marginTop: 24 },
});
