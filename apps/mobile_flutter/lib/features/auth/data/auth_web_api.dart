import 'package:dio/dio.dart';

class AuthWebApi {
  AuthWebApi({required this.baseUrl}) : _dio = Dio(BaseOptions(baseUrl: baseUrl));

  final String baseUrl;
  final Dio _dio;

  Future<Map<String, dynamic>> login(String email, String password) async {
    final res = await _dio.post(
      '/api/auth/login-mobile',
      data: {'email': email.trim().toLowerCase(), 'password': password},
      options: Options(contentType: Headers.jsonContentType),
    );
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<Map<String, dynamic>> register(Map<String, dynamic> payload) async {
    final res = await _dio.post(
      '/api/auth/register',
      data: payload,
      options: Options(contentType: Headers.jsonContentType),
    );
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<Map<String, dynamic>> confirmRegistration(String userId) async {
    final res = await _dio.post(
      '/api/auth/confirm-registration',
      data: {'userId': userId},
      options: Options(contentType: Headers.jsonContentType),
    );
    return Map<String, dynamic>.from(res.data as Map);
  }
}
