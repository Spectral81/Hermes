import 'package:dio/dio.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Obtiene un access token fresco para llamar a la API web (Railway).
Future<String> requireAccessToken() async {
  final auth = Supabase.instance.client.auth;
  var session = auth.currentSession;

  if (session == null) {
    throw Exception('Sesión expirada. Cierra sesión y vuelve a entrar.');
  }

  final expiresAt = session.expiresAt;
  final nowSec = DateTime.now().millisecondsSinceEpoch ~/ 1000;
  final needsRefresh = expiresAt == null || expiresAt <= nowSec + 60;

  if (needsRefresh) {
    final refreshed = await auth.refreshSession();
    session = refreshed.session ?? auth.currentSession;
  }

  final token = session?.accessToken;
  if (token == null || token.isEmpty) {
    throw Exception('No hay token de acceso. Vuelve a iniciar sesión.');
  }
  return token;
}

Future<Map<String, String>> authHeaders() async {
  final token = await requireAccessToken();
  return {'Authorization': 'Bearer $token'};
}

String dioErrorMessage(Object error, {String fallback = 'Error de red'}) {
  if (error is DioException) {
    final data = error.response?.data;
    if (data is Map && data['error'] != null) {
      return data['error'].toString();
    }
    final code = error.response?.statusCode;
    if (code == 401) {
      return 'No autenticado (401). Vuelve a iniciar sesión.';
    }
    if (code == 403) {
      return 'No tienes permiso para esta acción.';
    }
    if (code != null) {
      return 'Error del servidor ($code).';
    }
    return error.message ?? fallback;
  }
  return error.toString().replaceFirst('Exception: ', '');
}
