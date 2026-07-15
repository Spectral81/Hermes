import 'package:flutter/material.dart';

import '../../../domain/constants.dart';
import '../../../domain/models.dart';
import 'animated_asset_icon.dart';

/// Pin circular con icono animado del tipo de incidente.
class IncidentMarker extends StatefulWidget {
  const IncidentMarker({
    super.key,
    required this.type,
    this.selected = false,
    this.onTap,
  });

  final IncidentType type;
  final bool selected;
  final VoidCallback? onTap;

  @override
  State<IncidentMarker> createState() => _IncidentMarkerState();
}

class _IncidentMarkerState extends State<IncidentMarker>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _pulse;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat(reverse: true);
    _pulse = Tween<double>(begin: 1.0, end: 1.08).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final color = incidentColors[widget.type] ?? const Color(0xFF2563EB);
    final critical = isCriticalIncidentType(widget.type);
    final wire = incidentTypeToWire(widget.type);

    Widget circle = Container(
      width: 44,
      height: 44,
      decoration: BoxDecoration(
        color: Colors.white,
        shape: BoxShape.circle,
        border: Border.all(color: color, width: widget.selected ? 3.5 : 2.5),
        boxShadow: [
          BoxShadow(
            color: color.withValues(alpha: 0.35),
            blurRadius: widget.selected ? 14 : 8,
            spreadRadius: widget.selected ? 2 : 0,
          ),
        ],
      ),
      alignment: Alignment.center,
      child: IncidentTypeIcon(
        type: wire,
        size: widget.selected ? 30 : 26,
      ),
    );

    if (critical) {
      circle = ScaleTransition(scale: _pulse, child: circle);
    }

    return GestureDetector(
      onTap: widget.onTap,
      child: circle,
    );
  }
}
