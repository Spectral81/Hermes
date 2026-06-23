import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { HermesMark } from '@/components/ui/HermesLogo';
import { HERMES } from '@/lib/theme';

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={[HERMES.blue, HERMES.blueDark]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={[styles.container, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 }]}
    >
      <StatusBar style="light" />

      <View style={styles.hero}>
        <View style={styles.logoGlass}>
          <HermesMark size={56} color="#fff" accent={HERMES.blueDark} />
        </View>
        <Text style={styles.brand}>HERMES</Text>
        <Text style={styles.tagline}>Tu comunidad segura</Text>
        <View style={styles.campusPill}>
          <Text style={styles.campusText}>UTEQ · QUERÉTARO</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
          onPress={() => router.push('/(auth)/login')}
        >
          <Text style={styles.primaryBtnText}>Iniciar Sesión</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.outlineBtn, pressed && styles.pressed]}
          onPress={() => router.push('/(auth)/register')}
        >
          <Text style={styles.outlineBtnText}>Crear Cuenta</Text>
        </Pressable>

        <Text style={styles.footer}>
          Solo para estudiantes y staff con correo @uteq.edu.mx
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'space-between',
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoGlass: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  brand: {
    color: '#fff',
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: 6,
  },
  tagline: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 15,
    marginTop: 6,
  },
  campusPill: {
    marginTop: 24,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  campusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  actions: { gap: 12 },
  primaryBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: HERMES.blueDark,
    fontSize: 16,
    fontWeight: '700',
  },
  outlineBtn: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    marginTop: 8,
  },
  pressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
});
