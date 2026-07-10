import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/di/repositories.dart';
import '../../../domain/constants.dart';
import '../../../domain/models.dart';

class ProfilePage extends StatefulWidget {
  const ProfilePage({super.key});

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

const Color _kBg = Color(0xFFF8FAFC);
const Color _kText = Color(0xFF0F172A);
const Color _kMuted = Color(0xFF64748B);
const Color _kBorder = Color(0xFFE5E7EB);
const Color _kBlue = Color(0xFF2563EB);

const List<String> _months = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

class _EventItem {
  const _EventItem({
    required this.month,
    required this.day,
    required this.title,
    required this.subtitle,
    required this.color,
  });
  final String month;
  final String day;
  final String title;
  final String subtitle;
  final Color color;
}

const List<_EventItem> _events = [
  _EventItem(
    month: 'MAY',
    day: '20',
    title: 'Kermés UTEQ 2026',
    subtitle: 'Feria de comida y emprendimientos',
    color: Color(0xFF8B5CF6),
  ),
];

const Map<IncidentType, IconData> _typeIcons = {
  IncidentType.robo: Icons.warning_amber_rounded,
  IncidentType.accidente: Icons.add_circle_outline,
  IncidentType.infraestructura: Icons.bolt,
  IncidentType.panico: Icons.sos,
};

class _ProfilePageState extends State<ProfilePage> {
  UserRole _role = UserRole.estudiante;
  Map<String, dynamic>? _profile;
  List<Incident> _incidents = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final role = await profileRepository.fetchMyRole();
      if (mounted) setState(() => _role = role);
    } catch (_) {}

    try {
      final profile = await profileRepository.fetchMyProfile();
      if (mounted) setState(() => _profile = profile);
    } catch (_) {}

    try {
      final incidents = await incidentsRepository.fetchIncidents();
      if (mounted) setState(() => _incidents = incidents);
    } catch (_) {}

