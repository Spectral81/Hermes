import 'package:flutter/material.dart';

import '../../../domain/constants.dart';
import '../../../domain/models.dart';
import 'spy_robo_icon.dart';

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

class _CategoryMeta {
  const _CategoryMeta({
    required this.type,
    required this.label,
    required this.icon,
    required this.color,
    required this.bg,
  });

  final IncidentType type;
  final String label;
  final IconData icon;
  final Color color;
  final Color bg;
}

const List<_CategoryMeta> _categories = [
  _CategoryMeta(
    type: IncidentType.robo,
    label: 'Robo',
    icon: Icons.warning_amber_rounded,
    color: Color(0xFFEF4444),
    bg: Color(0xFFFEF2F2),
  ),
  _CategoryMeta(
    type: IncidentType.accidente,
    label: 'Accidente',
    icon: Icons.add_circle_outline,
    color: Color(0xFFF59E0B),
    bg: Color(0xFFFFFBEB),
  ),
  _CategoryMeta(
    type: IncidentType.infraestructura,
    label: 'Falla',
    icon: Icons.bolt,
    color: Color(0xFF3B82F6),
    bg: Color(0xFFEFF6FF),
  ),
  _CategoryMeta(
    type: IncidentType.panico,
    label: 'Emergencia',
    icon: Icons.sos,
    color: Color(0xFFDC2626),
    bg: Color(0xFFFEE2E2),
  ),
];

const Color _kText = Color(0xFF0F172A);
const Color _kLabel = Color(0xFF94A3B8);
const Color _kBorder = Color(0xFFE5E7EB);
const Color _kBlue = Color(0xFF3B82F6);

