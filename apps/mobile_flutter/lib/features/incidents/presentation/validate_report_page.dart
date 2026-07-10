import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';

import '../../../core/di/repositories.dart';
import '../../../domain/constants.dart';
import '../../../domain/helpers.dart';
import '../../../domain/models.dart';

class ValidateReportPage extends StatefulWidget {
  const ValidateReportPage({super.key, required this.incidentId});

  final String incidentId;

  @override
  State<ValidateReportPage> createState() => _ValidateReportPageState();
}

const Color _kBg = Color(0xFFF8FAFC);
const Color _kText = Color(0xFF0F172A);
const Color _kMuted = Color(0xFF64748B);
const Color _kBorder = Color(0xFFE5E7EB);

class _ValidateReportPageState extends State<ValidateReportPage> {
  Incident? _incident;
  bool _loading = true;
  bool _sending = false;
  ({double lat, double lng})? _coords;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final all = await incidentsRepository.fetchIncidents();
      Incident? found;
      for (final i in all) {
        if (i.id == widget.incidentId) {
          found = i;
          break;
        }
      }
      _coords = await _getCoords();
      if (!mounted) return;
      setState(() {
        _incident = found;
        _loading = false;
      });
    } catch (_) {
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

  String? _distanceLabel(Incident i) {
    if (_coords == null) return null;
    return formatDistance(distanceMeters(_coords!.lat, _coords!.lng, i.lat, i.lng));
  }

  String _categoryLine(Incident i) {
    final base = incidentLabels[i.type] ?? 'Reporte';
    if (i.type == IncidentType.infraestructura && i.category != null) {
      return '$base · ${infraCategoryLabels[i.category]}';
    }
    if (i.type == IncidentType.accidente && i.severity != null) {
      return '$base · ${severityLabels[i.severity]}';
    }
    return base;
  }

  Future<void> _confirmReal() async {
    if (_incident == null) return;
    setState(() => _sending = true);
    try {
      final res = await incidentsRepository.toggleLike(_incident!.id);
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
          likesCount: res.likesCount,
          createdAt: i.createdAt,
          createdBy: i.createdBy,
          authorNombre: i.authorNombre,
          likedByMe: res.liked,
        );
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            res.verifiedNow
                ? 'Reporte verificado por la comunidad.'
                : 'Tu validación fue registrada.',
          ),
        ),
      );
      context.pop();
    } finally {
      if (mounted) setState(() => _sending = false);
    }
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
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('No se encontró el reporte.'),
              const SizedBox(height: 12),
              TextButton(onPressed: () => context.pop(), child: const Text('Volver')),
            ],
          ),
        ),
      );
    }

    final i = _incident!;
    final color = incidentColors[i.type] ?? const Color(0xFFEF4444);
    final current = i.likesCount.clamp(0, incidentValidationTarget);
    final remaining = (incidentValidationTarget - current).clamp(0, incidentValidationTarget);
    final dist = _distanceLabel(i);

    return Scaffold(
      backgroundColor: _kBg,
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(8, 8, 16, 0),
              child: Row(
                children: [
                  IconButton(
                    onPressed: () => context.pop(),
                    icon: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: _kBorder),
                      ),
                      child: const Icon(Icons.close, size: 20, color: _kMuted),
                    ),
                  ),
                  const Expanded(
                    child: Text(
                      'Validar reporte',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: _kText),
                    ),
                  ),
                  const SizedBox(width: 48),
                ],
              ),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 12, 20, 8),
                children: [
                  _incidentCard(i, color, dist),
                  const SizedBox(height: 20),
                  _validationsSection(current, remaining),
                  const SizedBox(height: 28),
                  const Text(
                    '¿Es real y preciso este reporte?',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: _kText),
                  ),
                ],
              ),
            ),
            _footerActions(),
          ],
        ),
      ),
    );
  }

  Widget _incidentCard(Incident i, Color color, String? dist) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: _kBorder),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(incidentIcons[i.type], color: color, size: 24),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _categoryLine(i).toUpperCase(),
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                        color: color,
                        letterSpacing: 0.4,
                      ),
                    ),
                    Text(
                      timeAgo(i.createdAt),
                      style: const TextStyle(fontSize: 12.5, color: _kMuted),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Text(
            i.description.isEmpty ? 'Sin descripción' : '"${i.description}"',
            style: const TextStyle(
              fontSize: 15,
              height: 1.45,
              color: _kText,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 14),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFFF1F5F9),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('LUGAR', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: _kMuted, letterSpacing: 0.5)),
                      SizedBox(height: 2),
                      Text('Ubicación GPS', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: _kText)),
                    ],
                  ),
                ),
                if (dist != null)
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        const Text('DISTANCIA', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: _kMuted, letterSpacing: 0.5)),
                        const SizedBox(height: 2),
                        Text('$dist de ti', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: _kText)),
                      ],
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _validationsSection(int current, int remaining) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'VALIDACIONES',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.6,
                color: Color(0xFF94A3B8),
              ),
            ),
            Text(
              '$current / $incidentValidationTarget',
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: _kText),
            ),
          ],
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            for (var n = 0; n < incidentValidationTarget; n++)
              Expanded(
                child: Container(
                  height: 8,
                  margin: EdgeInsets.only(right: n < incidentValidationTarget - 1 ? 6 : 0),
                  decoration: BoxDecoration(
                    color: n < current ? const Color(0xFF10B981) : const Color(0xFFE2E8F0),
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
              ),
          ],
        ),
        const SizedBox(height: 8),
        Text(
          remaining == 0
              ? 'Reporte verificado por la comunidad'
              : remaining == 1
                  ? 'Una validación más para verificar el reporte'
                  : '$remaining validaciones más para verificar el reporte',
          style: const TextStyle(fontSize: 13, color: _kMuted),
        ),
      ],
    );
  }

  Widget _footerActions() {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: _kBorder)),
      ),
      child: Column(
        children: [
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: _sending ? null : _confirmReal,
              style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFF10B981),
                minimumSize: const Size.fromHeight(52),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              icon: _sending
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Icon(Icons.check),
              label: Text(
                _sending ? 'Enviando...' : 'Sí, es real',
                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
              ),
            ),
          ),
          const SizedBox(height: 10),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: _sending
                  ? null
                  : () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Reporte marcado para revisión manual.')),
                      );
                      context.pop();
                    },
              style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFFEF4444),
                minimumSize: const Size.fromHeight(52),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              icon: const Icon(Icons.close),
              label: const Text('Es falso', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
            ),
          ),
          const SizedBox(height: 6),
          TextButton(
            onPressed: _sending ? null : () => context.pop(),
            child: const Text('No estoy seguro', style: TextStyle(color: _kMuted, fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
  }
}
