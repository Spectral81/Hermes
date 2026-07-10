import 'package:flutter/material.dart';

import 'core/navigation/app_router.dart';
import 'core/notifications/push_service.dart';
import 'core/theme/app_theme.dart';

class HermesFlutterApp extends StatefulWidget {
  const HermesFlutterApp({super.key});

  @override
  State<HermesFlutterApp> createState() => _HermesFlutterAppState();
}

class _HermesFlutterAppState extends State<HermesFlutterApp> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      PushService.instance.onAppReady();
    });
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'HERMES UTEQ',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      routerConfig: appRouter,
    );
  }
}
