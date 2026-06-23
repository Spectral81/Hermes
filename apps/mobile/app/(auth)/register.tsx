import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getAuthErrorMessage, isUteqEmail, validateRegister } from '@uteq/shared';
import { supabase } from '@/lib/supabase';
import {
  confirmRegistrationViaWebApi,
  getWebApiUrl,
  registerViaWebApi,
} from '@/lib/web-api';
import { HERMES } from '@/lib/theme';
import { HButton, HInput } from '@/components/ui';

function passwordChecks(pw: string) {
  return [
    { ok: pw.length >= 8, l: '8 caracteres' },
    { ok: /[A-Z]/.test(pw), l: 'Mayúscula' },
    { ok: /[0-9]/.test(pw), l: 'Número' },
    { ok: /[^A-Za-z0-9]/.test(pw), l: 'Símbolo' },
  ];
}

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState({
    matricula: '',
    nombre: '',
    apellidos: '',
    telefono: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const checks = passwordChecks(form.password);
  const strength = checks.filter((c) => c.ok).length;
  const strengthColors = [HERMES.gray200, HERMES.red, HERMES.amber, HERMES.amber, HERMES.green];

  function validateStep1(): string | null {
    if (!form.nombre.trim()) return 'El nombre es obligatorio.';
    if (!form.apellidos.trim()) return 'El apellido es obligatorio.';
    if (!form.matricula.trim()) return 'La matrícula es obligatoria.';
    if (!isUteqEmail(form.email)) return 'Usa tu correo @uteq.edu.mx.';
    if (form.password.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
    if (!acceptedTerms) return 'Debes aceptar los términos y la política de privacidad.';
    return null;
  }

  function handleContinue() {
    setError(null);
    const err = validateStep1();
    if (err) {
      setError(err);
      return;
    }
    setStep(2);
  }

  async function handleRegister() {
    setError(null);

    if (form.password !== form.confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    const validationError = validateRegister({
      matricula: form.matricula,
      nombre: form.nombre,
      apellidos: form.apellidos,
      telefono: form.telefono,
      email: form.email,
      password: form.password,
    });
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    const email = form.email.trim().toLowerCase();
    const payload = {
      matricula: form.matricula.trim(),
      nombre: form.nombre.trim(),
      apellidos: form.apellidos.trim(),
      telefono: form.telefono.trim(),
      email,
      password: form.password,
    };

    const webApiUrl = getWebApiUrl();
    if (webApiUrl) {
      const apiResult = await registerViaWebApi(webApiUrl, payload);
      if (!apiResult.ok) {
        setError(getAuthErrorMessage(apiResult.error ?? 'Error al registrarse.'));
        setLoading(false);
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: form.password,
      });

      if (signInError) {
        setError(getAuthErrorMessage(signInError.message));
        setLoading(false);
        return;
      }

      router.replace('/(app)/home');
      setLoading(false);
      return;
    }

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password: form.password,
      options: {
        data: {
          matricula: payload.matricula,
          nombre: payload.nombre,
          apellidos: payload.apellidos,
          telefono: payload.telefono,
        },
      },
    });

    if (authError) {
      setError(getAuthErrorMessage(authError.message));
      setLoading(false);
      return;
    }

    if (data.user?.id) {
      const fallbackWebUrl = 'https://web-production-10a1.up.railway.app';
      await confirmRegistrationViaWebApi(fallbackWebUrl, data.user.id);
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: form.password,
    });

    if (signInError) {
      router.replace({ pathname: '/(auth)/verify-email', params: { email } });
      setLoading(false);
      return;
    }

    router.replace('/(app)/home');
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          style={styles.backBtn}
          onPress={() => (step === 2 ? setStep(1) : router.back())}
          hitSlop={8}
        >
          <MaterialCommunityIcons name="arrow-left" size={20} color={HERMES.gray700} />
        </Pressable>

        <View style={styles.heading}>
          <Text style={styles.title}>Crear cuenta</Text>
          <Text style={styles.subtitle}>
            Paso {step} de 2 · {step === 1 ? 'Datos personales' : 'Contacto y seguridad'}
          </Text>
          <View style={styles.progressRow}>
            <View style={[styles.progressBar, styles.progressOn]} />
            <View style={[styles.progressBar, step === 2 && styles.progressOn]} />
          </View>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <MaterialCommunityIcons name="alert-circle" size={18} color={HERMES.red} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {step === 1 ? (
          <>
            <View style={styles.form}>
              <View style={styles.row}>
                <View style={styles.half}>
                  <HInput
                    label="Nombre"
                    value={form.nombre}
                    onChangeText={(v) => update('nombre', v)}
                    valid={form.nombre.trim().length > 0}
                  />
                </View>
                <View style={styles.half}>
                  <HInput
                    label="Apellido"
                    value={form.apellidos}
                    onChangeText={(v) => update('apellidos', v)}
                    valid={form.apellidos.trim().length > 0}
                  />
                </View>
              </View>

              <HInput
                label="Matrícula UTEQ"
                value={form.matricula}
                onChangeText={(v) => update('matricula', v)}
                keyboardType="number-pad"
                helper="10 dígitos"
                valid={/^\d{10}$/.test(form.matricula.trim())}
              />

              <HInput
                label="Correo institucional"
                icon="email-outline"
                value={form.email}
                onChangeText={(v) => update('email', v)}
                placeholder="nombre@uteq.edu.mx"
                autoCapitalize="none"
                keyboardType="email-address"
                valid={form.email.length > 0 && isUteqEmail(form.email)}
              />

              <HInput
                label="Contraseña"
                icon="lock-outline"
                value={form.password}
                onChangeText={(v) => update('password', v)}
                secureTextEntry={!showPassword}
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

              {form.password.length > 0 && (
                <>
                  <View style={styles.strengthRow}>
                    {[0, 1, 2, 3].map((i) => (
                      <View
                        key={i}
                        style={[
                          styles.strengthBar,
                          { backgroundColor: i < strength ? strengthColors[strength] : HERMES.gray200 },
                        ]}
                      />
                    ))}
                  </View>
                  <View style={styles.checksGrid}>
                    {checks.map((c) => (
                      <View key={c.l} style={styles.checkItem}>
                        <View style={[styles.checkDot, { backgroundColor: c.ok ? HERMES.green : HERMES.gray200 }]}>
                          {c.ok && <MaterialCommunityIcons name="check" size={9} color="#fff" />}
                        </View>
                        <Text style={[styles.checkLabel, { color: c.ok ? HERMES.green : HERMES.gray400 }]}>
                          {c.l}
                        </Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </View>

            <Pressable style={styles.termsRow} onPress={() => setAcceptedTerms((v) => !v)}>
              <View style={[styles.termsCheck, acceptedTerms && styles.termsCheckOn]}>
                {acceptedTerms && <MaterialCommunityIcons name="check" size={12} color="#fff" />}
              </View>
              <Text style={styles.termsText}>
                Acepto los <Text style={styles.termsLink}>Términos</Text> y la{' '}
                <Text style={styles.termsLink}>Política de Privacidad</Text> de HERMES UTEQ
              </Text>
            </Pressable>

            <View style={styles.submit}>
              <HButton label="Continuar" full onPress={handleContinue} style={styles.roundBtn} />
            </View>
          </>
        ) : (
          <>
            <View style={styles.form}>
              <HInput
                label="Teléfono"
                icon="phone-outline"
                value={form.telefono}
                onChangeText={(v) => update('telefono', v)}
                keyboardType="phone-pad"
                placeholder="4421234567"
                valid={form.telefono.trim().length >= 10}
              />
              <HInput
                label="Confirmar contraseña"
                icon="lock-check-outline"
                value={form.confirmPassword}
                onChangeText={(v) => update('confirmPassword', v)}
                secureTextEntry={!showPassword}
                valid={form.confirmPassword.length > 0 && form.confirmPassword === form.password}
              />
            </View>

            <View style={styles.submit}>
              <HButton label="Registrarse" full loading={loading} onPress={handleRegister} style={styles.roundBtn} />
            </View>
          </>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>¿Ya tienes cuenta? </Text>
          <Link href="/(auth)/login" style={styles.link}>
            Inicia sesión
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: HERMES.white },
  scroll: { flexGrow: 1, paddingHorizontal: 24 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: HERMES.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: { marginTop: 24 },
  title: { fontSize: 26, fontWeight: '800', color: HERMES.gray900, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: HERMES.gray500, marginTop: 4 },
  progressRow: { flexDirection: 'row', gap: 4, marginTop: 12 },
  progressBar: { flex: 1, height: 4, borderRadius: 4, backgroundColor: HERMES.gray200 },
  progressOn: { backgroundColor: HERMES.blue },
  form: { marginTop: 24, gap: 14 },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  strengthRow: { flexDirection: 'row', gap: 6 },
  strengthBar: { flex: 1, height: 4, borderRadius: 2 },
  checksGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  checkItem: { flexDirection: 'row', alignItems: 'center', gap: 6, width: '45%' },
  checkDot: { width: 14, height: 14, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  checkLabel: { fontSize: 12 },
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 24 },
  termsCheck: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: HERMES.gray300,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  termsCheckOn: { backgroundColor: HERMES.blue, borderColor: HERMES.blue },
  termsText: { flex: 1, fontSize: 12, color: HERMES.gray600, lineHeight: 18 },
  termsLink: { color: HERMES.blue, fontWeight: '600' },
  submit: { marginTop: 20 },
  roundBtn: { borderRadius: 14 },
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
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 28 },
  footerText: { fontSize: 13, color: HERMES.gray500 },
  link: { fontSize: 13, color: HERMES.blue, fontWeight: '700' },
});
