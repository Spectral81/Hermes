import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';

import '../../../core/di/repositories.dart';
import '../../../domain/constants.dart';
import '../../../domain/helpers.dart';
import '../../../domain/models.dart';
import 'animated_asset_icon.dart';

class AlertsPage extends StatefulWidget {
  const AlertsPage({super.key});

  @override
  State<AlertsPage> createState() => _AlertsPageState();
}

const Color _kBg = Color(0xFFF8FAFC);
const Color _kText = Color(0xFF0F172A);
const Color _kMuted = Color(0xFF64748B);
const Color _kBorder = Color(0xFFE5E7EB);

class _AlertsPageState extends State<AlertsPage> {
  List<Incident> _incidents = [];
  bool _loading = true;
  IncidentType? _filter;
  ({double lat, double lng})? _coords;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await incidentsRepository.fetchIncidents();
      _coords = await _getCoords();
      if (!mounted) return;
      final nearby = filterNearbyRecentIncidents(
        items: data,
        createdAtOf: (i) => i.createdAt,
        latOf: (i) => i.lat,
        lngOf: (i) => i.lng,
        userLat: _coords?.lat,
        userLng: _coords?.lng,
        maxAgeHours: incidentMaxAgeHours,
        radiusM: incidentNearbyRadiusM,
      );
      setState(() => _incidents = nearby);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<({double lat, double lng})?> _getCoords() async {
    try {
      final p = await Geolocator.getCurrentPosition();
      return (lat: p.latitude, lng: p.longitude);
    } catch (_) {
      return null;
    }
  }

  String _title(Incident i) {
    final base = incidentLabels[i.type] ?? 'Alerta';
    if (i.type == IncidentType.infraestructura && i.category != null) {
      return '$base · ${infraCategoryLabels[i.category]}';
    }
    if (i.type == IncidentType.accidente && i.severity != null) {
      return '$base · ${severityLabels[i.severity]}';
    }
    return base;
  }

