import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

import '../../../core/config/env.dart';
import '../../../core/di/repositories.dart';
import '../../../core/network/api_auth.dart';
import '../../../domain/models.dart';
import '../../incidents/presentation/animated_asset_icon.dart';

class EventsPage extends StatefulWidget {
  const EventsPage({super.key});

  @override
  State<EventsPage> createState() => _EventsPageState();
}

class _EventsPageState extends State<EventsPage> {
  final _dio = Dio(BaseOptions(baseUrl: AppEnv.webApiUrl ?? ''));
  List<Map<String, dynamic>> _events = [];
  Map<String, dynamic>? _detailEvent;
  List<Map<String, dynamic>> _apps = [];
  Map<String, dynamic>? _myApplication;
  String? _selectedId;
  String _filter = 'todos';
  bool _loading = true;
  bool _silentRefreshing = false;
  String? _error;
  UserRole _role = UserRole.estudiante;
  Timer? _pollTimer;

  static const _campusLat = 20.6534;
  static const _campusLng = -100.4045;

  Future<Options> _authOptions() async {
    return Options(
      headers: await authHeaders(),
      contentType: 'application/json',
    );
  }

  @override
  void initState() {
    super.initState();
    _boot();
    _pollTimer = Timer.periodic(const Duration(seconds: 10), (_) {
      if (!mounted || _silentRefreshing) return;
      _refreshAll(silent: true);
    });
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    super.dispose();
  }

  Future<void> _boot() async {
    try {
      _role = await profileRepository.fetchMyRole();
    } catch (_) {}
    await _loadEvents();
  }

  Future<void> _refreshAll({bool silent = false}) async {
    if (silent) {
      if (_silentRefreshing) return;
      _silentRefreshing = true;
    }
    try {
      await _loadEvents(silent: silent);
      final id = _selectedId;
      if (id != null) {
        await _openEvent(id, silent: silent);
      }
    } finally {
      _silentRefreshing = false;
    }
  }

  Future<void> _loadEvents({bool silent = false}) async {
    if (AppEnv.webApiUrl == null) {
      setState(() {
        _loading = false;
        _error = 'Configura WEB_API_URL para eventos';
      });
      return;
    }
    if (!silent) setState(() => _loading = true);
    try {
      final res = await _dio.get(
        '/api/events',
        options: Options(headers: {}),
      );
      _events = (res.data as List)
          .cast<Map>()
          .map((e) => Map<String, dynamic>.from(e))
          .where((e) => e['status'] == 'abierto' && !_isEventPast(e))
          .toList();
      _error = null;
    } catch (e) {
      if (!silent) _error = e.toString();
    } finally {
      if (mounted && !silent) setState(() => _loading = false);
      if (mounted && silent) setState(() {});
    }
  }

  Future<void> _openEvent(String id, {bool silent = false}) async {
    if (!silent) {
      setState(() {
        _selectedId = id;
        _loading = true;
      });
    } else {
      _selectedId = id;
    }
    try {
      final res = await _dio.get(
        '/api/events/$id',
        options: await _authOptions(),
      );
      final data = Map<String, dynamic>.from(res.data as Map);
      _detailEvent = Map<String, dynamic>.from(data['event'] as Map);
      _apps = ((data['applications'] as List?) ?? [])
          .cast<Map>()
          .map((e) => Map<String, dynamic>.from(e))
          .toList();
      final mine = data['my_application'];
      _myApplication =
          mine is Map ? Map<String, dynamic>.from(mine) : null;
      _error = null;
    } catch (e) {
      if (!silent) _error = e.toString();
    } finally {
      if (mounted && !silent) setState(() => _loading = false);
      if (mounted && silent) setState(() {});
    }
  }

  static const _monthsShort = [
    'ene', 'feb', 'mar', 'abr', 'may', 'jun',
    'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
  ];

  String _formatStartsAt(dynamic raw) {
    if (raw == null || (raw is String && raw.trim().isEmpty)) {
      return 'Fecha por confirmar';
    }
    final d = DateTime.tryParse(raw.toString())?.toLocal();
    if (d == null) return 'Fecha por confirmar';
    final hh = d.hour.toString().padLeft(2, '0');
    final mm = d.minute.toString().padLeft(2, '0');
    return '${d.day} ${_monthsShort[d.month - 1]} ${d.year} · $hh:$mm';
  }

