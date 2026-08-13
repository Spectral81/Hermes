import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../features/admin/presentation/admin_dashboard_page.dart';
import '../../features/auth/presentation/login_page.dart';
import '../../features/auth/presentation/register_page.dart';
import '../../features/auth/presentation/verify_email_page.dart';
import '../../features/auth/presentation/welcome_page.dart';
import '../../features/events/presentation/events_page.dart';
import '../../features/incidents/presentation/alert_detail_page.dart';
import '../../features/incidents/presentation/alerts_page.dart';
import '../../features/incidents/presentation/home_page.dart';
import '../../features/incidents/presentation/reports_chat_page.dart';
import '../../features/incidents/presentation/validate_report_page.dart';
import '../../features/legal/presentation/privacy_policy_page.dart';
import '../../features/profile/presentation/profile_page.dart';
import '../auth/auth_state_controller.dart';

final AuthStateController _authState = AuthStateController();

/// Una sola instancia: PushService y MaterialApp deben compartir el mismo router.
final GoRouter appRouter = GoRouter(
  refreshListenable: _authState,
  initialLocation: '/auth',
  redirect: (context, state) {
    final path = state.uri.path;
    if (path == '/privacidad') return null;
    final atAuth = path.startsWith('/auth');
    final logged = _authState.isAuthenticated;
    if (!logged && !atAuth) return '/auth';
    if (logged && atAuth) return '/app/home';
    return null;
  },
  routes: [
    GoRoute(
      path: '/privacidad',
      builder: (_, __) => const PrivacyPolicyPage(),
    ),
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
            GoRoute(path: '/app/events', builder: (_, __) => const EventsPage()),
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
    GoRoute(
      path: '/app/chat',
      builder: (_, __) => const ReportsChatPage(),
    ),
  ],
);

class AppShell extends StatelessWidget {
  const AppShell({super.key, required this.navigationShell});

  final StatefulNavigationShell navigationShell;

  static const _items = [
    _NavItem(
      label: 'Mapa',
      icon: Icons.map_outlined,
      activeIcon: Icons.map_rounded,
      color: Color(0xFF2563EB),
    ),
    _NavItem(
      label: 'Alertas',
      icon: Icons.notifications_outlined,
      activeIcon: Icons.notifications_active_rounded,
      color: Color(0xFFEF4444),
    ),
    _NavItem(
      label: 'Eventos',
      icon: Icons.celebration_outlined,
      activeIcon: Icons.celebration_rounded,
      color: Color(0xFFF59E0B),
      asset: 'assets/markers/kermes-icon.png',
    ),
    _NavItem(
      label: 'Perfil',
      icon: Icons.person_outline_rounded,
      activeIcon: Icons.person_rounded,
      color: Color(0xFF8B5CF6),
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final idx = navigationShell.currentIndex;
    final bottom = MediaQuery.paddingOf(context).bottom;

    return Scaffold(
      body: navigationShell,
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(22)),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF0F172A).withValues(alpha: 0.08),
              blurRadius: 24,
              offset: const Offset(0, -6),
            ),
          ],
        ),
        child: SafeArea(
          top: false,
          child: Padding(
            padding: EdgeInsets.fromLTRB(10, 8, 10, bottom > 0 ? 4 : 10),
            child: Row(
              children: [
                for (var i = 0; i < _items.length; i++)
                  Expanded(
                    child: _NavButton(
                      item: _items[i],
                      selected: idx == i,
                      onTap: () => navigationShell.goBranch(i),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _NavItem {
  const _NavItem({
    required this.label,
    required this.icon,
    required this.activeIcon,
    required this.color,
    this.asset,
  });

  final String label;
  final IconData icon;
  final IconData activeIcon;
  final Color color;
  final String? asset;
}

class _NavButton extends StatelessWidget {
  const _NavButton({
    required this.item,
    required this.selected,
    required this.onTap,
  });

  final _NavItem item;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 220),
          curve: Curves.easeOutCubic,
          margin: const EdgeInsets.symmetric(horizontal: 2),
          padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
          decoration: BoxDecoration(
            color: selected ? item.color.withValues(alpha: 0.12) : Colors.transparent,
            borderRadius: BorderRadius.circular(16),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              AnimatedContainer(
                duration: const Duration(milliseconds: 220),
                width: selected ? 42 : 36,
                height: selected ? 42 : 36,
                decoration: BoxDecoration(
                  color: selected ? item.color : const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(14),
                  boxShadow: selected
                      ? [
                          BoxShadow(
                            color: item.color.withValues(alpha: 0.35),
                            blurRadius: 10,
                            offset: const Offset(0, 4),
                          ),
                        ]
                      : null,
                ),
                alignment: Alignment.center,
                child: item.asset != null
                    ? Padding(
                        padding: const EdgeInsets.all(7),
                        child: Image.asset(
                          item.asset!,
                          fit: BoxFit.contain,
                          errorBuilder: (_, __, ___) => Icon(
                            selected ? item.activeIcon : item.icon,
                            size: 20,
                            color: selected ? Colors.white : const Color(0xFF64748B),
                          ),
                        ),
                      )
                    : Icon(
                        selected ? item.activeIcon : item.icon,
                        size: 20,
                        color: selected ? Colors.white : const Color(0xFF64748B),
                      ),
              ),
              const SizedBox(height: 5),
              Text(
                item.label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: selected ? FontWeight.w800 : FontWeight.w600,
                  color: selected ? item.color : const Color(0xFF94A3B8),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