    if (mounted) setState(() => _loading = false);
  }

  String _displayName(User? user) {
    final nombre = (_profile?['nombre'] ?? '').toString().trim();
    final apellidos = (_profile?['apellidos'] ?? '').toString().trim();
    final full = [nombre, apellidos].where((s) => s.isNotEmpty).join(' ');
    if (full.isNotEmpty) return full;
    return user?.email?.split('@').first ?? 'Estudiante';
  }

  String _initials(String name) {
    final parts = name.trim().split(RegExp(r'\s+')).where((s) => s.isNotEmpty).toList();
    if (parts.isEmpty) return '?';
    if (parts.length == 1) return parts.first.substring(0, 1).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  String _formatDate(String iso) {
    final d = DateTime.tryParse(iso)?.toLocal();
    if (d == null) return '';
    return '${d.day} ${_months[d.month - 1]}';
  }

  @override
  Widget build(BuildContext context) {
    final user = Supabase.instance.client.auth.currentUser;

    if (_loading) {
      return const Scaffold(
        backgroundColor: _kBg,
        body: Center(child: CircularProgressIndicator()),
      );
    }

    final name = _displayName(user);
    final mine = _incidents.where((i) => user != null && i.createdBy == user.id).toList()
      ..sort((a, b) => b.createdAt.compareTo(a.createdAt));

    final totalReports = mine.length;
    final verified = mine.where((i) => i.likesCount >= incidentValidationTarget).length;
    final validations = mine.fold<int>(0, (sum, i) => sum + i.likesCount);
    final points = totalReports * 10 + validations * 5;

    return Scaffold(
      backgroundColor: _kBg,
      body: ListView(
        padding: EdgeInsets.zero,
        children: [
          _header(name, user),
          const SizedBox(height: 14),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _statsRow(totalReports, verified, validations, points),
                if (isPrivilegedRole(_role)) ...[
                  const SizedBox(height: 18),
                  FilledButton.icon(
                    style: FilledButton.styleFrom(
                      backgroundColor: _kBlue,
                      minimumSize: const Size.fromHeight(52),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    onPressed: () => context.push('/app/dashboard'),
                    icon: const Icon(Icons.dashboard_customize_outlined),
                    label: const Text('Abrir panel de gestión',
                        style: TextStyle(fontWeight: FontWeight.w700)),
                  ),
                ],
                const SizedBox(height: 24),
                _sectionHeader('Mis reportes', action: 'Ver todos →', onAction: () {
                  context.go('/app/alerts');
                }),
                const SizedBox(height: 12),
                if (mine.isEmpty)
                  _emptyReports()
                else
                  ...mine.take(6).map(_reportCard),
                const SizedBox(height: 24),
                _sectionHeader('Próximos eventos'),
                const SizedBox(height: 12),
                ..._events.map(_eventCard),
                const SizedBox(height: 28),
                OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size.fromHeight(50),
                    foregroundColor: const Color(0xFFDC2626),
                    side: const BorderSide(color: Color(0xFFFecaca)),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  onPressed: () => Supabase.instance.client.auth.signOut(),
                  icon: const Icon(Icons.logout),
                  label: const Text('Cerrar sesión',
                      style: TextStyle(fontWeight: FontWeight.w700)),
                ),
                const SizedBox(height: 24),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _header(String name, User? user) {
    final subtitle = _profile?['matricula']?.toString().isNotEmpty == true
        ? '${_profile?['matricula']} · ${roleLabels[_role]}'
        : (user?.email ?? roleLabels[_role]!);
    return Column(
      children: [
        SizedBox(
          height: 198,
          child: Stack(
            clipBehavior: Clip.none,
            children: [
              Container(
                height: 150,
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [Color(0xFF3B82F6), Color(0xFF1D4ED8)],
                  ),
                  borderRadius: BorderRadius.vertical(bottom: Radius.circular(28)),
                ),
                child: SafeArea(
                  bottom: false,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        _circleButton(Icons.arrow_back, () => context.go('/app/home')),
                        _menuButton(),
                      ],
                    ),
                  ),
                ),
              ),
              Positioned(
                top: 102,
                left: 0,
                right: 0,
                child: Center(
                  child: Container(
                    width: 96,
                    height: 96,
                    decoration: BoxDecoration(
                      color: const Color(0xFFEC4899),
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white, width: 4),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.15),
                          blurRadius: 12,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      _initials(name),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 32,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Text(
          name,
          style: const TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w800,
            color: _kText,
          ),
        ),
        const SizedBox(height: 3),
        Text(
          subtitle,
          style: const TextStyle(fontSize: 13, color: _kMuted),
        ),
      ],
    );
  }

  Widget _circleButton(IconData icon, VoidCallback onTap) {
    return Material(
      color: Colors.white.withValues(alpha: 0.22),
      shape: const CircleBorder(),
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(10),
          child: Icon(icon, color: Colors.white, size: 22),
        ),
      ),
    );
  }

  Widget _menuButton() {
    return Material(
      color: Colors.white.withValues(alpha: 0.22),
      shape: const CircleBorder(),
      child: PopupMenuButton<String>(
        icon: const Icon(Icons.menu, color: Colors.white, size: 22),
        onSelected: (value) {
          if (value == 'dashboard') {
            context.push('/app/dashboard');
          } else if (value == 'logout') {
            Supabase.instance.client.auth.signOut();
          }
        },
        itemBuilder: (context) => [
          if (isPrivilegedRole(_role))
            const PopupMenuItem(value: 'dashboard', child: Text('Panel de gestión')),
          const PopupMenuItem(value: 'logout', child: Text('Cerrar sesión')),
        ],
      ),
    );
  }

  Widget _statsRow(int reportes, int verif, int validac, int puntos) {
    return Row(
      children: [
        _statCard('$reportes', 'Reportes', _kBlue),
        const SizedBox(width: 10),
        _statCard('$verif', 'Verif.', const Color(0xFF10B981)),
        const SizedBox(width: 10),
        _statCard('$validac', 'Validac.', const Color(0xFF8B5CF6)),
        const SizedBox(width: 10),
        _statCard('$puntos', 'Puntos', const Color(0xFFF59E0B)),
      ],
    );
  }

  Widget _statCard(String value, String label, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 6),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: _kBorder),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.03),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          children: [
            Text(
              value,
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                color: color,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: const TextStyle(fontSize: 11, color: _kMuted, fontWeight: FontWeight.w600),
            ),
          ],
        ),
      ),
    );
  }

  Widget _sectionHeader(String title, {String? action, VoidCallback? onAction}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          title,
          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: _kText),
        ),
        if (action != null)
          GestureDetector(
            onTap: onAction,
            child: Text(
              action,
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: _kBlue),
            ),
          ),
      ],
    );
  }

  Widget _reportCard(Incident i) {
    final color = incidentColors[i.type] ?? _kBlue;
    final title = incidentLabels[i.type] ?? 'Reporte';
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: _kBorder),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: IntrinsicHeight(
        child: InkWell(
          onTap: () => context.push('/app/home/alert/${i.id}'),
          child: Row(
            children: [
              Container(width: 5, color: color),
              const SizedBox(width: 12),
              Container(
                margin: const EdgeInsets.symmetric(vertical: 12),
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(_typeIcons[i.type], color: color, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: _kText,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      _formatDate(i.createdAt),
                      style: const TextStyle(fontSize: 12, color: _kMuted),
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.only(right: 12),
                child: _statusChip(i.status),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _statusChip(IncidentStatus status) {
    final color = statusColors[status] ?? _kMuted;
    final label = statusLabels[status] ?? 'Activo';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 7,
            height: 7,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          ),
          const SizedBox(width: 6),
          Text(
            label,
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: color),
          ),
        ],
      ),
    );
  }

  Widget _emptyReports() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 28),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: _kBorder),
      ),
      child: const Column(
        children: [
          Icon(Icons.inbox_outlined, color: _kMuted, size: 32),
          SizedBox(height: 8),
          Text('Aún no tienes reportes', style: TextStyle(color: _kMuted)),
        ],
      ),
    );
  }

  Widget _eventCard(_EventItem e) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [e.color.withValues(alpha: 0.08), Colors.white],
        ),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: e.color.withValues(alpha: 0.25)),
      ),
      child: Row(
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: e.color,
              borderRadius: BorderRadius.circular(14),
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  e.month,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.5,
                  ),
                ),
                Text(
                  e.day,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                    height: 1,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  e.title,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    color: _kText,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  e.subtitle,
                  style: const TextStyle(fontSize: 13, color: _kMuted),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
