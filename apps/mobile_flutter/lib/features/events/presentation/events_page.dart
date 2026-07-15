import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/config/env.dart';
import '../../../core/di/repositories.dart';
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

  Map<String, String> _headers() {
    final token = Supabase.instance.client.auth.currentSession?.accessToken;
    if (token == null) return {};
    return {'Authorization': 'Bearer $token'};
  }

  @override
  void initState() {
    super.initState();
    _boot();
    _pollTimer = Timer.periodic(const Duration(seconds: 20), (_) {
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
        options: Options(headers: _headers()),
      );
      _events = (res.data as List)
          .cast<Map>()
          .map((e) => Map<String, dynamic>.from(e))
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
        options: Options(headers: _headers()),
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
        options: Options(headers: _headers(), contentType: 'application/json'),
      );
      await _refreshAll();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Solicitud enviada 🎉')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    }
  }

  Future<void> _review(String appId, String status) async {
    if (_selectedId == null) return;
    try {
      await _dio.patch(
        '/api/events/$_selectedId/applications/$appId',
        data: {'status': status},
        options: Options(headers: _headers(), contentType: 'application/json'),
      );
      await _refreshAll();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    }
  }

  Future<void> _createEvent() async {
    if (!_isAdmin) return;

    final title = TextEditingController();
    final desc = TextEditingController();
    final place = TextEditingController(text: 'Campus UTEQ');
    final cupo = TextEditingController(text: '20');
    DateTime? pickedDate;
    TimeOfDay? pickedTime;

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
            final dateLabel = pickedDate == null
                ? 'Elegir fecha'
                : _formatPickedDate(pickedDate!);
            final timeLabel = pickedTime == null
                ? 'Elegir hora'
                : pickedTime!.format(ctx);

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
                      '🎊 Nuevo evento',
                      style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'Crea una kermés o feria en campus.',
                      style: TextStyle(color: Color(0xFF64748B)),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: title,
                      decoration: const InputDecoration(
                        labelText: '📌 Título',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: desc,
                      maxLines: 3,
                      decoration: const InputDecoration(
                        labelText: '📝 Descripción',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: place,
                      decoration: const InputDecoration(
                        labelText: '📍 Lugar',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: cupo,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: '🏪 Cupo de puestos',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () async {
                              final now = DateTime.now();
                              final d = await showDatePicker(
                                context: ctx,
                                initialDate: pickedDate ?? now,
                                firstDate: DateTime(now.year, now.month, now.day),
                                lastDate: DateTime(now.year + 2),
                              );
                              if (d != null) setLocal(() => pickedDate = d);
                            },
                            icon: const Icon(Icons.calendar_today_outlined),
                            label: Text('📅 $dateLabel'),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () async {
                              final t = await showTimePicker(
                                context: ctx,
                                initialTime: pickedTime ?? TimeOfDay.now(),
                              );
                              if (t != null) setLocal(() => pickedTime = t);
                            },
                            icon: const Icon(Icons.schedule),
                            label: Text('🕐 $timeLabel'),
                          ),
                        ),
                      ],
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
                          onPressed: () {
                            if (pickedDate == null || pickedTime == null) {
                              ScaffoldMessenger.of(ctx).showSnackBar(
                                const SnackBar(
                                  content: Text('Elige fecha y hora del evento'),
                                ),
                              );
                              return;
                            }
                            Navigator.pop(ctx, true);
                          },
                          icon: const Icon(Icons.add),
                          label: const Text('Crear evento'),
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

    if (ok != true || pickedDate == null || pickedTime == null) return;

    final date = pickedDate!;
    final time = pickedTime!;
    final local = DateTime(
      date.year,
      date.month,
      date.day,
      time.hour,
      time.minute,
    );
    final startsAtIso = local.toUtc().toIso8601String();

    try {
      final res = await _dio.post(
        '/api/events',
        data: {
          'title': title.text.trim(),
          'description': desc.text.trim(),
          'location_label': place.text.trim(),
          'lat': _campusLat,
          'lng': _campusLng,
          'max_vendors': int.tryParse(cupo.text) ?? 20,
          'starts_at': startsAtIso,
        },
        options: Options(headers: _headers(), contentType: 'application/json'),
      );
      await _refreshAll();
      final id = (res.data as Map)['id'] as String?;
      if (id != null) await _openEvent(id);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
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
            IconButton(onPressed: _createEvent, icon: const Icon(Icons.add)),
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
                                      assetPath: 'assets/markers/popper.png',
                                      size: 36,
                                      fallbackEmoji: '🎉',
                                    ),
                                    title: Text(
                                      '${e['title']}',
                                      style: const TextStyle(fontWeight: FontWeight.w700),
                                    ),
                                    subtitle: Text(
                                      '📅 ${_formatStartsAt(e['starts_at'])}\n'
                                      '📍 ${e['location_label'] ?? 'Campus'} · '
                                      '${e['accepted_count'] ?? 0}/${e['max_vendors']} puestos',
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
                          Text(
                            '📅 ${_formatStartsAt(_detailEvent!['starts_at'])}',
                            style: const TextStyle(
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF334155),
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '📍 ${_detailEvent!['location_label'] ?? 'Campus'}',
                            style: const TextStyle(color: Color(0xFF64748B)),
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
                            final emoji = {
                                  'comida': '🌮',
                                  'snacks': '🥪',
                                  'bebidas': '☕',
                                  'postres': '🍓',
                                  'otro': '🛍️',
                                }[v['category']] ??
                                '🛍️';
                            return Card(
                              child: ListTile(
                                leading: CircleAvatar(
                                  backgroundColor: const Color(0xFFF3E8FF),
                                  child: Text(emoji,
                                      style: const TextStyle(fontSize: 22)),
                                ),
                                title: Text('${v['business_name']}'),
                                subtitle: Text('${v['what_they_sell']}'),
                                trailing: const Text(
                                  '· Abierto',
                                  style: TextStyle(color: Color(0xFF059669)),
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
