import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';

import '../../../core/di/repositories.dart';
import '../../../core/notifications/push_service.dart';
import '../../../domain/constants.dart';
import '../../../domain/helpers.dart';
import '../../../domain/models.dart';
import 'incident_marker.dart';
import 'report_sheet.dart';

const _campus = LatLng(20.6534, -100.4045);

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  final _mapCtrl = MapController();
  List<Incident> _incidents = [];
  Incident? _selected;
  bool _loading = true;
  bool _hasLocationPermission = false;
  String? _loadError;
  LatLng _userPos = _campus;
  IncidentType? _filter;
  UserRole _role = UserRole.estudiante;

  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    try {
      await _resolveLocation();
      await _loadIncidents();
    } catch (e) {
      _loadError = e.toString().replaceFirst('Exception: ', '');
    }
    try {
      final role = await profileRepository.fetchMyRole();
      if (mounted) setState(() => _role = role);
    } catch (_) {
      // Mantiene estudiante por defecto.
    }
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _resolveLocation() async {
    try {
      final perm = await Geolocator.requestPermission();
      if (perm == LocationPermission.denied || perm == LocationPermission.deniedForever) {
        _hasLocationPermission = false;
        return;
      }
      _hasLocationPermission = true;
      final pos = await Geolocator.getCurrentPosition();
      _userPos = LatLng(pos.latitude, pos.longitude);
      await PushService.instance.updateLocation(pos.latitude, pos.longitude);
    } catch (_) {
      _hasLocationPermission = false;
      // keep campus fallback
    }
  }

  Future<void> _loadIncidents() async {
    final data = await incidentsRepository.fetchIncidents();
    if (!mounted) return;
    final recent = data
        .where((i) => isRecentIso(i.createdAt, maxAgeHours: incidentMaxAgeHours))
        .toList();
    setState(() => _incidents = recent);
  }

  Future<void> _openReportSheet() async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (_) => ReportSheet(
        coords: (lat: _userPos.latitude, lng: _userPos.longitude),
        onSubmit: (input) async {
          final created = await incidentsRepository.createIncident(input);
          if (!mounted) return;
          setState(() {
            _incidents = [created, ..._incidents];
            _selected = created;
          });
        },
      ),
    );
  }

  Future<void> _toggleLike(String incidentId) async {
    final res = await incidentsRepository.toggleLike(incidentId);
    if (!mounted) return;
    setState(() {
      _incidents = _incidents
          .map((i) => i.id == incidentId
              ? Incident(
                  id: i.id,
                  type: i.type,
                  category: i.category,
                  severity: i.severity,
                  description: i.description,
                  lat: i.lat,
                  lng: i.lng,
                  status: i.status,
                  likesCount: res.likesCount,
                  createdAt: i.createdAt,
                  createdBy: i.createdBy,
                  authorNombre: i.authorNombre,
                  likedByMe: res.liked,
                )
              : i)
          .toList();
      if (_selected?.id == incidentId) {
        _selected = _incidents.firstWhere((i) => i.id == incidentId);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final visible = _filter == null ? _incidents : _incidents.where((i) => i.type == _filter).toList();

    return Scaffold(
      body: Stack(
        children: [
          FlutterMap(
            mapController: _mapCtrl,
            options: MapOptions(
              initialCenter: _userPos,
              initialZoom: 16,
              onTap: (_, __) => setState(() => _selected = null),
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'com.example.mobile_flutter',
              ),
              if (_hasLocationPermission)
                MarkerLayer(
                  markers: [
                    Marker(
                      point: _userPos,
                      width: 36,
                      height: 36,
                      child: const Icon(Icons.my_location, color: Color(0xFF2563EB), size: 28),
                    ),
                  ],
                ),
              MarkerLayer(
                markers: [
                  for (final inc in visible)
                    Marker(
                      point: LatLng(inc.lat, inc.lng),
                      width: 52,
                      height: 52,
                      child: IncidentMarker(
                        type: inc.type,
                        selected: _selected?.id == inc.id,
                        onTap: () => setState(() => _selected = inc),
                      ),
                    ),
                ],
              ),
            ],
          ),
          Positioned(
            top: 56,
            left: 16,
            right: 16,
            child: Card(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                child: Row(
                  children: [
                    const Icon(Icons.shield_outlined, color: Color(0xFF2563EB)),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _incidents.isEmpty ? 'Sin alertas cerca' : '${_incidents.length} alertas activas',
                        style: const TextStyle(fontWeight: FontWeight.w700),
                      ),
                    ),
                    if (_loading)
                      const SizedBox(width: 18, height: 18, child: CircularProgressIndicator())
                    else if (isPrivilegedRole(_role))
                      IconButton(
                        tooltip: 'Panel de gestión',
                        visualDensity: VisualDensity.compact,
                        onPressed: () => context.push('/app/dashboard'),
                        icon: const Icon(Icons.dashboard_customize_outlined, color: Color(0xFF2563EB)),
                      ),
                  ],
                ),
              ),
            ),
          ),
          if (_loadError != null)
            Positioned(
              top: 112,
              left: 16,
              right: 16,
              child: Card(
                color: const Color(0xFFFEF2F2),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  child: Text(
                    _loadError!,
                    style: const TextStyle(color: Color(0xFF991B1B), fontWeight: FontWeight.w600),
                  ),
                ),
              ),
            ),
          Positioned(
            top: _loadError == null ? 112 : 172,
            left: 0,
            right: 0,
            child: SizedBox(
              height: 40,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                children: [
                  _MapFilterChip(
                    label: 'Todas',
                    count: _incidents.length,
                    color: const Color(0xFF2563EB),
                    icon: Icons.grid_view_rounded,
                    selected: _filter == null,
                    onTap: () => setState(() => _filter = null),
                  ),
                  ...IncidentType.values.map((type) {
                    final count = _incidents.where((i) => i.type == type).length;
                    return _MapFilterChip(
                      label: incidentLabels[type]!,
                      count: count,
                      color: incidentColors[type]!,
                      icon: incidentIcons[type]!,
                      selected: _filter == type,
                      onTap: () => setState(() => _filter = type),
                    );
                  }),
                ],
              ),
            ),
          ),
          if (_selected != null)
            Positioned(
              left: 12,
              right: 12,
              bottom: 16,
              child: _SelectedIncidentCard(
                incident: _selected!,
                userPos: _userPos,
                onClose: () => setState(() => _selected = null),
                onLike: () => _toggleLike(_selected!.id),
                onValidate: () => context.push('/app/home/validate/${_selected!.id}'),
                onDetail: () => context.push('/app/home/alert/${_selected!.id}'),
              ),
            ),
        ],
      ),
      floatingActionButton: _selected == null
          ? FloatingActionButton(
              onPressed: _openReportSheet,
              child: const Icon(Icons.add),
            )
          : null,
    );
  }
}

