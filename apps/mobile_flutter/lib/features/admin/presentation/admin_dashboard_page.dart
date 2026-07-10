import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/di/repositories.dart';
import '../../../domain/constants.dart';
import '../../../domain/helpers.dart';
import '../../../domain/models.dart';

class AdminDashboardPage extends StatefulWidget {
  const AdminDashboardPage({super.key});

  @override
  State<AdminDashboardPage> createState() => _AdminDashboardPageState();
}

class _AdminDashboardPageState extends State<AdminDashboardPage> {
  UserRole _role = UserRole.estudiante;
  List<Incident> _incidents = [];
  bool _loading = true;
  String? _error;
  IncidentStatus? _statusFilter;
  IncidentType? _typeFilter;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final role = await profileRepository.fetchMyRole();
      final all = await incidentsRepository.fetchIncidentsForAdmin();
      final allowed = incidentTypesForRole(role).toSet();
      final mine = all.where((i) => allowed.contains(i.type)).toList();
      if (!mounted) return;
      setState(() {
        _role = role;
        _incidents = mine;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
        _loading = false;
      });
    }
  }

  Future<void> _changeStatus(Incident inc, IncidentStatus status) async {
    try {
      final updated = await incidentsRepository.setStatus(inc.id, status);
      if (!mounted) return;
      setState(() {
        _incidents = _incidents.map((i) => i.id == inc.id ? updated : i).toList();
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Reporte marcado como "${statusLabels[status]}".')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString().replaceFirst('Exception: ', ''))),
      );
    }
  }

  List<Incident> get _visible {
    return _incidents.where((i) {
      if (_statusFilter != null && i.status != _statusFilter) return false;
      if (_typeFilter != null && i.type != _typeFilter) return false;
      return true;
    }).toList();
  }

  int _countByStatus(IncidentStatus status) =>
      _incidents.where((i) => i.status == status).length;

  @override
  Widget build(BuildContext context) {
    final allowedTypes = incidentTypesForRole(_role);
    final isAdmin = _role == UserRole.adminGeneral;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Panel de gestión'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/app/profile'),
        ),
        actions: [
          IconButton(
            tooltip: 'Ver mapa',
            onPressed: () => context.go('/app/home'),
            icon: const Icon(Icons.map_outlined),
          ),
          IconButton(onPressed: _load, icon: const Icon(Icons.refresh)),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Text(_error!, textAlign: TextAlign.center),
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      _RoleHeader(role: _role),
                      const SizedBox(height: 16),
                      _statsRow(),
                      const SizedBox(height: 16),
                      _statusFilters(),
                      if (isAdmin && allowedTypes.length > 1) ...[
                        const SizedBox(height: 8),
                        _typeFilters(allowedTypes),
                      ],
                      const SizedBox(height: 16),
                      if (_visible.isEmpty)
                        const Padding(
                          padding: EdgeInsets.symmetric(vertical: 40),
                          child: Center(child: Text('No hay reportes en esta vista.')),
                        )
                      else
                        ..._visible.map(_incidentCard),
                    ],
                  ),
                ),
    );
  }

  Widget _statsRow() {
    return Row(
      children: [
        _statCard('Total', _incidents.length, const Color(0xFF2563EB)),
        const SizedBox(width: 10),
        _statCard('Activos', _countByStatus(IncidentStatus.activo), const Color(0xFFEF4444)),
        const SizedBox(width: 10),
        _statCard('En proceso', _countByStatus(IncidentStatus.enProceso), const Color(0xFFF59E0B)),
        const SizedBox(width: 10),
        _statCard('Resueltos', _countByStatus(IncidentStatus.cerrado), const Color(0xFF10B981)),
      ],
    );
  }

  Widget _statCard(String label, int value, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 8),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: Column(
          children: [
            Text('$value',
                style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: color)),
            const SizedBox(height: 2),
            Text(label,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 11, color: Colors.black54)),
          ],
        ),
      ),
    );
  }

  Widget _statusFilters() {
    final statuses = [null, ...IncidentStatus.values];
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: statuses.map((s) {
          final label = s == null ? 'Todos' : statusLabels[s]!;
          final selected = _statusFilter == s;
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: ChoiceChip(
              label: Text(label),
              selected: selected,
              onSelected: (_) => setState(() => _statusFilter = s),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _typeFilters(List<IncidentType> types) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: ChoiceChip(
              label: const Text('Todos los tipos'),
              selected: _typeFilter == null,
              onSelected: (_) => setState(() => _typeFilter = null),
            ),
          ),
          ...types.map((t) => Padding(
                padding: const EdgeInsets.only(right: 8),
                child: ChoiceChip(
                  label: Text('${incidentEmoji[t]} ${incidentLabels[t]}'),
                  selected: _typeFilter == t,
                  onSelected: (_) => setState(() => _typeFilter = t),
                ),
              )),
        ],
      ),
    );
  }

  Widget _incidentCard(Incident inc) {
    final color = incidentColors[inc.type] ?? const Color(0xFF2563EB);
    final statusColor = statusColors[inc.status] ?? Colors.grey;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: const [
          BoxShadow(color: Color(0x0F000000), blurRadius: 8, offset: Offset(0, 2)),
        ],
      ),
      child: Column(
        children: [
          Container(
            decoration: BoxDecoration(
              border: Border(left: BorderSide(color: color, width: 5)),
            ),
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(incidentEmoji[inc.type] ?? '📍', style: const TextStyle(fontSize: 20)),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        incidentLabels[inc.type]!,
                        style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: statusColor.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        statusLabels[inc.status]!,
                        style: TextStyle(
                          color: statusColor,
                          fontWeight: FontWeight.w700,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  inc.description.isEmpty ? 'Sin descripción' : inc.description,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 6),
                Text(
                  '${timeAgo(inc.createdAt)} · ${inc.authorNombre ?? 'Anónimo'} · ${inc.likesCount} validaciones',
                  style: const TextStyle(color: Colors.black54, fontSize: 12),
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            child: Row(
              children: [
                Expanded(
                  child: Wrap(
                    spacing: 4,
                    children: [
                      if (inc.status != IncidentStatus.enProceso)
                        _actionButton('En proceso', const Color(0xFFF59E0B),
                            () => _changeStatus(inc, IncidentStatus.enProceso)),
                      if (inc.status != IncidentStatus.cerrado)
                        _actionButton('Resolver', const Color(0xFF10B981),
                            () => _changeStatus(inc, IncidentStatus.cerrado)),
                      if (inc.status != IncidentStatus.rechazado)
                        _actionButton('Rechazar', const Color(0xFF64748B),
                            () => _changeStatus(inc, IncidentStatus.rechazado)),
                    ],
                  ),
                ),
                IconButton(
                  tooltip: 'Ver detalle',
                  onPressed: () => context.push('/app/home/alert/${inc.id}'),
                  icon: const Icon(Icons.chevron_right),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _actionButton(String label, Color color, VoidCallback onTap) {
    return TextButton(
      onPressed: onTap,
      style: TextButton.styleFrom(
        foregroundColor: color,
        padding: const EdgeInsets.symmetric(horizontal: 10),
        minimumSize: const Size(0, 36),
      ),
      child: Text(label, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
    );
  }
}

class _RoleHeader extends StatelessWidget {
  const _RoleHeader({required this.role});

  final UserRole role;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF2F6BFF), Color(0xFF1D4ED8)],
        ),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Panel de administración',
              style: TextStyle(color: Colors.white70, fontSize: 12, letterSpacing: 1)),
          const SizedBox(height: 4),
          Text(
            roleLabels[role] ?? 'Administrador',
            style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w900),
          ),
        ],
      ),
    );
  }
}
