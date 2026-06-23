import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { HERMES } from '@/lib/theme';
import { HButton } from '@/components/ui';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email?: string }>();

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <MaterialCommunityIcons name="email-check-outline" size={34} color={HERMES.blue} />
      </View>

      <Text style={styles.title}>Verifica tu correo</Text>
      <Text style={styles.subtitle}>
        Si tu registro fue exitoso ya puedes iniciar sesión
        {email ? `, ${email}` : ''}.
      </Text>

      <View style={styles.infoBox}>
        <MaterialCommunityIcons name="information-outline" size={18} color={HERMES.blue} />
        <Text style={styles.infoText}>
          El servidor activa tu cuenta automáticamente. Si no recibes el correo, intenta iniciar sesión.
        </Text>
      </View>

      <View style={styles.action}>
        <HButton label="Ir a iniciar sesión" full onPress={() => router.replace('/(auth)/login')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: HERMES.white, padding: 24, justifyContent: 'center' },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: HERMES.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 26, fontWeight: '800', color: HERMES.gray900, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: HERMES.gray500, marginTop: 8, lineHeight: 21 },
  infoBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: HERMES.blueSoft,
    borderRadius: 12,
    padding: 14,
    marginTop: 24,
  },
  infoText: { color: HERMES.gray700, flex: 1, fontSize: 13, lineHeight: 19 },
  action: { marginTop: 28 },
});