  String _formatPickedDate(DateTime d) =>
      '${d.day} ${_monthsShort[d.month - 1]} ${d.year}';

  String _formatEventRange(Map<String, dynamic> e) {
    final start = _formatStartsAt(e['starts_at']);
    final endRaw = e['ends_at'];
    if (endRaw == null || (endRaw is String && endRaw.trim().isEmpty)) return start;
    return '$start → ${_formatStartsAt(endRaw)}';
  }

  Widget _metaRow(String asset, String text) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Image.asset(
          asset,
          width: 16,
          height: 16,
          fit: BoxFit.contain,
          errorBuilder: (_, __, ___) => const SizedBox(width: 16, height: 16),
        ),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            text,
            style: const TextStyle(fontSize: 12.5, color: Color(0xFF64748B), height: 1.25),
          ),
        ),
      ],
    );
  }

  bool _isEventPast(Map<String, dynamic> e) {
    final now = DateTime.now();
    DateTime? endOfDay(DateTime d) =>
        DateTime(d.year, d.month, d.day, 23, 59, 59, 999);

    final ends = DateTime.tryParse('${e['ends_at']}')?.toLocal();
    if (ends != null) {
      return endOfDay(ends)!.isBefore(now);
    }
    final starts = DateTime.tryParse('${e['starts_at']}')?.toLocal();
    if (starts == null) return false;
    return endOfDay(starts)!.isBefore(now);
  }

  String _myAppBannerText(String status) {
    switch (status) {
      case 'aceptado':
        return '✅ Tu solicitud fue aceptada';
      case 'pendiente':
        return '⏳ Solicitud en revisión';
      case 'rechazado':
        return '❌ Solicitud rechazada';
      default:
        return 'Tu solicitud: $status';
    }
  }

  Color _myAppBannerColor(String status) {
    switch (status) {
      case 'aceptado':
        return const Color(0xFF059669);
      case 'pendiente':
        return const Color(0xFFD97706);
      case 'rechazado':
        return const Color(0xFFDC2626);
      default:
        return const Color(0xFF64748B);
    }
  }

  bool get _isAdmin => _role == UserRole.adminGeneral;

  bool get _canShowParticipate {
    final open = _detailEvent?['status'] == 'abierto';
    if (!open) return false;
    if (_myApplication != null && !_isAdmin) return false;
    if (_myApplication != null && _isAdmin) {
      // Admin can still review; Participar only if they haven't applied.
      return false;
    }
    return true;
  }

  Future<void> _apply() async {
    if (_selectedId == null) return;
    if (_myApplication != null) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Ya enviaste una solicitud para este evento')),
        );
      }
      return;
    }

    final name = TextEditingController();
    final group = TextEditingController();
    final sell = TextEditingController();
    var category = 'comida';

    final ok = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setLocal) {
            final bottom = MediaQuery.of(ctx).viewInsets.bottom;
            return Padding(
              padding: EdgeInsets.fromLTRB(20, 12, 20, 20 + bottom),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Center(
                      child: Container(
                        width: 40,
                        height: 4,
                        decoration: BoxDecoration(
                          color: const Color(0xFFE5E7EB),
                          borderRadius: BorderRadius.circular(999),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      '🎉 Participar en el evento',
                      style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'Cuéntanos sobre tu puesto para la kermés.',
                      style: TextStyle(color: Color(0xFF64748B)),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: name,
                      decoration: const InputDecoration(
                        labelText: '🌮 Negocio',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: group,
                      decoration: const InputDecoration(
                        labelText: '👥 Grupo',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: sell,
                      decoration: const InputDecoration(
                        labelText: '🛍️ Qué venden',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      initialValue: category,
                      items: const [
                        DropdownMenuItem(value: 'comida', child: Text('🌮 Comida')),
                        DropdownMenuItem(value: 'snacks', child: Text('🥪 Snacks')),
                        DropdownMenuItem(value: 'bebidas', child: Text('☕ Bebidas')),
                        DropdownMenuItem(value: 'postres', child: Text('🍓 Postres')),
                        DropdownMenuItem(value: 'otro', child: Text('🛍️ Otro')),
                      ],
                      onChanged: (v) => setLocal(() => category = v ?? 'comida'),
                      decoration: const InputDecoration(
                        labelText: 'Categoría',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 20),
                    Row(
                      children: [
                        TextButton(
                          onPressed: () => Navigator.pop(ctx, false),
                          child: const Text('Cancelar'),
                        ),
                        const Spacer(),
                        FilledButton.icon(
                          onPressed: () => Navigator.pop(ctx, true),
                          icon: const Icon(Icons.send_rounded),
                          label: const Text('Enviar solicitud'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );

    if (ok != true) return;
    try {
      await _dio.post(
        '/api/events/$_selectedId',
        data: {
          'business_name': name.text.trim(),
          'group_name': group.text.trim(),
          'what_they_sell': sell.text.trim(),
          'category': category,
        },
        options: await _authOptions(),
      );
      await _refreshAll();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Solicitud enviada 🎉')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(dioErrorMessage(e))),
        );
      }
    }
  }

  Future<void> _review(String appId, String status) async {
    if (_selectedId == null) return;
    try {
      await _dio.patch(
        '/api/events/$_selectedId/applications/$appId',
        data: {'status': status},
        options: await _authOptions(),
      );
      await _refreshAll();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(dioErrorMessage(e))),
        );
      }
    }
  }

  Future<void> _toggleEventStatus() async {
    if (!_isAdmin || _selectedId == null || _detailEvent == null) return;
    final current = '${_detailEvent!['status']}';
    final next = current == 'abierto' ? 'cerrado' : 'abierto';
    try {
      await _dio.patch(
        '/api/events/$_selectedId',
        data: {'status': next},
        options: await _authOptions(),
      );
      if (mounted) {
        setState(() {
          _detailEvent = {..._detailEvent!, 'status': next};
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(next == 'cerrado' ? 'Evento cerrado' : 'Evento abierto'),
          ),
        );
      }
      await _refreshAll(silent: true);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(dioErrorMessage(e))),
        );
      }
    }
  }

  Future<void> _createEvent() async {
    if (!_isAdmin) return;

    final title = TextEditingController();
    final desc = TextEditingController();
    final place = TextEditingController(text: 'Campus UTEQ');
    final cupo = TextEditingController(text: '20');
    DateTime? startDate;
    TimeOfDay? startTime;
    DateTime? endDate;
    TimeOfDay? endTime;
    var pin = const LatLng(_campusLat, _campusLng);

    final ok = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setLocal) {
            final bottom = MediaQuery.of(ctx).viewInsets.bottom;

            Future<void> pickStart() async {
              final now = DateTime.now();
              final d = await showDatePicker(
                context: ctx,
                initialDate: startDate ?? now,
                firstDate: DateTime(now.year, now.month, now.day),
                lastDate: DateTime(now.year + 2),
              );
              if (d == null) return;
              if (!ctx.mounted) return;
              final t = await showTimePicker(
                context: ctx,
                initialTime: startTime ?? const TimeOfDay(hour: 10, minute: 0),
              );
              if (t == null) return;
              setLocal(() {
                startDate = d;
                startTime = t;
                endDate ??= d;
                endTime ??= TimeOfDay(hour: (t.hour + 6) % 24, minute: t.minute);
              });
            }

            Future<void> pickEnd() async {
              final now = DateTime.now();
              final d = await showDatePicker(
                context: ctx,
                initialDate: endDate ?? startDate ?? now,
                firstDate: DateTime(now.year, now.month, now.day),
                lastDate: DateTime(now.year + 2),
              );
              if (d == null) return;
              if (!ctx.mounted) return;
              final t = await showTimePicker(
                context: ctx,
                initialTime: endTime ?? const TimeOfDay(hour: 16, minute: 0),
              );
              if (t == null) return;
              setLocal(() {
                endDate = d;
                endTime = t;
              });
            }

            String rangeLabel(DateTime? d, TimeOfDay? t, String fallback) {
              if (d == null || t == null) return fallback;
              return '${_formatPickedDate(d)} · ${t.format(ctx)}';
            }

            return Padding(
              padding: EdgeInsets.fromLTRB(20, 12, 20, 20 + bottom),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Center(
                      child: Container(
                        width: 40,
                        height: 4,
                        decoration: BoxDecoration(
                          color: const Color(0xFFE5E7EB),
                          borderRadius: BorderRadius.circular(999),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      'Nuevo evento',
                      style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'Define fechas y coloca el pin donde se realizará.',
                      style: TextStyle(color: Color(0xFF64748B)),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: title,
                      decoration: const InputDecoration(
                        labelText: 'Título',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: desc,
                      maxLines: 3,
                      decoration: const InputDecoration(
                        labelText: 'Descripción',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: place,
                      decoration: const InputDecoration(
                        labelText: 'Lugar (etiqueta)',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: cupo,
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(
                        labelText: 'Cupo de puestos',
                        border: const OutlineInputBorder(),
                        prefixIcon: Padding(
                          padding: const EdgeInsets.all(10),
                          child: Image.asset(
                            'assets/markers/event-store.png',
                            width: 22,
                            height: 22,
                            errorBuilder: (_, __, ___) =>
                                const Icon(Icons.storefront_outlined),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    OutlinedButton.icon(
                      onPressed: pickStart,
                      icon: Image.asset(
                        'assets/markers/event-calendar.png',
                        width: 20,
                        height: 20,
                        errorBuilder: (_, __, ___) =>
                            const Icon(Icons.play_arrow_rounded),
                      ),
                      label: Text(rangeLabel(startDate, startTime, 'Fecha de inicio')),
                    ),
                    const SizedBox(height: 8),
                    OutlinedButton.icon(
                      onPressed: pickEnd,
                      icon: Image.asset(
                        'assets/markers/event-calendar.png',
                        width: 20,
                        height: 20,
                        errorBuilder: (_, __, ___) =>
                            const Icon(Icons.stop_rounded),
                      ),
                      label: Text(rangeLabel(endDate, endTime, 'Fecha de fin')),
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      'Ubicación en el mapa',
                      style: TextStyle(fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 6),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(14),
                      child: SizedBox(
                        height: 200,
                        child: FlutterMap(
                          options: MapOptions(
                            initialCenter: pin,
                            initialZoom: 16,
                            onTap: (_, p) => setLocal(() => pin = p),
                          ),
                          children: [
                            TileLayer(
                              urlTemplate:
                                  'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
                              subdomains: const ['a', 'b', 'c', 'd'],
                              userAgentPackageName: 'mx.edu.uteq.hermes',
                            ),
                            MarkerLayer(
                              markers: [
                                Marker(
                                  point: pin,
                                  width: 48,
                                  height: 48,
                                  child: Image.asset(
                                    'assets/markers/event-pin.png',
                                    width: 42,
                                    height: 42,
                                    fit: BoxFit.contain,
                                    errorBuilder: (_, __, ___) => const Icon(
                                      Icons.place,
                                      color: Color(0xFFEF4444),
                                      size: 40,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'Toca el mapa para colocar el pin del evento',
                      style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                    ),
                    const SizedBox(height: 20),
                    Row(
                      children: [
                        TextButton(
                          onPressed: () => Navigator.pop(ctx, false),
                          child: const Text('Cancelar'),
                        ),
                        const Spacer(),
                        FilledButton(
                          onPressed: () {
                            if (startDate == null ||
                                startTime == null ||
                                endDate == null ||
                                endTime == null) {
                              ScaffoldMessenger.of(ctx).showSnackBar(
                                const SnackBar(
                                  content: Text('Elige fecha de inicio y fecha de fin'),
                                ),
                              );
                              return;
                            }
                            final start = DateTime(
                              startDate!.year,
                              startDate!.month,
                              startDate!.day,
                              startTime!.hour,
                              startTime!.minute,
                            );
                            final end = DateTime(
                              endDate!.year,
                              endDate!.month,
                              endDate!.day,
                              endTime!.hour,
                              endTime!.minute,
                            );
                            if (!end.isAfter(start)) {
                              ScaffoldMessenger.of(ctx).showSnackBar(
                                const SnackBar(
                                  content: Text('La fecha de fin debe ser posterior al inicio'),
                                ),
                              );
                              return;
                            }
                            Navigator.pop(ctx, true);
                          },
                          child: const Text('Crear evento'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );

    if (ok != true ||
        startDate == null ||
        startTime == null ||
        endDate == null ||
        endTime == null) {
      return;
    }

    final startsAt = DateTime(
      startDate!.year,
      startDate!.month,
      startDate!.day,
      startTime!.hour,
      startTime!.minute,
    ).toUtc().toIso8601String();
    final endsAt = DateTime(
      endDate!.year,
      endDate!.month,
      endDate!.day,
      endTime!.hour,
      endTime!.minute,
    ).toUtc().toIso8601String();

    try {
      final res = await _dio.post(
        '/api/events',
        data: {
          'title': title.text.trim(),
          'description': desc.text.trim(),
          'location_label': place.text.trim(),
          'lat': pin.latitude,
          'lng': pin.longitude,
          'max_vendors': int.tryParse(cupo.text) ?? 20,
          'starts_at': startsAt,
          'ends_at': endsAt,
        },
        options: await _authOptions(),
      );
      await _refreshAll();
      final id = (res.data as Map)['id'] as String?;
      if (id != null) await _openEvent(id);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(dioErrorMessage(e, fallback: 'No se pudo crear el evento'))),
        );
      }
    }
  }

  void _closeDetail() {
    setState(() {
      _detailEvent = null;
      _selectedId = null;
      _apps = [];
      _myApplication = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    final accepted = _apps.where((a) => a['status'] == 'aceptado').where((a) {
      if (_filter == 'todos') return true;
      return a['category'] == _filter;
    }).toList();
    final pending = _apps.where((a) => a['status'] == 'pendiente').toList();

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: Text(_detailEvent == null ? 'Eventos' : '${_detailEvent!['title']}'),
        leading: _detailEvent != null
            ? IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: _closeDetail,
              )
            : null,
        actions: [
          if (_isAdmin && _detailEvent == null)
            TextButton(
              onPressed: _createEvent,
              child: const Text('Crear evento'),
            ),
          if (_isAdmin && _detailEvent != null)
            TextButton(
              onPressed: _toggleEventStatus,
              child: Text(
                _detailEvent!['status'] == 'abierto'
                    ? 'Cerrar evento'
                    : 'Abrir evento',
              ),
            ),
          if (_detailEvent != null && _canShowParticipate)
            TextButton(onPressed: _apply, child: const Text('Participar')),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null && _detailEvent == null && _events.isEmpty
              ? Center(child: Text(_error!))
              : _detailEvent == null
                  ? RefreshIndicator(
                      onRefresh: () => _refreshAll(),
                      child: _events.isEmpty
                          ? ListView(
                              physics: const AlwaysScrollableScrollPhysics(),
                              children: const [
                                SizedBox(height: 120),
                                Center(
                                  child: Text(
                                    '🎊 No hay eventos por ahora',
                                    style: TextStyle(color: Color(0xFF64748B)),
                                  ),
                                ),
                              ],
                            )
                          : ListView.builder(
                              padding: const EdgeInsets.all(16),
                              itemCount: _events.length,
                              itemBuilder: (_, i) {
                                final e = _events[i];
                                final open = e['status'] == 'abierto';
                                return Card(
                                  margin: const EdgeInsets.only(bottom: 10),
                                  child: ListTile(
                                    leading: const AnimatedAssetIcon(
                                      assetPath: 'assets/markers/kermes-icon.png',
                                      size: 36,
                                      fallbackEmoji: '🎈',
                                    ),
                                    title: Text(
                                      '${e['title']}',
                                      style: const TextStyle(fontWeight: FontWeight.w700),
                                    ),
                                    subtitle: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        const SizedBox(height: 4),
                                        _metaRow(
                                          'assets/markers/event-calendar.png',
                                          _formatEventRange(e),
                                        ),
                                        const SizedBox(height: 2),
                                        _metaRow(
                                          'assets/markers/event-pin.png',
                                          '${e['location_label'] ?? 'Campus'}',
                                        ),
                                        const SizedBox(height: 2),
                                        _metaRow(
                                          'assets/markers/event-store.png',
                                          '${e['accepted_count'] ?? 0}/${e['max_vendors']} puestos',
                                        ),
                                      ],
                                    ),
                                    isThreeLine: true,
                                    trailing: Text(
                                      open ? 'Abierto' : 'Cerrado',
                                      style: TextStyle(
                                        color: open
                                            ? const Color(0xFF059669)
                                            : Colors.grey,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                    onTap: () => _openEvent(e['id'] as String),
                                  ),
                                );
                              },
                            ),
                    )
                  : RefreshIndicator(
                      onRefresh: () => _refreshAll(),
                      child: ListView(
                        padding: const EdgeInsets.all(16),
                        children: [
                          if (_myApplication != null) ...[
                            Container(
                              width: double.infinity,
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(
                                color: _myAppBannerColor(
                                  '${_myApplication!['status']}',
                                ).withValues(alpha: 0.12),
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(
                                  color: _myAppBannerColor(
                                    '${_myApplication!['status']}',
                                  ).withValues(alpha: 0.35),
                                ),
                              ),
                              child: Text(
                                _myAppBannerText('${_myApplication!['status']}'),
                                style: TextStyle(
                                  fontWeight: FontWeight.w700,
                                  color: _myAppBannerColor(
                                    '${_myApplication!['status']}',
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(height: 12),
                          ],
                          Text(
                            '${_detailEvent!['description'] ?? ''}',
                            style: const TextStyle(color: Color(0xFF64748B)),
                          ),
                          const SizedBox(height: 8),
                          _metaRow(
                            'assets/markers/event-calendar.png',
                            _formatEventRange(_detailEvent!),
                          ),
                          const SizedBox(height: 4),
                          _metaRow(
                            'assets/markers/event-pin.png',
                            '${_detailEvent!['location_label'] ?? 'Campus'}',
                          ),
                          const SizedBox(height: 8),
                          Text(
                            _detailEvent!['status'] == 'abierto'
                                ? '· Abierto'
                                : '· Cerrado',
                            style: TextStyle(
                              color: _detailEvent!['status'] == 'abierto'
                                  ? const Color(0xFF059669)
                                  : Colors.grey,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(height: 12),
                          SingleChildScrollView(
                            scrollDirection: Axis.horizontal,
                            child: Row(
                              children: [
                                for (final f in [
                                  'todos',
                                  'comida',
                                  'snacks',
                                  'bebidas',
                                  'postres',
                                  'otro',
                                ])
                                  Padding(
                                    padding: const EdgeInsets.only(right: 8),
                                    child: ChoiceChip(
                                      label: Text(f == 'todos' ? 'Todos' : f),
                                      selected: _filter == f,
                                      onSelected: (_) =>
                                          setState(() => _filter = f),
                                    ),
                                  ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 12),
                          ...accepted.map((v) {
                            final eventOpen = _detailEvent!['status'] == 'abierto';
                            return Card(
                              child: ListTile(
                                leading: CircleAvatar(
                                  backgroundColor: const Color(0xFFFFF7ED),
                                  child: Padding(
                                    padding: const EdgeInsets.all(6),
                                    child: Image.asset(
                                      'assets/markers/event-store.png',
                                      fit: BoxFit.contain,
                                      errorBuilder: (_, __, ___) =>
                                          const Text('🛍️', style: TextStyle(fontSize: 22)),
                                    ),
                                  ),
                                ),
                                title: Text('${v['business_name']}'),
                                subtitle: Text('${v['what_they_sell']}'),
                                trailing: Text(
                                  eventOpen ? '· Abierto' : '· Cerrado',
                                  style: TextStyle(
                                    color: eventOpen
                                        ? const Color(0xFF059669)
                                        : const Color(0xFF64748B),
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
                            );
                          }),
                          if (_isAdmin) ...[
                            const SizedBox(height: 20),
                            Text(
                              'Solicitudes (${pending.length})',
                              style: const TextStyle(fontWeight: FontWeight.w800),
                            ),
                            ...pending.map(
                              (a) => Card(
                                child: ListTile(
                                  title: Text('${a['business_name']}'),
                                  subtitle: Text('${a['what_they_sell']}'),
                                  trailing: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      IconButton(
                                        icon: const Icon(Icons.check,
                                            color: Colors.green),
                                        onPressed: () => _review(
                                            a['id'] as String, 'aceptado'),
                                      ),
                                      IconButton(
                                        icon: const Icon(Icons.close,
                                            color: Colors.red),
                                        onPressed: () => _review(
                                            a['id'] as String, 'rechazado'),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
    );
  }
}