class _ReportSheetState extends State<ReportSheet> {
  IncidentType _type = IncidentType.robo;
  InfraCategory? _category;
  Severity? _severity;
  final TextEditingController _descriptionCtrl = TextEditingController();
  int _descLength = 0;
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
    final maxHeight = MediaQuery.of(context).size.height * 0.85;
    return SafeArea(
      top: false,
      child: ConstrainedBox(
        constraints: BoxConstraints(maxHeight: maxHeight),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 10),
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: _kBorder,
                borderRadius: BorderRadius.circular(999),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 12, 4),
              child: Row(
                children: [
                  const Expanded(
                    child: Text(
                      'Nuevo reporte',
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        color: _kText,
                      ),
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.close, color: Color(0xFF64748B)),
                  ),
                ],
              ),
            ),
            Flexible(
              child: ListView(
                shrinkWrap: true,
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 8),
                children: [
                  _sectionLabel('CATEGORÍA'),
                  const SizedBox(height: 10),
                  _categoryGrid(),
                  if (_hasSubcategories()) ...[
                    const SizedBox(height: 20),
                    _sectionLabel('SUBCATEGORÍA'),
                    const SizedBox(height: 10),
                    _subcategoryPills(),
                  ],
                  const SizedBox(height: 20),
                  _sectionLabel('DESCRIPCIÓN'),
                  const SizedBox(height: 10),
                  _descriptionField(),
                  const SizedBox(height: 16),
                  _locationCard(),
                  if (_error != null) ...[
                    const SizedBox(height: 12),
                    Text(
                      _error!,
                      style: const TextStyle(color: Color(0xFFB91C1C)),
                    ),
                  ],
                ],
              ),
            ),
            _footer(),
          ],
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
        color: _kLabel,
      ),
    );
  }

  Widget _categoryGrid() {
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      childAspectRatio: 2.6,
      children: [
        for (final meta in _categories) _categoryCard(meta),
      ],
    );
  }

  Widget _categoryCard(_CategoryMeta meta) {
    final selected = _type == meta.type;
    return InkWell(
      borderRadius: BorderRadius.circular(14),
      onTap: () => setState(() {
        _type = meta.type;
        _category = null;
        _severity = null;
      }),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 14),
        decoration: BoxDecoration(
          color: selected ? meta.bg : Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: selected ? meta.color : _kBorder,
            width: selected ? 2 : 1,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 34,
              height: 34,
              decoration: BoxDecoration(
                color: meta.type == IncidentType.robo
                    ? Colors.white
                    : meta.color,
                borderRadius: BorderRadius.circular(10),
                border: meta.type == IncidentType.robo
                    ? Border.all(color: meta.color, width: 1.5)
                    : null,
              ),
              alignment: Alignment.center,
              child: meta.type == IncidentType.robo
                  ? const SpyRoboIcon(size: 26)
                  : Icon(meta.icon, color: Colors.white, size: 20),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                meta.label,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: selected ? meta.color : _kText,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  bool _hasSubcategories() =>
      _type == IncidentType.infraestructura || _type == IncidentType.accidente;

  Widget _subcategoryPills() {
    if (_type == IncidentType.infraestructura) {
      return Wrap(
        spacing: 8,
        runSpacing: 8,
        children: [
          for (final c in InfraCategory.values)
            _pill(
              label: infraCategoryLabels[c]!,
              selected: _category == c,
              onTap: () => setState(() => _category = c),
            ),
        ],
      );
    }
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        for (final s in Severity.values)
          _pill(
            label: severityLabels[s]!,
            selected: _severity == s,
            onTap: () => setState(() => _severity = s),
          ),
      ],
    );
  }

  Widget _pill({
    required String label,
    required bool selected,
    required VoidCallback onTap,
  }) {
    return InkWell(
      borderRadius: BorderRadius.circular(999),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 9),
        decoration: BoxDecoration(
          color: selected ? _kText : const Color(0xFFF1F5F9),
          borderRadius: BorderRadius.circular(999),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: selected ? Colors.white : const Color(0xFF475569),
          ),
        ),
      ),
    );
  }

  Widget _descriptionField() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        TextField(
          controller: _descriptionCtrl,
          maxLines: 4,
          maxLength: 500,
          onChanged: (v) => setState(() => _descLength = v.length),
          buildCounter: (_, {required currentLength, required isFocused, maxLength}) => null,
          style: const TextStyle(fontSize: 14, color: _kText),
          decoration: InputDecoration(
            hintText: 'Describe brevemente lo que pasó',
            hintStyle: const TextStyle(color: Color(0xFF94A3B8)),
            filled: true,
            fillColor: const Color(0xFFF8FAFC),
            contentPadding: const EdgeInsets.all(14),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: const BorderSide(color: _kBorder),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: const BorderSide(color: _kBlue, width: 1.5),
            ),
          ),
        ),
        const SizedBox(height: 6),
        Text(
          '$_descLength / 500',
          style: const TextStyle(fontSize: 12, color: _kLabel),
        ),
      ],
    );
  }

  Widget _locationCard() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFEFF6FF),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFDBEAFE)),
      ),
      child: Row(
        children: [
          const Icon(Icons.location_on, color: _kBlue, size: 22),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Tu ubicación actual',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: _kText,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'GPS preciso · ${widget.coords.lat.toStringAsFixed(5)}, ${widget.coords.lng.toStringAsFixed(5)}',
                  style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _footer() {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
      decoration: const BoxDecoration(
        border: Border(top: BorderSide(color: _kBorder)),
      ),
      child: Row(
        children: [
          TextButton(
            onPressed: _loading ? null : () => Navigator.of(context).pop(),
            style: TextButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
              foregroundColor: const Color(0xFF475569),
            ),
            child: const Text(
              'Cancelar',
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: FilledButton(
              onPressed: _loading ? null : _submit,
              style: FilledButton.styleFrom(
                backgroundColor: _kBlue,
                minimumSize: const Size.fromHeight(52),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
              child: _loading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Text(
                      'Enviar reporte',
                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
                    ),
            ),
          ),
        ],
      ),
    );
  }
}
