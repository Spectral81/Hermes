import { Link, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function VerifyEmailScreen() {
  const { email } = useLocalSearchParams<{ email?: string }>();

  return (
    <View style={styles.container}>
      <Text style={styles.badge}>UTEQ</Text>
      <Text style={styles.title}>Verifica tu correo</Text>
      <Text style={styles.subtitle}>
        Enviamos un enlace de confirmación{email ? ` a ${email}` : ''}.
      </Text>
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          Revisa tu bandeja de entrada. Debes confirmar el correo antes de iniciar sesión.
        </Text>
      </View>
      <Link href="/(auth)/login" style={styles.link}>Ir a iniciar sesión</Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1419', padding: 24, justifyContent: 'center' },
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
  title: { color: '#e8edf4', fontSize: 28, fontWeight: '700', marginTop: 12 },
  subtitle: { color: '#8b9cb3', marginTop: 8 },
  infoBox: {
    backgroundColor: '#1e3a5f',
    padding: 16,
    borderRadius: 8,
    marginTop: 24,
  },
  infoText: { color: '#93c5fd' },
  link: { color: '#2563eb', marginTop: 24, fontSize: 16, fontWeight: '600' },
});
