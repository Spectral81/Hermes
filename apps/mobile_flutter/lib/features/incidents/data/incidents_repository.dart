import 'package:dio/dio.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/config/env.dart';
import '../../../domain/models.dart';
import '../../../domain/validators.dart';
import 'incidents_web_api.dart';

class IncidentsRepository {
  IncidentsRepository({SupabaseClient? supabaseClient})
      : _supabase = supabaseClient ?? Supabase.instance.client,
        _api = AppEnv.webApiUrl != null ? IncidentsWebApi(baseUrl: AppEnv.webApiUrl!) : null;

  final SupabaseClient _supabase;
  final IncidentsWebApi? _api;

  Future<List<Incident>> fetchIncidents() async {
    final api = _api;
    if (api != null) {
      try {
        return await api.fetchIncidents();
      } on DioException catch (e) {
        throw Exception(toAuthErrorMessage(e.response?.data ?? e.message));
      }
    }

    final rpc = await _supabase.rpc('list_incidents');
    final list = (rpc as List).cast<dynamic>();
    return list.map((e) => Incident.fromJson(Map<String, dynamic>.from(e as Map))).toList();
  }

  Future<Incident> createIncident(CreateIncidentInput input) async {
    final api = _api;
    if (api != null) {
      try {
        return await api.createIncident(input);
      } on DioException catch (e) {
        throw Exception(toAuthErrorMessage(e.response?.data ?? e.message));
      }
    }

    final rpc = await _supabase.rpc('create_incident', params: {
      'p_type': incidentTypeToWire(input.type),
      'p_description': input.description,
      'p_lat': input.lat,
      'p_lng': input.lng,
      'p_category': infraCategoryToWire(input.category),
      'p_severity': severityToWire(input.severity),
    });
    return Incident.fromJson(Map<String, dynamic>.from(rpc as Map));
  }

  /// Listado para el panel de administración: incluye cerrados/rechazados
  /// (últimos 30 días). Usa el RPC directo de Supabase.
  Future<List<Incident>> fetchIncidentsForAdmin() async {
    final rpc = await _supabase.rpc('list_incidents_admin');
    final list = (rpc as List).cast<dynamic>();
    return list.map((e) => Incident.fromJson(Map<String, dynamic>.from(e as Map))).toList();
  }

  /// Cambia el estado de un incidente (solo roles autorizados en el backend).
  Future<Incident> setStatus(String incidentId, IncidentStatus status) async {
    final rpc = await _supabase.rpc('set_incident_status', params: {
      'p_incident_id': incidentId,
      'p_status': incidentStatusToWire(status),
    });
    if (rpc is List && rpc.isNotEmpty) {
      return Incident.fromJson(Map<String, dynamic>.from(rpc.first as Map));
    }
    return Incident.fromJson(Map<String, dynamic>.from(rpc as Map));
  }

  Future<({int likesCount, bool liked})> toggleLike(String incidentId) async {
    final api = _api;
    if (api != null) {
      try {
        return await api.toggleLike(incidentId);
      } on DioException catch (e) {
        throw Exception(toAuthErrorMessage(e.response?.data ?? e.message));
      }
    }

    final rpc = await _supabase.rpc('toggle_incident_like', params: {
      'p_incident_id': incidentId,
    });

    if (rpc is List && rpc.isNotEmpty) {
      final row = Map<String, dynamic>.from(rpc.first as Map);
      return (
        likesCount: (row['likes_count'] as num?)?.toInt() ?? 0,
        liked: row['liked'] == true,
      );
    }
    return (likesCount: 0, liked: false);
  }
}
