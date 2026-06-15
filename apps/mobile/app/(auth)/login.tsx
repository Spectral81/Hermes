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
import { getAuthErrorMessage, validateLogin } from '@uteq/shared';
import { supabase } from '@/lib/supabase';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

    router.replace('/(app)/home');
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.badge}>UTEQ</Text>
          <Text style={styles.title}>Iniciar sesión</Text>
          <Text style={styles.subtitle}>Seguridad y gestión de incidentes</Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.label}>Correo institucional</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="nombre@uteq.edu.mx"
          placeholderTextColor="#6b7280"
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />

        <Text style={styles.label}>Contraseña</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
        />

        <Pressable style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Entrar</Text>}
        </Pressable>

        <Text style={styles.footer}>
          ¿No tienes cuenta?{' '}
          <Link href="/(auth)/register" style={styles.link}>Regístrate</Link>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1419' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { marginBottom: 24 },
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
