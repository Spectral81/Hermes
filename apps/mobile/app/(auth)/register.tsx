import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { getAuthErrorMessage, validateRegister } from '@uteq/shared';
import { supabase } from '@/lib/supabase';

export default function RegisterScreen() {
  const router = useRouter();
  const [form, setForm] = useState({
    matricula: '',
    nombre: '',
    apellidos: '',
    telefono: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
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

    const { error: authError } = await supabase.auth.signUp({
      email,
      password: form.password,
      options: {
        data: {
          matricula: form.matricula.trim(),
          nombre: form.nombre.trim(),
          apellidos: form.apellidos.trim(),
          telefono: form.telefono.trim(),
        },
      },
    });

    if (authError) {
      setError(getAuthErrorMessage(authError.message));
      setLoading(false);
      return;
    }

    router.replace({
      pathname: '/(auth)/verify-email',
      params: { email },
    });
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.badge}>UTEQ</Text>
          <Text style={styles.title}>Crear cuenta</Text>
          <Text style={styles.subtitle}>Solo correos @uteq.edu.mx</Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={styles.label}>Matrícula</Text>
            <TextInput style={styles.input} value={form.matricula} onChangeText={(v) => update('matricula', v)} />
          </View>
          <View style={styles.half}>
            <Text style={styles.label}>Teléfono</Text>
            <TextInput style={styles.input} value={form.telefono} onChangeText={(v) => update('telefono', v)} keyboardType="phone-pad" />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={styles.label}>Nombre</Text>
            <TextInput style={styles.input} value={form.nombre} onChangeText={(v) => update('nombre', v)} />
          </View>
          <View style={styles.half}>
            <Text style={styles.label}>Apellidos</Text>
            <TextInput style={styles.input} value={form.apellidos} onChangeText={(v) => update('apellidos', v)} />
          </View>
        </View>

        <Text style={styles.label}>Correo institucional</Text>
        <TextInput
          style={styles.input}
          value={form.email}
          onChangeText={(v) => update('email', v)}
          placeholder="nombre@uteq.edu.mx"
          placeholderTextColor="#6b7280"
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text style={styles.label}>Contraseña</Text>
        <TextInput style={styles.input} value={form.password} onChangeText={(v) => update('password', v)} secureTextEntry />

        <Text style={styles.label}>Confirmar contraseña</Text>
        <TextInput style={styles.input} value={form.confirmPassword} onChangeText={(v) => update('confirmPassword', v)} secureTextEntry />

        <Pressable style={styles.button} onPress={handleRegister} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Registrarse</Text>}
        </Pressable>

        <Text style={styles.footer}>
          ¿Ya tienes cuenta?{' '}
          <Link href="/(auth)/login" style={styles.link}>Inicia sesión</Link>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1419' },
  scroll: { flexGrow: 1, padding: 24, paddingTop: 48, paddingBottom: 48 },
  header: { marginBottom: 20 },
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
  subtitle: { color: '#8b9cb3', marginTop: 4 },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  label: { color: '#8b9cb3', fontSize: 14, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: '#1a2332',
    borderWidth: 1,
    borderColor: '#2d3a4d',
    borderRadius: 8,
    padding: 14,
    color: '#e8edf4',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  error: {
    backgroundColor: '#3f1d1d',
    color: '#fca5a5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  footer: { color: '#8b9cb3', textAlign: 'center', marginTop: 24 },
  link: { color: '#2563eb' },
});
