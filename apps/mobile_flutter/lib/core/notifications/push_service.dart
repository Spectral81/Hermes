import 'dart:io';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../config/env.dart';
import '../firebase/firebase_options.dart';

@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  if (!AppEnv.isFirebaseConfigured) return;
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
}

class PushService {
  PushService._();
  static final PushService instance = PushService._();

  final _local = FlutterLocalNotificationsPlugin();
  GoRouter? _router;
  bool _initialized = false;
  String? _pendingNavigation;
  bool _navigationScheduled = false;

  Future<void> init(GoRouter router) async {
    if (_initialized) return;
    _router = router;

    if (!AppEnv.isFirebaseConfigured) {
      debugPrint('[push] Firebase no configurado — omitiendo FCM.');
      return;
    }

    await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
    FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);

    if (Platform.isAndroid) {
      const channel = AndroidNotificationChannel(
        'hermes_alerts',
        'Alertas HERMES',
        description: 'Notificaciones de reportes y validaciones',
        importance: Importance.high,
      );
      await _local
          .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
          ?.createNotificationChannel(channel);

      await _local.initialize(
        const InitializationSettings(
          android: AndroidInitializationSettings('@mipmap/ic_launcher'),
        ),
        onDidReceiveNotificationResponse: (details) {
          final payload = details.payload;
          if (payload != null && payload.isNotEmpty) {
            _queueNavigation(payload);
          }
        },
      );

      final launch = await _local.getNotificationAppLaunchDetails();
      if (launch?.didNotificationLaunchApp == true) {
        final payload = launch?.notificationResponse?.payload;
        if (payload != null && payload.isNotEmpty) {
          _queueNavigation(payload);
        }
      }
    }

    await FirebaseMessaging.instance.requestPermission(alert: true, badge: true, sound: true);

    FirebaseMessaging.onMessage.listen(_onForegroundMessage);
    FirebaseMessaging.onMessageOpenedApp.listen(_onMessageOpened);
    FirebaseMessaging.instance.onTokenRefresh.listen((t) => _upsertToken(t));

    Supabase.instance.client.auth.onAuthStateChange.listen((event) {
      if (event.session != null) {
        _registerCurrentToken();
        _tryNavigatePending();
      }
    });

    if (Supabase.instance.client.auth.currentSession != null) {
      await _registerCurrentToken();
    }

    final initial = await FirebaseMessaging.instance.getInitialMessage();
    if (initial != null) {
      _queueFromRemoteMessage(initial);
    }

    _initialized = true;
  }

  /// Llamar cuando MaterialApp.router ya está montado.
  void onAppReady() => _tryNavigatePending();

  Future<void> updateLocation(double lat, double lng) async {
    if (!AppEnv.isFirebaseConfigured) return;
    final token = await FirebaseMessaging.instance.getToken();
    if (token == null) return;
    await _upsertToken(token, lat: lat, lng: lng);
  }

  Future<void> _registerCurrentToken() async {
    final token = await FirebaseMessaging.instance.getToken();
    if (token == null) return;
    final coords = await _currentCoords();
    await _upsertToken(token, lat: coords?.lat, lng: coords?.lng);
  }

  Future<({double lat, double lng})?> _currentCoords() async {
    try {
      final perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) {
        final req = await Geolocator.requestPermission();
        if (req == LocationPermission.denied || req == LocationPermission.deniedForever) {
          return null;
        }
      }
      final pos = await Geolocator.getLastKnownPosition() ?? await Geolocator.getCurrentPosition();
      return (lat: pos.latitude, lng: pos.longitude);
    } catch (e) {
      debugPrint('[push] ubicación no disponible: $e');
      return null;
    }
  }

  Future<void> _upsertToken(String token, {double? lat, double? lng}) async {
    try {
      await Supabase.instance.client.rpc('upsert_device_token', params: {
        'p_token': token,
        'p_platform': Platform.isIOS ? 'ios' : 'android',
        'p_lat': lat,
        'p_lng': lng,
      });
    } catch (e) {
      debugPrint('[push] upsert_device_token: $e');
    }
  }

  void _onForegroundMessage(RemoteMessage message) {
    final notification = message.notification;
    if (notification == null) return;

    final incidentId = message.data['incident_id'] ?? '';
    final action = message.data['action'] ?? 'validate';

    _local.show(
      notification.hashCode,
      notification.title,
      notification.body,
      const NotificationDetails(
        android: AndroidNotificationDetails(
          'hermes_alerts',
          'Alertas HERMES',
          importance: Importance.high,
          priority: Priority.high,
        ),
      ),
      payload: incidentId.isNotEmpty ? '$action:$incidentId' : null,
    );
  }

  void _onMessageOpened(RemoteMessage message) => _queueFromRemoteMessage(message);

  void _queueFromRemoteMessage(RemoteMessage message) {
    final incidentId = message.data['incident_id'];
    final action = message.data['action'] ?? 'validate';
    if (incidentId != null && incidentId.isNotEmpty) {
      _queueNavigation('$action:$incidentId');
    }
  }

  void _queueNavigation(String payloadOrId, {String? action}) {
    if (action != null && !payloadOrId.contains(':')) {
      _pendingNavigation = '$action:$payloadOrId';
    } else {
      _pendingNavigation = payloadOrId;
    }
    _tryNavigatePending();
  }

  void _tryNavigatePending() {
    if (_pendingNavigation == null || _navigationScheduled) return;
    _navigationScheduled = true;

    WidgetsBinding.instance.addPostFrameCallback((_) async {
      _navigationScheduled = false;
      await Future<void>.delayed(const Duration(milliseconds: 350));

      final pending = _pendingNavigation;
      if (pending == null) return;

      final router = _router;
      if (router == null) return;

      if (Supabase.instance.client.auth.currentSession == null) {
        debugPrint('[push] sesión no lista — navegación pendiente');
        return;
      }

      final ok = _navigateToIncident(pending);
      if (ok) {
        _pendingNavigation = null;
      }
    });
  }

  bool _navigateToIncident(String payloadOrId) {
    String incidentId = payloadOrId;
    String resolvedAction = 'validate';

    if (payloadOrId.contains(':')) {
      final parts = payloadOrId.split(':');
      if (parts.length >= 2) {
        resolvedAction = parts[0];
        incidentId = parts.sublist(1).join(':');
      }
    }

    final router = _router;
    if (router == null || incidentId.isEmpty) return false;

    // validate → pantalla de confirmar; verified u otros → detalle.
    final path = resolvedAction == 'validate'
        ? '/app/home/validate/$incidentId'
        : '/app/home/alert/$incidentId';

    try {
      // go() asegura la ruta en el shell activo (push fallaba con router duplicado).
      router.go(path);
      debugPrint('[push] navegando a $path');
      return true;
    } catch (e) {
      debugPrint('[push] error al navegar: $e');
      return false;
    }
  }
}
