import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Profile } from '@uteq/shared';
import { supabase } from '@/lib/supabase';

export default function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.rpc('ensure_my_profile');
      setProfile(data as Profile | null);
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
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <MaterialCommunityIcons name="arrow-left" size={26} color="#e8edf4" />
        </Pressable>
        <Text style={styles.headerTitle}>Mi perfil</Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.avatar}>
        <MaterialCommunityIcons name="account" size={48} color="#2563eb" />
      </View>

      {profile && (
        <>
          <Text style={styles.name}>{profile.nombre} {profile.apellidos}</Text>
          <View style={styles.card}>
            <Row label="Matrícula" value={profile.matricula} />
            <Row label="Correo" value={profile.email} />
            <Row label="Teléfono" value={profile.telefono} />
            <Row label="Rol" value={profile.role} />
          </View>
        </>
      )}

      <Pressable style={styles.logout} onPress={handleLogout}>
        <MaterialCommunityIcons name="logout" size={20} color="#fca5a5" />
        <Text style={styles.logoutText}>Cerrar sesión</Text>
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
  container: { flex: 1, backgroundColor: '#0f1419', padding: 20, paddingTop: 56 },
  center: { flex: 1, backgroundColor: '#0f1419', justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { color: '#e8edf4', fontSize: 18, fontWeight: '700' },
  avatar: {
    alignSelf: 'center',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#1a2332',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  name: { color: '#e8edf4', fontSize: 22, fontWeight: '700', textAlign: 'center', marginTop: 12 },
  card: {
    backgroundColor: '#1a2332',
    borderWidth: 1,
    borderColor: '#2d3a4d',
    borderRadius: 14,
    padding: 16,
    gap: 14,
    marginTop: 24,
  },
  row: { gap: 2 },
  rowLabel: { color: '#8b9cb3', fontSize: 13 },
  rowValue: { color: '#e8edf4', fontWeight: '500', fontSize: 15 },
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 32,
    borderWidth: 1,
    borderColor: '#3f1d1d',
    borderRadius: 12,
    padding: 14,
  },
  logoutText: { color: '#fca5a5', fontWeight: '600', fontSize: 15 },
});
