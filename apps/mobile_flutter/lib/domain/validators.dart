import 'constants.dart';
import 'models.dart';

class PasswordRuleResult {
  PasswordRuleResult({required this.label, required this.passed});

  final String label;
  final bool passed;
}

bool isUteqEmail(String email, {String domain = uteqEmailDomain}) {
  final normalized = email.trim().toLowerCase();
  return normalized.endsWith('@$domain') && normalized.contains('@');
}

String expectedUteqEmail(String matricula, {String domain = uteqEmailDomain}) {
  return '${matricula.trim().toLowerCase()}@$domain';
}

bool emailMatchesMatricula(String email, String matricula, {String domain = uteqEmailDomain}) {
  final normalized = email.trim().toLowerCase();
  final mat = matricula.trim();
  if (mat.isEmpty || !isUteqEmail(normalized, domain: domain)) return false;
  return normalized.split('@').first == mat.toLowerCase();
}

List<PasswordRuleResult> passwordRuleResults(String password) {
  return [
    PasswordRuleResult(label: '8 caracteres', passed: password.length >= 8),
    PasswordRuleResult(label: 'Mayúscula', passed: RegExp(r'[A-Z]').hasMatch(password)),
    PasswordRuleResult(label: 'Número', passed: RegExp(r'[0-9]').hasMatch(password)),
    PasswordRuleResult(label: 'Símbolo', passed: RegExp(r'[^A-Za-z0-9]').hasMatch(password)),
  ];
}

String? validatePasswordStrength(String password) {
  final failed = passwordRuleResults(password).where((r) => !r.passed).toList();
  if (failed.isEmpty) return null;
  final labels = failed.map((f) => f.label.toLowerCase()).join(', ');
  return 'La contraseña debe incluir: $labels.';
}

String? validateRegister(RegisterInput input, {String domain = uteqEmailDomain}) {
  if (input.matricula.trim().isEmpty) return 'La matrícula es obligatoria.';
  if (!RegExp(r'^\d{10}$').hasMatch(input.matricula.trim())) {
    return 'La matrícula debe tener 10 dígitos.';
  }
  if (input.nombre.trim().isEmpty) return 'El nombre es obligatorio.';
  if (input.apellidos.trim().isEmpty) return 'Los apellidos son obligatorios.';
  if (input.telefono.trim().isEmpty) return 'El teléfono es obligatorio.';
  if (!RegExp(r'^\d{10}$').hasMatch(input.telefono.trim().replaceAll(RegExp(r'\s'), ''))) {
    return 'El teléfono debe tener 10 dígitos.';
  }
  if (!isUteqEmail(input.email, domain: domain)) {
    return 'Usa tu correo institucional @$domain.';
  }
  if (!emailMatchesMatricula(input.email, input.matricula, domain: domain)) {
    return 'El correo debe coincidir con tu matrícula (ej. ${expectedUteqEmail(input.matricula, domain: domain)}).';
  }
  return validatePasswordStrength(input.password);
}

String? validateLogin(LoginInput input) {
  if (input.email.trim().isEmpty) return 'El correo es obligatorio.';
  if (input.password.isEmpty) return 'La contraseña es obligatoria.';
  return null;
}

String getAuthErrorMessage(String message) {
  final msg = message.trim();
  if (msg.isEmpty) return 'Error desconocido. Revisa Supabase y las variables en Railway.';
  if (msg.contains('Invalid login credentials')) return 'Correo o contraseña incorrectos.';
  if (msg.contains('invalid_credentials')) return 'Correo o contraseña incorrectos.';
  if (msg.contains('status code of 401')) return 'Correo o contraseña incorrectos.';
  if (msg.contains('Email not confirmed')) return 'Confirma tu correo antes de iniciar sesión.';
  if (msg.contains('User already registered') || msg.contains('already been registered')) {
    return 'Este correo ya está registrado.';
  }
  if (msg.contains('Database error saving new user')) {
    return 'Error en la base de datos. Ejecuta el SQL en Supabase (001_profiles.sql).';
  }
  if (msg.contains('duplicate key') ||
      msg.contains('profiles_matricula') ||
      msg.contains('profiles_email') ||
      msg.contains('ya registrado')) {
    return 'Esa matrícula o correo ya está registrado.';
  }
  if (msg.contains('Signups not allowed')) {
    return 'Registro desactivado en Supabase → Authentication → Providers → Email → Enable sign ups.';
  }
  if (msg.contains('Email rate limit')) {
    return 'Demasiados intentos de correo. La cuenta puede estar creada: intenta iniciar sesión.';
  }
  if (msg.contains('Falta SUPABASE_SERVICE_ROLE_KEY')) {
    return 'Falta configurar SUPABASE_SERVICE_ROLE_KEY en Railway (Settings → API → service_role).';
  }
  if (msg.contains('Failed to fetch') || RegExp(r'network request failed', caseSensitive: false).hasMatch(msg)) {
    return 'Sin conexión a Supabase. Revisa tu internet y SUPABASE_URL en mobile_flutter/.env (debe ser https://xxx.supabase.co).';
  }
  return msg;
}

String toAuthErrorMessage(
  Object? error, {
  String fallback = 'Error desconocido. Revisa Supabase y las variables en Railway.',
}) {
  if (error == null) return fallback;
  if (error is String) {
    final trimmed = error.trim();
    if (trimmed.isEmpty || trimmed == '{}' || trimmed == '[object Object]') return fallback;
    return getAuthErrorMessage(trimmed);
  }
  if (error is Exception) {
    final raw = error.toString().replaceFirst('Exception: ', '');
    return toAuthErrorMessage(raw, fallback: fallback);
  }
  if (error is Error) {
    final raw = error.toString().trim();
    if (raw.isEmpty) return fallback;
    return getAuthErrorMessage(raw);
  }
  if (error is Map) {
    final code = error['code']?.toString().trim();
    final status = int.tryParse(error['status']?.toString() ?? '');
    if (code == 'invalid_credentials') return 'Correo o contraseña incorrectos.';
    if (status == 401) return 'Correo o contraseña incorrectos.';
    if (status != null && status >= 500) {
      return 'El servidor no está disponible temporalmente. Intenta de nuevo en unos minutos.';
    }

    final message = error['message']?.toString().trim();
    if (message != null && message.isNotEmpty) return getAuthErrorMessage(message);

    final description = error['error_description']?.toString().trim();
    if (description != null && description.isNotEmpty) return getAuthErrorMessage(description);

    final nestedError = error['error'];
    if (nestedError != null) {
      final nested = toAuthErrorMessage(nestedError, fallback: '');
      if (nested.isNotEmpty) return nested;
    }

    final nestedData = error['data'];
    if (nestedData != null) {
      final nested = toAuthErrorMessage(nestedData, fallback: '');
      if (nested.isNotEmpty) return nested;
    }

    if (code != null && code.isNotEmpty) {
      return '$fallback (code: $code)';
    }
  }

  if (error is List && error.isNotEmpty) {
    final nested = toAuthErrorMessage(error.first, fallback: '');
    if (nested.isNotEmpty) return nested;
  }
  return fallback;
}
