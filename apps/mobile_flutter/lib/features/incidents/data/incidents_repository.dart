import 'package:dio/dio.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/config/env.dart';
import '../../../domain/models.dart';
import '../../../domain/validators.dart';
import 'incidents_web_api.dart';
import '../../notifications/data/notifications_web_api.dart';

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
    Incident created;
    if (api != null) {
      try {
        created = await api.createIncident(input);
      } on DioException catch (e) {
        throw Exception(toAuthErrorMessage(e.response?.data ?? e.message));
      }
      // Push nearby ya lo dispara el servidor en POST /api/incidents.
      return created;
    }

    final rpc = await _supabase.rpc('create_incident', params: {
      'p_type': incidentTypeToWire(input.type),
      'p_description': input.description,
      'p_lat': input.lat,
      'p_lng': input.lng,
      'p_category': infraCategoryToWire(input.category),
      'p_severity': severityToWire(input.severity),
    });
    created = Incident.fromJson(Map<String, dynamic>.from(rpc as Map));

    // Dispara push cercano vía Railway (robo/accidente).
    final notifyApi = notificationsWebApi;
    if (notifyApi != null &&
        (input.type == IncidentType.robo || input.type == IncidentType.accidente)) {
      try {
        await notifyApi.dispatchIncidentCreated(created);
      } catch (_) {
        // No bloquea la creación del reporte.
      }
    }

    return created;
  }

  Future<List<Incident>> fetchIncidentsForAdmin() async {
    final rpc = await _supabase.rpc('list_incidents_admin');
    final list = (rpc as List).cast<dynamic>();
    return list.map((e) => Incident.fromJson(Map<String, dynamic>.from(e as Map))).toList();
  }

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

  Future<({int likesCount, bool liked, bool verified, bool verifiedNow})> toggleLike(
    String incidentId,
  ) async {
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

    ({int likesCount, bool liked, bool verified, bool verifiedNow}) result;
    if (rpc is List && rpc.isNotEmpty) {
      final row = Map<String, dynamic>.from(rpc.first as Map);
      result = (
        likesCount: (row['likes_count'] as num?)?.toInt() ?? 0,
        liked: row['liked'] == true,
        verified: row['verified'] == true,
        verifiedNow: row['verified_now'] == true,
      );
    } else {
      result = (likesCount: 0, liked: false, verified: false, verifiedNow: false);
    }

    if (result.verifiedNow) {
      final incidents = await fetchIncidents();
      Incident? found;
      for (final inc in incidents) {
        if (inc.id == incidentId) {
          found = inc;
          break;
        }
      }
      final notifyApi = notificationsWebApi;
      if (found != null && notifyApi != null) {
        try {
          await notifyApi.dispatchIncidentVerified(found);
        } catch (_) {}
      }
    }

    return result;
  }
}
