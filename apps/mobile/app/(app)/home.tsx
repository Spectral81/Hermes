import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Profile } from '@uteq/shared';
import { supabase } from '@/lib/supabase';

export default function HomeScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase.rpc('ensure_my_profile');

      setProfile(data);
      setLoading(false);
    }

    loadProfile();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.badge}>UTEQ Seguridad</Text>
      <Text style={styles.title}>Hola{profile ? `, ${profile.nombre}` : ''}</Text>

      {profile && (
        <View style={styles.card}>
          <Row label="Matrícula" value={profile.matricula} />
          <Row label="Correo" value={profile.email} />
          <Row label="Teléfono" value={profile.telefono} />
          <Row label="Rol" value={profile.role} />
        </View>
      )}

      <Pressable style={styles.buttonOutline} onPress={handleLogout}>
        <Text style={styles.buttonOutlineText}>Cerrar sesión</Text>
      </Pressable>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1419', padding: 24, paddingTop: 60 },
  center: { flex: 1, backgroundColor: '#0f1419', justifyContent: 'center', alignItems: 'center' },
  badge: {
    alignSelf: 'flex-start',
    color: '#2563eb',
    backgroundColor: 'rgba(37,99,235,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    fontWeight: '700',
    fontSize: 12,
    overflow: 'hidden',
  },
  title: { color: '#e8edf4', fontSize: 24, fontWeight: '700', marginTop: 12, marginBottom: 24 },
  card: {
    backgroundColor: '#1a2332',
    borderWidth: 1,
    borderColor: '#2d3a4d',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  row: { gap: 2 },
  rowLabel: { color: '#8b9cb3', fontSize: 13 },
  rowValue: { color: '#e8edf4', fontWeight: '500' },
  buttonOutline: {
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#2d3a4d',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  buttonOutlineText: { color: '#8b9cb3' },
});