class _MapFilterChip extends StatelessWidget {
  const _MapFilterChip({
    required this.label,
    required this.count,
    required this.color,
    required this.icon,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final int count;
  final Color color;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: Material(
        color: selected ? color : Colors.white,
        borderRadius: BorderRadius.circular(999),
        elevation: 2,
        shadowColor: Colors.black.withValues(alpha: 0.15),
        child: InkWell(
          borderRadius: BorderRadius.circular(999),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(icon, size: 16, color: selected ? Colors.white : color),
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
}

class _SelectedIncidentCard extends StatelessWidget {
  const _SelectedIncidentCard({
    required this.incident,
    required this.userPos,
    required this.onClose,
    required this.onLike,
    required this.onValidate,
    required this.onDetail,
  });

  final Incident incident;
  final LatLng userPos;
  final VoidCallback onClose;
  final VoidCallback onLike;
  final VoidCallback onValidate;
  final VoidCallback onDetail;

  @override
  Widget build(BuildContext context) {
    final distance = distanceMeters(userPos.latitude, userPos.longitude, incident.lat, incident.lng);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    incidentLabels[incident.type]!,
                    style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
                  ),
                ),
                IconButton(onPressed: onClose, icon: const Icon(Icons.close)),
              ],
            ),
            Text(
              incident.description.isEmpty ? 'Sin descripción' : incident.description,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 8),
            Text(
              '${timeAgo(incident.createdAt)} · ${formatDistance(distance)}',
              style: const TextStyle(color: Colors.black54),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                OutlinedButton.icon(
                  onPressed: onLike,
                  icon: Icon(incident.likedByMe ? Icons.thumb_up : Icons.thumb_up_outlined),
                  label: Text('${incident.likesCount}'),
                ),
                const SizedBox(width: 8),
                TextButton(onPressed: onValidate, child: const Text('Validar')),
                const SizedBox(width: 8),
                TextButton(onPressed: onDetail, child: const Text('Detalle')),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
