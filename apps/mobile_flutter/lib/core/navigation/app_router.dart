import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../features/admin/presentation/admin_dashboard_page.dart';
import '../../features/auth/presentation/login_page.dart';
import '../../features/auth/presentation/register_page.dart';
import '../../features/auth/presentation/verify_email_page.dart';
import '../../features/auth/presentation/welcome_page.dart';
import '../../features/incidents/presentation/alert_detail_page.dart';
import '../../features/incidents/presentation/alerts_page.dart';
import '../../features/incidents/presentation/home_page.dart';
import '../../features/incidents/presentation/validate_report_page.dart';
import '../../features/profile/presentation/profile_page.dart';
import '../auth/auth_state_controller.dart';

final AuthStateController _authState = AuthStateController();

GoRouter get appRouter => GoRouter(
      refreshListenable: _authState,
      initialLocation: '/auth',
      redirect: (context, state) {
        final atAuth = state.uri.path.startsWith('/auth');
        final logged = _authState.isAuthenticated;
        if (!logged && !atAuth) return '/auth';
        if (logged && atAuth) return '/app/home';
        return null;
      },
      routes: [
        GoRoute(
          path: '/auth',
          builder: (_, __) => const WelcomePage(),
          routes: [
            GoRoute(path: 'login', builder: (_, __) => const LoginPage()),
            GoRoute(path: 'register', builder: (_, __) => const RegisterPage()),
            GoRoute(path: 'verify', builder: (_, __) => const VerifyEmailPage()),
          ],
        ),
        StatefulShellRoute.indexedStack(
          builder: (context, state, shell) => AppShell(navigationShell: shell),
          branches: [
            StatefulShellBranch(
              routes: [
                GoRoute(
                  path: '/app/home',
                  builder: (_, __) => const HomePage(),
                  routes: [
                    GoRoute(
                      path: 'alert/:id',
                      builder: (context, state) =>
                          AlertDetailPage(incidentId: state.pathParameters['id']!),
                    ),
                    GoRoute(
                      path: 'validate/:id',
                      builder: (context, state) =>
                          ValidateReportPage(incidentId: state.pathParameters['id']!),
                    ),
                  ],
                ),
              ],
            ),
            StatefulShellBranch(
              routes: [
                GoRoute(path: '/app/alerts', builder: (_, __) => const AlertsPage()),
              ],
            ),
            StatefulShellBranch(
              routes: [
                GoRoute(path: '/app/profile', builder: (_, __) => const ProfilePage()),
              ],
            ),
          ],
        ),
        GoRoute(
          path: '/app/dashboard',
          builder: (_, __) => const AdminDashboardPage(),
        ),
      ],
    );

class AppShell extends StatelessWidget {
  const AppShell({super.key, required this.navigationShell});

  final StatefulNavigationShell navigationShell;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: navigationShell,
      bottomNavigationBar: NavigationBar(
        selectedIndex: navigationShell.currentIndex,
        onDestinationSelected: (idx) => navigationShell.goBranch(idx),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.map_outlined), label: 'Mapa'),
          NavigationDestination(icon: Icon(Icons.notifications_outlined), label: 'Alertas'),
          NavigationDestination(icon: Icon(Icons.person_outline), label: 'Perfil'),
        ],
      ),
    );
  }
}
