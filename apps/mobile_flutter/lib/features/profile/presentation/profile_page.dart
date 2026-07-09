import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/di/repositories.dart';
import '../../../domain/constants.dart';
import '../../../domain/helpers.dart';
import '../../../domain/models.dart';

class ProfilePage extends StatefulWidget {
  const ProfilePage({super.key});

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  UserRole _role = UserRole.estudiante;
  List<Incident> _incidents = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    // El rol se resuelve por separado: aunque falle la carga de reportes,
    // el botón del panel debe aparecer para roles privilegiados.
    try {
      final role = await profileRepository.fetchMyRole();
      if (mounted) setState(() => _role = role);
    } catch (_) {
      // Mantiene estudiante por defecto.
    }

    try {
      final incidents = await incidentsRepository.fetchIncidents();
      if (mounted) setState(() => _incidents = incidents);
    } catch (_) {
      // Sin reportes visibles, pero no bloquea el panel.
    }

    if (mounted) setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    final user = Supabase.instance.client.auth.currentUser;

    if (_loading) {
      return Scaffold(
        appBar: AppBar(title: const Text('Perfil')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    final mine = _incidents.where((i) => user != null && i.createdBy == user.id).toList()
      ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
    final privileged = isPrivilegedRole(_role);

    return Scaffold(
      appBar: AppBar(title: const Text('Perfil')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Cuenta', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
                  const SizedBox(height: 6),
                  Text(user?.email ?? 'Sin sesión'),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFF2563EB).withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      roleLabels[_role] ?? 'Estudiante',
                      style: const TextStyle(
                        color: Color(0xFF2563EB),
                        fontWeight: FontWeight.w700,
                        fontSize: 12,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          if (privileged) ...[
            const SizedBox(height: 16),
            FilledButton.icon(
              style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFF2563EB),
                minimumSize: const Size.fromHeight(52),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              onPressed: () => context.push('/app/dashboard'),
              icon: const Icon(Icons.dashboard_customize_outlined),
              label: const Text('Abrir panel de gestión',
                  style: TextStyle(fontWeight: FontWeight.w700)),
            ),
          ],
          const SizedBox(height: 16),
          const Text('Mis reportes', style: TextStyle(fontWeight: FontWeight.w800)),
          const SizedBox(height: 8),
          if (mine.isEmpty)
            const Text('No tienes reportes todavía.')
          else
            ...mine.map(
              (i) => ListTile(
                contentPadding: EdgeInsets.zero,
                title: Text(incidentLabels[i.type]!),
                subtitle: Text('${timeAgo(i.createdAt)} · ${i.likesCount} validaciones'),
                onTap: () => context.push('/app/home/alert/${i.id}'),
              ),
            ),
          const SizedBox(height: 20),
          OutlinedButton(
            onPressed: () => Supabase.instance.client.auth.signOut(),
            child: const Text('Cerrar sesión'),
          ),
        ],
      ),
    );
  }
}
