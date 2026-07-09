import 'package:flutter/material.dart';

import '../../../domain/constants.dart';
import '../../../domain/models.dart';

class ReportSheet extends StatefulWidget {
  const ReportSheet({
    super.key,
    required this.coords,
    required this.onSubmit,
  });

  final ({double lat, double lng}) coords;
  final Future<void> Function(CreateIncidentInput input) onSubmit;

  @override
  State<ReportSheet> createState() => _ReportSheetState();
}

class _ReportSheetState extends State<ReportSheet> {
  IncidentType _type = IncidentType.robo;
  InfraCategory? _category;
  Severity? _severity;
  final TextEditingController _descriptionCtrl = TextEditingController();
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _descriptionCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      _error = null;
      _loading = true;
    });
    try {
      final input = CreateIncidentInput(
        type: _type,
        description: _descriptionCtrl.text.trim(),
        lat: widget.coords.lat,
        lng: widget.coords.lng,
        category: _type == IncidentType.infraestructura ? _category : null,
        severity: _type == IncidentType.accidente ? _severity : null,
      );
      await widget.onSubmit(input);
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      setState(() => _error = e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
        child: ListView(
          shrinkWrap: true,
          children: [
            const Text('Nuevo reporte', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
            const SizedBox(height: 12),
            DropdownButtonFormField<IncidentType>(
              initialValue: _type,
              items: IncidentType.values
                  .map((t) => DropdownMenuItem(value: t, child: Text(incidentLabels[t]!)))
                  .toList(),
              onChanged: (v) => setState(() {
                _type = v ?? IncidentType.robo;
                _category = null;
                _severity = null;
              }),
              decoration: const InputDecoration(labelText: 'Tipo'),
            ),
            if (_type == IncidentType.infraestructura) ...[
              const SizedBox(height: 12),
              DropdownButtonFormField<InfraCategory>(
                initialValue: _category,
                items: InfraCategory.values
                    .map((c) => DropdownMenuItem(value: c, child: Text(infraCategoryLabels[c]!)))
                    .toList(),
                onChanged: (v) => setState(() => _category = v),
                decoration: const InputDecoration(labelText: 'Categoría de falla'),
              ),
            ],
            if (_type == IncidentType.accidente) ...[
              const SizedBox(height: 12),
              DropdownButtonFormField<Severity>(
                initialValue: _severity,
                items: Severity.values
                    .map((s) => DropdownMenuItem(value: s, child: Text(severityLabels[s]!)))
                    .toList(),
                onChanged: (v) => setState(() => _severity = v),
                decoration: const InputDecoration(labelText: 'Gravedad'),
              ),
            ],
            const SizedBox(height: 12),
            TextField(
              controller: _descriptionCtrl,
              maxLines: 4,
              maxLength: 500,
              decoration: const InputDecoration(
                labelText: 'Descripción',
                hintText: 'Describe brevemente lo que pasó',
              ),
            ),
            if (_error != null) ...[
              const SizedBox(height: 8),
              Text(_error!, style: const TextStyle(color: Color(0xFFB91C1C))),
            ],
            const SizedBox(height: 10),
            FilledButton(
              onPressed: _loading ? null : _submit,
              child: Text(_loading ? 'Enviando...' : 'Enviar reporte'),
            ),
          ],
        ),
      ),
    );
  }
}
