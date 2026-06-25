import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getAuthErrorMessage, validateLogin } from '@uteq/shared';
import { supabase } from '@/lib/supabase';
import { HERMES } from '@/lib/theme';
import { HButton, HInput } from '@/components/ui';
import { HermesLogoLockup } from '@/components/ui/HermesLogo';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const emailValid = email.trim().toLowerCase().endsWith('@uteq.edu.mx');

  async function handleLogin() {
    setError(null);
    const validationError = validateLogin({ email, password });
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (authError) {
      setError(getAuthErrorMessage(authError.message));
      setLoading(false);
      return;
    }

    router.replace('/(app)/(tabs)/home');
  }

  function showComingSoon(feature: string) {
    Alert.alert(feature, 'Esta función estará disponible próximamente.');
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <HermesLogoLockup size={30} />

        <View style={styles.heading}>
          <Text style={styles.title}>Bienvenido</Text>
          <Text style={styles.subtitle}>Ingresa con tu cuenta institucional</Text>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <MaterialCommunityIcons name="alert-circle" size={18} color={HERMES.red} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.form}>
          <HInput
            label="Correo institucional"
            icon="email-outline"
            value={email}
            onChangeText={setEmail}
            placeholder="nombre@uteq.edu.mx"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            valid={email.length > 0 && emailValid}
          />
          <HInput
            label="Contraseña"
            icon="lock-outline"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoComplete="password"
            rightSlot={
              <Pressable onPress={() => setShowPassword((s) => !s)} hitSlop={10}>
                <MaterialCommunityIcons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={HERMES.gray500}
                />
              </Pressable>
            }
          />

          <View style={styles.optionsRow}>
            <Pressable style={styles.rememberRow} onPress={() => setRememberMe((v) => !v)}>
              <View style={[styles.checkbox, rememberMe && styles.checkboxOn]}>
                {rememberMe && <MaterialCommunityIcons name="check" size={12} color="#fff" />}
              </View>
              <Text style={styles.rememberText}>Recordarme</Text>
            </Pressable>
            <Pressable onPress={() => showComingSoon('Recuperar contraseña')}>
              <Text style={styles.forgotLink}>¿Olvidaste tu contraseña?</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.submit}>
          <HButton label="Iniciar sesión" full loading={loading} onPress={handleLogin} style={styles.roundBtn} />
        </View>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>O CONTINÚA CON</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.bioRow}>
          <Pressable style={styles.bioBtn} onPress={() => showComingSoon('Huella dactilar')}>
            <MaterialCommunityIcons name="fingerprint" size={20} color={HERMES.blue} />
            <Text style={styles.bioText}>Huella</Text>
          </Pressable>
          <Pressable style={styles.bioBtn} onPress={() => showComingSoon('Face ID')}>
            <MaterialCommunityIcons name="face-recognition" size={20} color={HERMES.blue} />
            <Text style={styles.bioText}>Face ID</Text>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>¿Eres nuevo? </Text>
          <Link href="/(auth)/register" style={styles.link}>
            Crea una cuenta
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: HERMES.white },
  scroll: { flexGrow: 1, paddingHorizontal: 24 },
  heading: { marginTop: 36 },
  title: { fontSize: 28, fontWeight: '800', color: HERMES.gray900, letterSpacing: -0.6 },
  subtitle: { fontSize: 14, color: HERMES.gray500, marginTop: 4 },
  form: { marginTop: 28, gap: 14 },
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  rememberRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: HERMES.gray300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: HERMES.blue, borderColor: HERMES.blue },
  rememberText: { fontSize: 13, color: HERMES.gray700, fontWeight: '500' },
  forgotLink: { fontSize: 13, color: HERMES.blue, fontWeight: '600' },
  submit: { marginTop: 28 },
  roundBtn: { borderRadius: 14 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 28 },
  dividerLine: { flex: 1, height: 1, backgroundColor: HERMES.gray200 },
  dividerText: { fontSize: 11, color: HERMES.gray400, fontWeight: '600', letterSpacing: 0.3 },
  bioRow: { flexDirection: 'row', gap: 12 },
  bioBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: HERMES.gray200,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  bioText: { fontSize: 13, fontWeight: '600', color: HERMES.gray700 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 12,
    marginTop: 20,
  },
  errorText: { color: '#991B1B', flex: 1, fontSize: 13, fontWeight: '500' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 'auto', paddingTop: 28 },
  footerText: { fontSize: 13, color: HERMES.gray500 },
  link: { fontSize: 13, color: HERMES.blue, fontWeight: '700' },
});
