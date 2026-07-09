import 'package:flutter/material.dart';

import 'core/navigation/app_router.dart';
import 'core/theme/app_theme.dart';

class HermesFlutterApp extends StatelessWidget {
  const HermesFlutterApp({super.key});

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
