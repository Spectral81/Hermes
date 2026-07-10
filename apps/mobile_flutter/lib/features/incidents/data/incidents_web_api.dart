import 'package:dio/dio.dart' hide Headers;
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../domain/models.dart';

class IncidentsWebApi {
  IncidentsWebApi({required String baseUrl}) : _dio = Dio(BaseOptions(baseUrl: baseUrl));

  final Dio _dio;

  Map<String, String> _authHeaders() {
    final token = Supabase.instance.client.auth.currentSession?.accessToken;
    if (token == null) return {};
    return {'Authorization': 'Bearer $token'};
  }

  Options _authOptions({String? contentType}) => Options(
        contentType: contentType ?? 'application/json',
        headers: _authHeaders(),
      );

  Future<List<Incident>> fetchIncidents() async {
    final res = await _dio.get('/api/incidents');
    final list = (res.data as List).cast<dynamic>();
    return list.map((e) => Incident.fromJson(Map<String, dynamic>.from(e as Map))).toList();
  }

  Future<Incident> createIncident(CreateIncidentInput input) async {
    final res = await _dio.post(
      '/api/incidents',
      data: input.toJson(),
      options: _authOptions(),
    );
    return Incident.fromJson(Map<String, dynamic>.from(res.data as Map));
  }

  Future<({int likesCount, bool liked, bool verified, bool verifiedNow})> toggleLike(
    String incidentId,
  ) async {
    final res = await _dio.post(
      '/api/incidents/$incidentId/like',
      options: _authOptions(),
    );
    final data = Map<String, dynamic>.from(res.data as Map);
    return (
      likesCount: (data['likes_count'] as num?)?.toInt() ?? 0,
      liked: data['liked'] == true,
      verified: data['verified'] == true,
      verifiedNow: data['verified_now'] == true,
    );
  }
}
