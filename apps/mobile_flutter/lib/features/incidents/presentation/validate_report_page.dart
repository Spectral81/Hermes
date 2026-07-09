import 'package:flutter/material.dart';
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

class _ValidateReportPageState extends State<ValidateReportPage> {
  Incident? _incident;
  bool _loading = true;
  bool _sending = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final all = await incidentsRepository.fetchIncidents();
    Incident? found;
    for (final i in all) {
      if (i.id == widget.incidentId) {
        found = i;
        break;
      }
    }
    if (!mounted) return;
    setState(() {
      _incident = found;
      _loading = false;
    });
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
        const SnackBar(content: Text('Tu validación fue registrada.')),
      );
      context.pop();
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (_incident == null) {
      return const Scaffold(body: Center(child: Text('No se encontró el reporte.')));
    }
    final i = _incident!;
    final current = i.likesCount.clamp(0, incidentValidationTarget);
    final remaining = (incidentValidationTarget - current).clamp(0, incidentValidationTarget);
    return Scaffold(
      appBar: AppBar(title: const Text('Validar reporte')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(incidentLabels[i.type]!, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 22)),
                  const SizedBox(height: 4),
                  Text(timeAgo(i.createdAt), style: const TextStyle(color: Colors.black54)),
                  const SizedBox(height: 10),
                  Text(i.description.isEmpty ? 'Sin descripción' : i.description),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('VALIDACIONES  $current / $incidentValidationTarget',
                      style: const TextStyle(fontWeight: FontWeight.w800)),
                  const SizedBox(height: 8),
                  LinearProgressIndicator(value: current / incidentValidationTarget),
                  const SizedBox(height: 8),
                  Text(
                    remaining == 0
                        ? 'Reporte verificado por la comunidad'
                        : remaining == 1
                            ? 'Una validación más para verificar el reporte'
                            : '$remaining validaciones más para verificar el reporte',
                    style: const TextStyle(color: Colors.black54),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),
          const Text(
            '¿Es real y preciso este reporte?',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 18),
          FilledButton(
            onPressed: _sending ? null : _confirmReal,
            child: Text(_sending ? 'Enviando...' : 'Sí, es real'),
          ),
          const SizedBox(height: 10),
          FilledButton.tonal(
            onPressed: _sending
                ? null
                : () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Reporte marcado para revisión manual.')),
                    );
                    context.pop();
                  },
            child: const Text('Es falso'),
          ),
          const SizedBox(height: 10),
          TextButton(
            onPressed: _sending ? null : () => context.pop(),
            child: const Text('No estoy seguro'),
          ),
        ],
      ),
    );
  }
}