  String? _distanceLabel(Incident i) {
    if (_coords == null) return null;
    return formatDistance(distanceMeters(_coords!.lat, _coords!.lng, i.lat, i.lng));
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filter == null
        ? _incidents
        : _incidents.where((i) => i.type == _filter).toList();
    // Ya vienen ordenadas por más recientes; mantener ese orden tras el filtro de tipo.
    final sorted = filtered;

    Incident? critical;
    for (final i in sorted) {
      if (i.type == IncidentType.panico && i.status == IncidentStatus.activo) {
        critical = i;
        break;
      }
    }

    return Scaffold(
      backgroundColor: _kBg,
      body: SafeArea(
        bottom: false,
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : RefreshIndicator(
                onRefresh: _load,
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                  children: [
                    _headerRow(),
                    const SizedBox(height: 14),
                    _filters(),
                    const SizedBox(height: 14),
                    if (critical != null) ...[
                      _criticalBanner(critical),
                      const SizedBox(height: 12),
                    ],
                    if (sorted.isEmpty)
                      _empty()
                    else
                      ...sorted.map(_alertCard),
                  ],
                ),
              ),
      ),
    );
  }

  Widget _headerRow() {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Alertas',
                style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800, color: _kText),
              ),
              SizedBox(height: 2),
              Text(
                'Últimas 24 h · Campus UTEQ',
                style: TextStyle(fontSize: 13, color: _kMuted),
              ),
            ],
          ),
        ),
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: _kBorder),
          ),
          child: IconButton(
            onPressed: _load,
            icon: const Icon(Icons.tune, color: _kText),
            tooltip: 'Actualizar',
          ),
        ),
      ],
    );
  }

  Widget _filters() {
    return SizedBox(
      height: 38,
      child: ListView(
        scrollDirection: Axis.horizontal,
        children: [
          _chip('Todas', _incidents.length, const Color(0xFF2563EB),
              Icons.grid_view_rounded, _filter == null, () => setState(() => _filter = null)),
          ...IncidentType.values.map((type) {
            final count = _incidents.where((i) => i.type == type).length;
            return _chip(
              incidentLabels[type]!,
              count,
              incidentColors[type]!,
              incidentIcons[type]!,
              _filter == type,
              () => setState(() => _filter = type),
            );
          }),
        ],
      ),
    );
  }

  Widget _chip(String label, int count, Color color, IconData icon, bool selected,
      VoidCallback onTap) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: Material(
        color: selected ? color : Colors.white,
        borderRadius: BorderRadius.circular(999),
        child: InkWell(
          borderRadius: BorderRadius.circular(999),
          onTap: onTap,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14),
            alignment: Alignment.center,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(999),
              border: Border.all(color: selected ? color : _kBorder),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(icon, size: 15, color: selected ? Colors.white : color),
                const SizedBox(width: 6),
                Text(
                  '$label ($count)',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: selected ? Colors.white : const Color(0xFF334155),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _criticalBanner(Incident i) {
    return InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: () => context.push('/app/home/alert/${i.id}'),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFFEF4444), Color(0xFFDC2626)],
          ),
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFFDC2626).withValues(alpha: 0.4),
              blurRadius: 16,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.25),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(Icons.priority_high, color: Colors.white),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'ZONA CRÍTICA ACTIVA',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 15,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.4,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Emergencia SOS · ${timeAgo(i.createdAt)}'
                    '${_distanceLabel(i) != null ? ' · a ${_distanceLabel(i)}' : ''}',
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.9),
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right, color: Colors.white),
          ],
        ),
      ),
    );
  }

  Widget _alertCard(Incident i) {
    final color = incidentColors[i.type] ?? const Color(0xFF2563EB);
    final dist = _distanceLabel(i);
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
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Container(width: 5, color: color),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 36,
                            height: 36,
                            decoration: BoxDecoration(
                              color: color.withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            alignment: Alignment.center,
                            child: IncidentTypeIcon(
                              type: incidentTypeToWire(i.type),
                              size: 28,
                              animate: false,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  _title(i),
                                  style: const TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w800,
                                    color: _kText,
                                  ),
                                ),
                                const SizedBox(height: 1),
                                Text(
                                  i.description.isEmpty ? 'Sin descripción' : i.description,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(fontSize: 12.5, color: _kMuted),
                                ),
                              ],
                            ),
                          ),
                          const Icon(Icons.chevron_right, color: Color(0xFFCBD5E1)),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Wrap(
                        spacing: 8,
                        runSpacing: 6,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        children: [
                          _statusChip(i.status),
                          _metaText(
                            '${timeAgo(i.createdAt)}${dist != null ? ' · $dist' : ''}',
                          ),
                          if (i.likesCount > 0)
                            Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(Icons.check_circle,
                                    size: 14, color: Color(0xFF10B981)),
                                const SizedBox(width: 3),
                                Text(
                                  '${i.likesCount} validaciones',
                                  style: const TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                    color: Color(0xFF10B981),
                                  ),
                                ),
                              ],
                            ),
                        ],
                      ),
                    ],
                  ),
                ),
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
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 6,
            height: 6,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          ),
          const SizedBox(width: 5),
          Text(
            label,
            style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: color),
          ),
        ],
      ),
    );
  }

  Widget _metaText(String text) {
    return Text(
      text,
      style: const TextStyle(fontSize: 12, color: _kMuted, fontWeight: FontWeight.w500),
    );
  }

  Widget _empty() {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(top: 40),
      padding: const EdgeInsets.symmetric(vertical: 40),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: _kBorder),
      ),
      child: const Column(
        children: [
          Icon(Icons.notifications_off_outlined, color: _kMuted, size: 36),
          SizedBox(height: 10),
          Text('Sin alertas recientes', style: TextStyle(color: _kMuted)),
        ],
      ),
    );
  }
}
