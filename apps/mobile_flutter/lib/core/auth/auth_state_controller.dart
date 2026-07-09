import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class AuthStateController extends ChangeNotifier {
  AuthStateController() {
    _session = Supabase.instance.client.auth.currentSession;
    _sub = Supabase.instance.client.auth.onAuthStateChange.listen((event) {
      _session = event.session;
      notifyListeners();
    });
  }

  Session? _session;
  late final StreamSubscription<AuthState> _sub;

  Session? get session => _session;
  bool get isAuthenticated => _session != null;

  @override
  void dispose() {
    _sub.cancel();
    super.dispose();
  }
}
