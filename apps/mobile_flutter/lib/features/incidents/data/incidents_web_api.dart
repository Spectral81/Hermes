import 'package:dio/dio.dart';

import '../../../domain/models.dart';

class IncidentsWebApi {
  IncidentsWebApi({required String baseUrl}) : _dio = Dio(BaseOptions(baseUrl: baseUrl));

  final Dio _dio;

  Future<List<Incident>> fetchIncidents() async {
    final res = await _dio.get('/api/incidents');
    final list = (res.data as List).cast<dynamic>();
    return list.map((e) => Incident.fromJson(Map<String, dynamic>.from(e as Map))).toList();
    }

  Future<Incident> createIncident(CreateIncidentInput input) async {
    final res = await _dio.post(
      '/api/incidents',
      data: input.toJson(),
      options: Options(contentType: Headers.jsonContentType),
    );
    return Incident.fromJson(Map<String, dynamic>.from(res.data as Map));
  }

  Future<({int likesCount, bool liked})> toggleLike(String incidentId) async {
    final res = await _dio.post('/api/incidents/$incidentId/like');
    final data = Map<String, dynamic>.from(res.data as Map);
    return (
      likesCount: (data['likes_count'] as num?)?.toInt() ?? 0,
      liked: data['liked'] == true,
    );
  }
}
