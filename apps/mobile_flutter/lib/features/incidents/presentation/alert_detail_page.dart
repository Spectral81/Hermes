import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';

import '../../../core/di/repositories.dart';
import '../../../domain/constants.dart';
import '../../../domain/helpers.dart';
import '../../../domain/models.dart';

class AlertDetailPage extends StatefulWidget {
  const AlertDetailPage({super.key, required this.incidentId});

  final String incidentId;

  @override
  State<AlertDetailPage> createState() => _AlertDetailPageState();
}

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

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (_incident == null) {
      return const Scaffold(body: Center(child: Text('No se encontró el reporte.')));
    }

    final i = _incident!;
    return Scaffold(
      appBar: AppBar(title: const Text('Detalle')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(incidentLabels[i.type]!, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800)),
          const SizedBox(height: 4),
          Text('${timeAgo(i.createdAt)} · ${i.authorNombre ?? 'Anónimo'}'),
          const SizedBox(height: 12),
          Text(i.description.isEmpty ? 'Sin descripción' : i.description),
          const SizedBox(height: 16),
          SizedBox(
            height: 180,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: FlutterMap(
                options: MapOptions(
                  initialCenter: LatLng(i.lat, i.lng),
                  initialZoom: 16,
                  interactionOptions: const InteractionOptions(flags: InteractiveFlag.none),
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
                        width: 40,
                        height: 40,
                        child: const Icon(Icons.location_on, color: Color(0xFFDC2626), size: 34),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              OutlinedButton.icon(
                onPressed: _like,
                icon: Icon(i.likedByMe ? Icons.thumb_up : Icons.thumb_up_outlined),
                label: Text('${i.likesCount}'),
              ),
              const SizedBox(width: 10),
              TextButton(
                onPressed: () => context.push('/app/home/validate/${i.id}'),
                child: const Text('Validar'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
