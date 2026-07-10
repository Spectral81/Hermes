import 'package:flutter_dotenv/flutter_dotenv.dart';

class AppEnv {
  static bool _isPlaceholder(String value) {
    final v = value.toLowerCase();
    return v.contains('your-project') || v.contains('your-anon-key') || v == 'placeholder';
  }

  static String _read(String key, String dartDefine) {
    final fromDefine = dartDefine.trim();
    if (fromDefine.isNotEmpty && !_isPlaceholder(fromDefine)) return fromDefine;

    final fromDotEnv = dotenv.maybeGet(key)?.trim() ?? '';
    if (fromDotEnv.isNotEmpty && !_isPlaceholder(fromDotEnv)) return fromDotEnv;

    throw StateError('Missing or placeholder $key. Configure apps/mobile_flutter/.env or --dart-define.');
  }

  static String get supabaseUrl =>
      _read('SUPABASE_URL', const String.fromEnvironment('SUPABASE_URL'));

  static String get supabaseAnonKey =>
      _read('SUPABASE_ANON_KEY', const String.fromEnvironment('SUPABASE_ANON_KEY'));

  static String? get webApiUrl {
    final fromDefine = const String.fromEnvironment('WEB_API_URL').trim();
    if (fromDefine.isNotEmpty) return fromDefine.replaceAll(RegExp(r'/$'), '');

    final fromDotEnv = dotenv.maybeGet('WEB_API_URL')?.trim() ?? '';
    if (fromDotEnv.isNotEmpty) return fromDotEnv.replaceAll(RegExp(r'/$'), '');
    return null;
  }

  static String? _optional(String key, String dartDefine) {
    final fromDefine = dartDefine.trim();
    if (fromDefine.isNotEmpty && !_isPlaceholder(fromDefine)) return fromDefine;
    final fromDotEnv = dotenv.maybeGet(key)?.trim() ?? '';
    if (fromDotEnv.isNotEmpty && !_isPlaceholder(fromDotEnv)) return fromDotEnv;
    return null;
  }

  static String get firebaseApiKey =>
      _optional('FIREBASE_API_KEY', const String.fromEnvironment('FIREBASE_API_KEY')) ?? '';

  static String get firebaseAppId =>
      _optional('FIREBASE_APP_ID', const String.fromEnvironment('FIREBASE_APP_ID')) ?? '';

  static String get firebaseMessagingSenderId =>
      _optional('FIREBASE_MESSAGING_SENDER_ID', const String.fromEnvironment('FIREBASE_MESSAGING_SENDER_ID')) ?? '';

  static String get firebaseProjectId =>
      _optional('FIREBASE_PROJECT_ID', const String.fromEnvironment('FIREBASE_PROJECT_ID')) ?? '';

  static bool get isFirebaseConfigured =>
      firebaseApiKey.isNotEmpty &&
      firebaseAppId.isNotEmpty &&
      firebaseMessagingSenderId.isNotEmpty &&
      firebaseProjectId.isNotEmpty;
}
