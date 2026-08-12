import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/config/env.dart';
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

class _UpcomingEvent {
  const _UpcomingEvent({
    required this.id,
    required this.title,
    required this.location,
    required this.startsAt,
    required this.endsAt,
  });

  final String id;
  final String title;
  final String location;
  final DateTime? startsAt;
  final DateTime? endsAt;
}

const Color _kBg = Color(0xFFF8FAFC);
const Color _kText = Color(0xFF0F172A);
const Color _kMuted = Color(0xFF64748B);
const Color _kBorder = Color(0xFFE5E7EB);
const Color _kEventBg = Color(0xFFFFF7ED);
const Color _kEventBorder = Color(0xFFFDBA74);
const Color _kEventAccent = Color(0xFFC2410C);

class _AlertsPageState extends State<AlertsPage> {
  List<Incident> _incidents = [];
  List<_UpcomingEvent> _events = [];
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
      final data = (await incidentsRepository.fetchIncidents())
          .where((i) =>
              i.status != IncidentStatus.cerrado &&
              i.status != IncidentStatus.rechazado)
          .toList();
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
      final events = await _loadUpcomingEvents();
      setState(() {
        _incidents = nearby;
        _events = events;
      });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<List<_UpcomingEvent>> _loadUpcomingEvents() async {
    final base = AppEnv.webApiUrl;
    if (base == null) return [];
    try {
      final token = Supabase.instance.client.auth.currentSession?.accessToken;
      final dio = Dio(BaseOptions(baseUrl: base));
      final res = await dio.get(
        '/api/events',
        options: Options(headers: token != null ? {'Authorization': 'Bearer $token'} : null),
      );
      final list = (res.data as List?) ?? [];
      final now = DateTime.now();
      final out = <_UpcomingEvent>[];
      for (final raw in list) {
        final e = Map<String, dynamic>.from(raw as Map);
        if (e['status'] != 'abierto') continue;
        final ends = DateTime.tryParse('${e['ends_at']}')?.toLocal();
        final starts = DateTime.tryParse('${e['starts_at']}')?.toLocal();
        if (ends != null) {
          final endDay = DateTime(ends.year, ends.month, ends.day, 23, 59, 59, 999);
          if (endDay.isBefore(now)) continue;
        } else if (starts != null) {
          final endOfDay = DateTime(starts.year, starts.month, starts.day, 23, 59, 59, 999);
          if (endOfDay.isBefore(now)) continue;
        }
        out.add(
          _UpcomingEvent(
            id: '${e['id']}',
            title: '${e['title']}',
            location: '${e['location_label'] ?? 'Campus UTEQ'}',
            startsAt: starts,
            endsAt: ends,
          ),
        );
      }
      out.sort((a, b) {
        final ta = a.startsAt?.millisecondsSinceEpoch ?? 1 << 62;
        final tb = b.startsAt?.millisecondsSinceEpoch ?? 1 << 62;
        return ta.compareTo(tb);
      });
      return out;
    } catch (_) {
      return [];
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

  String _formatEventWhen(DateTime? d) {
    if (d == null) return 'Fecha por confirmar';
    const months = [
      'ene', 'feb', 'mar', 'abr', 'may', 'jun',
      'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
    ];
    final hh = d.hour.toString().padLeft(2, '0');
    final mm = d.minute.toString().padLeft(2, '0');
    return '${d.day} ${months[d.month - 1]} · $hh:$mm';
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filter == null
        ? _incidents
        : _incidents.where((i) => i.type == _filter).toList();
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
                    _eventsSection(),
                    const SizedBox(height: 16),
                    _filters(),
                    const SizedBox(height: 14),
                    if (critical != null) ...[
                      _criticalBanner(critical),
                      const SizedBox(height: 12),
                    ],
                    const Text(
                      'Alertas cercanas',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.4,
                        color: _kMuted,
                      ),
                    ),
                    const SizedBox(height: 8),
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

  Widget _eventsSection() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: _kEventBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: _kEventBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const AnimatedAssetIcon(
                assetPath: 'assets/markers/kermes-icon.png',
                size: 28,
                fallbackEmoji: '🎈',
              ),
              const SizedBox(width: 8),
              const Expanded(
                child: Text(
                  'Eventos próximos',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    color: _kEventAccent,
                  ),
                ),
              ),
              TextButton(
                onPressed: () => context.go('/app/events'),
                child: const Text('Ver todos'),
              ),
            ],
          ),
          const SizedBox(height: 8),
          if (_events.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 8),
              child: Text(
                'No hay eventos próximos',
                style: TextStyle(color: _kMuted, fontSize: 13),
              ),
            )
          else
            ..._events.take(5).map(_eventCard),
        ],
      ),
    );
  }

  Widget _eventCard(_UpcomingEvent e) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Material(
        color: Colors.white.withValues(alpha: 0.9),
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: () => context.go('/app/events'),
          child: Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: _kEventBorder),
            ),
            child: Row(
              children: [
                const AnimatedAssetIcon(
                  assetPath: 'assets/markers/kermes-icon.png',
                  size: 34,
                  fallbackEmoji: '🎈',
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        e.title,
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          color: _kText,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Image.asset(
                            'assets/markers/event-pin.png',
                            width: 14,
                            height: 14,
                            errorBuilder: (_, __, ___) => const SizedBox.shrink(),
                          ),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              e.location,
                              style: const TextStyle(fontSize: 12, color: _kMuted),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          Image.asset(
                            'assets/markers/event-calendar.png',
                            width: 14,
                            height: 14,
                            errorBuilder: (_, __, ___) => const SizedBox.shrink(),
                          ),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              e.endsAt != null
                                  ? '${_formatEventWhen(e.startsAt)} → ${_formatEventWhen(e.endsAt)}'
                                  : _formatEventWhen(e.startsAt),
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: _kEventAccent,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const Icon(Icons.chevron_right, color: _kEventAccent),
              ],
            ),
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
          margin: const EdgeInsets.only(right: 8),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: _kBorder),
          ),
          child: IconButton(
            onPressed: () => context.push('/app/chat'),
            icon: const Icon(Icons.smart_toy_outlined, color: _kText),
            tooltip: 'Asistente',
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
    final bg = incidentBackgrounds[i.type] ?? Colors.white;
    final border = incidentBorderColors[i.type] ?? _kBorder;
    final dist = _distanceLabel(i);
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: border, width: 1.5),
        boxShadow: [
          BoxShadow(
            color: color.withValues(alpha: 0.08),
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
                              color: Colors.white.withValues(alpha: 0.85),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: border),
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
