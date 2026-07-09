import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';

import '../../../core/di/repositories.dart';
import '../../../domain/constants.dart';
import '../../../domain/helpers.dart';
import '../../../domain/models.dart';

class AlertsPage extends StatefulWidget {
  const AlertsPage({super.key});

  @override
  State<AlertsPage> createState() => _AlertsPageState();
}

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
      final recent = data
          .where((i) => isRecentIso(i.createdAt, maxAgeHours: incidentMaxAgeHours))
          .toList();
      setState(() => _incidents = recent);
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

  @override
  Widget build(BuildContext context) {
    final filtered = _filter == null ? _incidents : _incidents.where((i) => i.type == _filter).toList();
    final sorted = [...filtered];
    if (_coords != null) {
      sorted.sort((a, b) {
        final da = distanceMeters(_coords!.lat, _coords!.lng, a.lat, a.lng);
        final db = distanceMeters(_coords!.lat, _coords!.lng, b.lat, b.lng);
        return da.compareTo(db);
      });
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Alertas'),
        actions: [
          IconButton(onPressed: _load, icon: const Icon(Icons.refresh)),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                Padding(
                  padding: const EdgeInsets.all(12),
                  child: SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        FilterChip(
                          label: Text('Todas (${_incidents.length})'),
                          selected: _filter == null,
                          onSelected: (_) => setState(() => _filter = null),
                        ),
                        const SizedBox(width: 8),
                        ...IncidentType.values.map((type) {
                          final count = _incidents.where((i) => i.type == type).length;
                          return Padding(
                            padding: const EdgeInsets.only(right: 8),
                            child: FilterChip(
                              label: Text('${incidentLabels[type]} ($count)'),
                              selected: _filter == type,
                              onSelected: (_) => setState(() => _filter = type),
                            ),
                          );
                        }),
                      ],
                    ),
                  ),
                ),
                Expanded(
                  child: ListView.separated(
                    itemCount: sorted.length,
                    separatorBuilder: (_, __) => const Divider(height: 1),
                    itemBuilder: (context, i) {
                      final inc = sorted[i];
                      final dist = _coords == null
                          ? null
                          : formatDistance(
                              distanceMeters(_coords!.lat, _coords!.lng, inc.lat, inc.lng),
                            );
                      return ListTile(
                        title: Text(incidentLabels[inc.type]!),
                        subtitle: Text(
                          '${timeAgo(inc.createdAt)}${dist != null ? ' · $dist' : ''}\n${inc.description}',
                        ),
                        isThreeLine: true,
                        trailing: Text('${inc.likesCount} ✓'),
                        onTap: () => context.push('/app/home/alert/${inc.id}'),
                        onLongPress: () => context.push('/app/home/validate/${inc.id}'),
                      );
                    },
                  ),
                ),
              ],
            ),
    );
  }
}
