import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';

import '../../../core/di/repositories.dart';
import '../../../domain/constants.dart';
import '../../../domain/models.dart';

class AlertDetailPage extends StatefulWidget {
  const AlertDetailPage({super.key, required this.incidentId});

  final String incidentId;

  @override
  State<AlertDetailPage> createState() => _AlertDetailPageState();
}

const Color _kBg = Color(0xFFF8FAFC);
const Color _kText = Color(0xFF0F172A);
const Color _kMuted = Color(0xFF64748B);
const Color _kBorder = Color(0xFFE5E7EB);

const List<String> _months = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];

class _AlertDetailPageState extends State<AlertDetailPage> {
  Incident? _incident;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final list = await incidentsRepository.fetchIncidents();
    Incident? found;
    for (final inc in list) {
      if (inc.id == widget.incidentId) {
        found = inc;
        break;
      }
    }
    if (!mounted) return;
    setState(() {
      _incident = found;
      _loading = false;
    });
  }

  Future<void> _like() async {
    if (_incident == null) return;
    final result = await incidentsRepository.toggleLike(_incident!.id);
    if (!mounted) return;
    setState(() {
      final i = _incident!;
      _incident = Incident(
        id: i.id,
        type: i.type,
        category: i.category,
        severity: i.severity,
        description: i.description,
        lat: i.lat,
        lng: i.lng,
        status: i.status,
        likesCount: result.likesCount,
        createdAt: i.createdAt,
        createdBy: i.createdBy,
        authorNombre: i.authorNombre,
        likedByMe: result.liked,
      );
    });
  }

  String _subtitle(Incident i) {
    final base = (incidentLabels[i.type] ?? 'Alerta').toUpperCase();
    if (i.type == IncidentType.infraestructura && i.category != null) {
      return '$base · ${infraCategoryLabels[i.category]!.toUpperCase()}';
    }
    if (i.type == IncidentType.accidente && i.severity != null) {
      return '$base · ${severityLabels[i.severity]!.toUpperCase()}';
    }
    return base;
  }

  String _dateTime(String iso) {
    final d = DateTime.tryParse(iso)?.toLocal();
    if (d == null) return '';
    final now = DateTime.now();
    final hh = d.hour.toString().padLeft(2, '0');
    final mm = d.minute.toString().padLeft(2, '0');
    final sameDay = d.year == now.year && d.month == now.month && d.day == now.day;
    final datePart = sameDay ? 'Hoy' : '${d.day} ${_months[d.month - 1]}';
    return '$datePart · $hh:$mm';
  }

  String _initials(String? name) {
    if (name == null || name.trim().isEmpty) return '?';
    final parts = name.trim().split(RegExp(r'\s+')).where((s) => s.isNotEmpty).toList();
    if (parts.length == 1) return parts.first.substring(0, 1).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        backgroundColor: _kBg,
        body: Center(child: CircularProgressIndicator()),
      );
    }
    if (_incident == null) {
      return Scaffold(
        backgroundColor: _kBg,
        appBar: AppBar(title: const Text('Detalle')),
        body: const Center(child: Text('No se encontró el reporte.')),
      );
    }

    final i = _incident!;
    final color = incidentColors[i.type] ?? const Color(0xFF2563EB);
    final verified = i.likesCount >= incidentValidationTarget;

    return Scaffold(
      backgroundColor: _kBg,
      body: ListView(
        padding: EdgeInsets.zero,
        children: [
          _banner(i, color, verified),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _reportedByCard(i),
                const SizedBox(height: 16),
                _validationsCard(i),
                const SizedBox(height: 16),
                _locationCard(i),
                const SizedBox(height: 20),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          minimumSize: const Size.fromHeight(50),
                          foregroundColor: color,
                          side: BorderSide(color: color),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                        onPressed: _like,
                        icon: Icon(i.likedByMe ? Icons.thumb_up : Icons.thumb_up_outlined),
                        label: Text('${i.likesCount}'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      flex: 2,
                      child: FilledButton.icon(
                        style: FilledButton.styleFrom(
                          backgroundColor: color,
                          minimumSize: const Size.fromHeight(50),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                        onPressed: () => context.push('/app/home/validate/${i.id}'),
                        icon: const Icon(Icons.verified_outlined),
                        label: const Text('Validar reporte',
                            style: TextStyle(fontWeight: FontWeight.w700)),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _banner(Incident i, Color color, bool verified) {
    final darker = Color.lerp(color, Colors.black, 0.18)!;
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [color, darker],
        ),
        borderRadius: const BorderRadius.vertical(bottom: Radius.circular(24)),
      ),
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(12, 6, 12, 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  _circleButton(Icons.arrow_back, () {
                    if (context.canPop()) {
                      context.pop();
                    } else {
                      context.go('/app/home');
                    }
                  }),
                  const Expanded(
                    child: Text(
                      'Detalle',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 17,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  _circleButton(Icons.notifications_none, () {}),
                ],
              ),
              const SizedBox(height: 12),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 6),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            _subtitle(i),
                            style: TextStyle(
                              color: Colors.white.withValues(alpha: 0.9),
                              fontSize: 12.5,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 0.6,
                            ),
                          ),
                        ),
                        if (verified)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.22),
                              borderRadius: BorderRadius.circular(999),
                            ),
                            child: const Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.verified, color: Colors.white, size: 15),
                                SizedBox(width: 4),
                                Text(
                                  'Verificado',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ],
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Text(
                      i.description.isEmpty
                          ? incidentLabels[i.type]!
                          : '"${i.description}"',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        height: 1.25,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Icon(Icons.location_on,
                            color: Colors.white.withValues(alpha: 0.9), size: 16),
                        const SizedBox(width: 4),
                        Text(
                          'Ubicación GPS',
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.9),
                            fontSize: 13,
                          ),
                        ),
                        const SizedBox(width: 14),
                        Icon(Icons.schedule,
                            color: Colors.white.withValues(alpha: 0.9), size: 16),
                        const SizedBox(width: 4),
                        Text(
                          _dateTime(i.createdAt),
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.9),
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
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
          padding: const EdgeInsets.all(9),
          child: Icon(icon, color: Colors.white, size: 20),
        ),
      ),
    );
  }

  Widget _sectionLabel(String text) {
    return Text(
      text,
      style: const TextStyle(
        fontSize: 12,
        fontWeight: FontWeight.w700,
        letterSpacing: 0.6,
        color: Color(0xFF94A3B8),
      ),
    );
  }

  Widget _cardShell({required Widget child}) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
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
      child: child,
    );
  }

  Widget _reportedByCard(Incident i) {
    final name = i.authorNombre?.trim().isNotEmpty == true ? i.authorNombre! : 'Anónimo';
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionLabel('REPORTADO POR'),
        const SizedBox(height: 10),
        _cardShell(
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: const BoxDecoration(
                  color: Color(0xFF8B5CF6),
                  shape: BoxShape.circle,
                ),
                alignment: Alignment.center,
                child: Text(
                  _initials(name),
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      name,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: _kText,
                      ),
                    ),
                    const SizedBox(height: 2),
                    const Text(
                      'Comunidad UTEQ',
                      style: TextStyle(fontSize: 12.5, color: _kMuted),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _validationsCard(Incident i) {
    const target = incidentValidationTarget;
    final count = i.likesCount.clamp(0, 1 << 30);
    final progress = target == 0 ? 1.0 : (count / target).clamp(0.0, 1.0);
    final complete = count >= target;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionLabel('VALIDACIONES · $count de $target'),
        const SizedBox(height: 10),
        _cardShell(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(
                    complete ? Icons.verified : Icons.people_alt_outlined,
                    color: complete ? const Color(0xFF10B981) : const Color(0xFF2563EB),
                    size: 20,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      complete
                          ? 'Reporte verificado por la comunidad'
                          : 'Faltan ${target - count} validaciones para confirmar',
                      style: const TextStyle(
                        fontSize: 13.5,
                        fontWeight: FontWeight.w600,
                        color: _kText,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              ClipRRect(
                borderRadius: BorderRadius.circular(999),
                child: LinearProgressIndicator(
                  value: progress,
                  minHeight: 8,
                  backgroundColor: const Color(0xFFE2E8F0),
                  valueColor: AlwaysStoppedAnimation(
                    complete ? const Color(0xFF10B981) : const Color(0xFF2563EB),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _locationCard(Incident i) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionLabel('UBICACIÓN'),
        const SizedBox(height: 10),
        ClipRRect(
          borderRadius: BorderRadius.circular(16),
          child: SizedBox(
            height: 170,
            child: FlutterMap(
              options: MapOptions(
                initialCenter: LatLng(i.lat, i.lng),
                initialZoom: 16,
                interactionOptions:
                    const InteractionOptions(flags: InteractiveFlag.none),
              ),
              children: [
                TileLayer(
                  urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                  userAgentPackageName: 'com.example.mobile_flutter',
                ),
                MarkerLayer(
                  markers: [
                    Marker(
                      point: LatLng(i.lat, i.lng),
                      width: 44,
                      height: 44,
                      child: Icon(
                        Icons.location_on,
                        color: incidentColors[i.type] ?? const Color(0xFFDC2626),
                        size: 40,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
