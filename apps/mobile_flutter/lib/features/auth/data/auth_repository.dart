import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/config/env.dart';
import '../../../domain/models.dart';
import '../../../domain/validators.dart';
import 'auth_web_api.dart';

class AuthRepository {
  AuthRepository({SupabaseClient? supabaseClient})
      : _supabase = supabaseClient ?? Supabase.instance.client,
        _api = AppEnv.webApiUrl != null ? AuthWebApi(baseUrl: AppEnv.webApiUrl!) : null;

  final SupabaseClient _supabase;
  final AuthWebApi? _api;

  String? _projectRefFromSupabaseUrl(String url) {
    final host = Uri.tryParse(url)?.host ?? '';
    if (host.isEmpty) return null;
    final first = host.split('.').first;
    return first.isEmpty ? null : first;
  }

  String? _projectRefFromAccessToken(String token) {
    try {
      final parts = token.split('.');
      if (parts.length < 2) return null;
      var payload = parts[1].replaceAll('-', '+').replaceAll('_', '/');
      while (payload.length % 4 != 0) {
        payload += '=';
      }
      final decoded = utf8.decode(base64Decode(payload));
      final map = jsonDecode(decoded);
      if (map is! Map<String, dynamic>) return null;
      final iss = map['iss']?.toString() ?? '';
      if (iss.isEmpty) return null;
      final host = Uri.tryParse(iss)?.host ?? '';
      if (host.isEmpty) return null;
      final first = host.split('.').first;
      return first.isEmpty ? null : first;
    } catch (_) {
      return null;
    }
  }

  Future<void> login(LoginInput input) async {
    final webApi = _api;
    if (webApi != null) {
      try {
        final result = await webApi.login(input.email, input.password);
        final accessToken = result['access_token']?.toString();
        final refreshToken = result['refresh_token']?.toString();
        if (accessToken == null || refreshToken == null) {
          throw Exception('Respuesta inválida del servidor.');
        }
        final envRef = _projectRefFromSupabaseUrl(AppEnv.supabaseUrl);
        final tokenRef = _projectRefFromAccessToken(accessToken);
        if (envRef != null && tokenRef != null && envRef != tokenRef) {
          throw Exception(
            'Conflicto de configuración: WEB_API_URL usa Supabase "$tokenRef" y la app móvil usa "$envRef". '
            'Actualiza SUPABASE_URL/SUPABASE_ANON_KEY en apps/mobile_flutter/.env para que coincidan con Railway.',
          );
        }
        final auth = _supabase.auth as dynamic;
        try {
          // Compatibility across supabase/gotrue versions:
          // some versions expect (accessToken, refreshToken), others only (refreshToken).
          try {
            await Function.apply(auth.setSession as Function, [accessToken, refreshToken]);
          } on NoSuchMethodError {
            await Function.apply(auth.setSession as Function, [refreshToken]);
          }
        } on AuthException catch (e) {
          throw Exception(
            toAuthErrorMessage({
              'message': e.message,
              'code': e.statusCode ?? 'set_session_failed',
            }),
          );
        } on NoSuchMethodError catch (e) {
          throw Exception('Error al guardar sesión local en la app: ${e.toString()}');
        }
        return;
      } on DioException catch (e) {
        final payload = e.response?.data;
        final status = e.response?.statusCode;
        if (status == 401) {
          throw Exception('Correo o contraseña incorrectos.');
        }
        if (status != null && status >= 500) {
          throw Exception('El servidor de autenticación no está disponible. Intenta de nuevo en unos minutos.');
        }
        throw Exception(
          toAuthErrorMessage({
            'error': payload,
            'message': e.message,
            'code': status?.toString(),
            'status': status,
          }),
        );
      }
    }

    try {
      final res = await _supabase.auth
          .signInWithPassword(email: input.email.trim().toLowerCase(), password: input.password);
      if (res.user == null) {
        throw Exception('No se pudo iniciar sesión.');
      }
    } on AuthException catch (e) {
      throw Exception(
        toAuthErrorMessage({
          'message': e.message,
          'code': e.statusCode,
        }),
      );
    }
  }

  Future<void> register(RegisterInput input) async {
    final webApi = _api;
    if (webApi != null) {
      try {
        final result = await webApi.register({
          'matricula': input.matricula.trim(),
          'nombre': input.nombre.trim(),
          'apellidos': input.apellidos.trim(),
          'telefono': input.telefono.trim(),
          'email': input.email.trim().toLowerCase(),
          'password': input.password,
        });

        if (result['ok'] != true) {
          throw Exception(toAuthErrorMessage(result['error'] ?? result));
        }

        await _supabase.auth.signInWithPassword(
          email: input.email.trim().toLowerCase(),
          password: input.password,
        );
        return;
      } on DioException catch (e) {
        final payload = e.response?.data;
        final status = e.response?.statusCode;
        if (status == 409) {
          throw Exception('Esa matrícula o correo ya está registrado.');
        }
        if (status != null && status >= 500) {
          throw Exception('El servidor de registro no está disponible. Intenta de nuevo en unos minutos.');
        }
        throw Exception(
          toAuthErrorMessage({
            'error': payload,
            'message': e.message,
            'code': status?.toString(),
            'status': status,
          }),
        );
      }
    }

    final signUp = await _supabase.auth.signUp(
      email: input.email.trim().toLowerCase(),
      password: input.password,
      data: {
        'matricula': input.matricula.trim(),
        'nombre': input.nombre.trim(),
        'apellidos': input.apellidos.trim(),
        'telefono': input.telefono.trim(),
      },
    );

    if (signUp.user == null) {
      throw Exception('No se pudo crear la cuenta.');
    }

    final api = _api;
    if (api != null && signUp.user?.id != null) {
      final userId = signUp.user!.id;
      try {
        await api.confirmRegistration(userId);
      } catch (_) {
        // optional
      }
    }

    await _supabase.auth.signInWithPassword(
      email: input.email.trim().toLowerCase(),
      password: input.password,
    );
  }

  Future<void> logout() => _supabase.auth.signOut();
}
