import 'package:dio/dio.dart' hide Headers;
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/config/env.dart';
import '../../../domain/models.dart';

class NotificationsWebApi {
  NotificationsWebApi({required String baseUrl}) : _dio = Dio(BaseOptions(baseUrl: baseUrl));

  final Dio _dio;

  Map<String, String> _authHeaders() {
    final token = Supabase.instance.client.auth.currentSession?.accessToken;
    if (token == null) return {};
    return {'Authorization': 'Bearer $token'};
  }

  Future<void> dispatchIncidentCreated(Incident incident) async {
    await _dio.post(
      '/api/notifications/incident-created',
      data: {
        'incidentId': incident.id,
        'type': incidentTypeToWire(incident.type),
        'description': incident.description,
        'lat': incident.lat,
        'lng': incident.lng,
      },
      options: Options(
        contentType: 'application/json',
        headers: _authHeaders(),
      ),
    );
  }

  Future<void> dispatchIncidentVerified(Incident incident) async {
    await _dio.post(
      '/api/notifications/incident-verified',
      data: {
        'incidentId': incident.id,
        'type': incidentTypeToWire(incident.type),
        'description': incident.description,
        'lat': incident.lat,
        'lng': incident.lng,
      },
      options: Options(
        contentType: 'application/json',
        headers: _authHeaders(),
      ),
    );
  }
}

NotificationsWebApi? get notificationsWebApi {
  final base = AppEnv.webApiUrl;
  if (base == null) return null;
  return NotificationsWebApi(baseUrl: base);
}
