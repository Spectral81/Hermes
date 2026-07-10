import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';

import '../config/env.dart';

/// Configuración Firebase desde .env / --dart-define.
/// Ejecuta `flutterfire configure` o completa las variables en .env.
class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      throw UnsupportedError('Firebase web no configurado para HERMES.');
    }
    return FirebaseOptions(
      apiKey: AppEnv.firebaseApiKey,
      appId: AppEnv.firebaseAppId,
      messagingSenderId: AppEnv.firebaseMessagingSenderId,
      projectId: AppEnv.firebaseProjectId,
    );
  }
}
