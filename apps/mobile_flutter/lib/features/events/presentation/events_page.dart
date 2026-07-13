import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/config/env.dart';
import '../../../core/di/repositories.dart';
import '../../../domain/models.dart';

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
  String? _selectedId;
  String _filter = 'todos';
  bool _loading = true;
  String? _error;
  UserRole _role = UserRole.estudiante;

  Map<String, String> _headers() {
    final token = Supabase.instance.client.auth.currentSession?.accessToken;
    if (token == null) return {};
    return {'Authorization': 'Bearer $token'};
  }

  @override
  void initState() {
    super.initState();
    _boot();
  }

  Future<void> _boot() async {
    try {
      _role = await profileRepository.fetchMyRole();
    } catch (_) {}
    await _loadEvents();
  }

  Future<void> _loadEvents() async {
    if (AppEnv.webApiUrl == null) {
      setState(() {
        _loading = false;
        _error = 'Configura WEB_API_URL para eventos';
      });
      return;
    }
    setState(() => _loading = true);
    try {
      final res = await _dio.get('/api/events');
      _events = (res.data as List).cast<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
      _error = null;
    } catch (e) {
      _error = e.toString();
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _openEvent(String id) async {
    setState(() {
      _selectedId = id;
      _loading = true;
    });
    try {
      final res = await _dio.get('/api/events/$id');
      final data = Map<String, dynamic>.from(res.data as Map);
      _detailEvent = Map<String, dynamic>.from(data['event'] as Map);
      _apps = ((data['applications'] as List?) ?? [])
          .cast<Map>()
          .map((e) => Map<String, dynamic>.from(e))
          .toList();
    } catch (e) {
      _error = e.toString();
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _apply() async {
    if (_selectedId == null) return;
    final name = TextEditingController();
    final group = TextEditingController();
    final sell = TextEditingController();
    var category = 'comida';

    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setLocal) => AlertDialog(
          title: const Text('Participar'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(controller: name, decoration: const InputDecoration(labelText: 'Negocio')),
                TextField(controller: group, decoration: const InputDecoration(labelText: 'Grupo')),
                TextField(controller: sell, decoration: const InputDecoration(labelText: 'Qué venden')),
                DropdownButtonFormField<String>(
                  initialValue: category,
                  items: const [
                    DropdownMenuItem(value: 'comida', child: Text('Comida')),
                    DropdownMenuItem(value: 'snacks', child: Text('Snacks')),
                    DropdownMenuItem(value: 'bebidas', child: Text('Bebidas')),
                    DropdownMenuItem(value: 'postres', child: Text('Postres')),
                    DropdownMenuItem(value: 'otro', child: Text('Otro')),
                  ],
                  onChanged: (v) => setLocal(() => category = v ?? 'comida'),
                  decoration: const InputDecoration(labelText: 'Categoría'),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar')),
            FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Enviar')),
          ],
        ),
      ),
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
      await _openEvent(_selectedId!);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Solicitud enviada')),
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
      await _openEvent(_selectedId!);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    }
  }

  Future<void> _createEvent() async {
    if (_role != UserRole.adminGeneral) return;
    final title = TextEditingController();
    final desc = TextEditingController();
    final place = TextEditingController();
    final cupo = TextEditingController(text: '20');
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Nuevo evento'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(controller: title, decoration: const InputDecoration(labelText: 'Título')),
              TextField(controller: desc, decoration: const InputDecoration(labelText: 'Descripción')),
              TextField(controller: place, decoration: const InputDecoration(labelText: 'Lugar')),
              TextField(
                controller: cupo,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Cupo puestos'),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Crear')),
        ],
      ),
    );
    if (ok != true) return;
    try {
      final res = await _dio.post(
        '/api/events',
        data: {
          'title': title.text.trim(),
          'description': desc.text.trim(),
          'location_label': place.text.trim(),
          'lat': 20.6534,
          'lng': -100.4045,
          'max_vendors': int.tryParse(cupo.text) ?? 20,
        },
        options: Options(headers: _headers(), contentType: 'application/json'),
      );
      await _loadEvents();
      final id = (res.data as Map)['id'] as String?;
      if (id != null) await _openEvent(id);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    }
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
                onPressed: () => setState(() {
                  _detailEvent = null;
                  _selectedId = null;
                }),
              )
            : null,
        actions: [
          if (_role == UserRole.adminGeneral && _detailEvent == null)
            IconButton(onPressed: _createEvent, icon: const Icon(Icons.add)),
          if (_detailEvent != null && _detailEvent!['status'] == 'abierto')
            TextButton(onPressed: _apply, child: const Text('Participar')),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null && _detailEvent == null && _events.isEmpty
              ? Center(child: Text(_error!))
              : _detailEvent == null
                  ? RefreshIndicator(
                      onRefresh: _loadEvents,
                      child: ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _events.length,
                        itemBuilder: (_, i) {
                          final e = _events[i];
                          final open = e['status'] == 'abierto';
                          return Card(
                            child: ListTile(
                              title: Text('${e['title']}'),
                              subtitle: Text(
                                '${e['location_label'] ?? 'Campus'} · ${e['accepted_count'] ?? 0}/${e['max_vendors']} puestos',
                              ),
                              trailing: Text(
                                open ? 'Abierto' : 'Cerrado',
                                style: TextStyle(
                                  color: open ? const Color(0xFF059669) : Colors.grey,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              onTap: () => _openEvent(e['id'] as String),
                            ),
                          );
                        },
                      ),
                    )
                  : ListView(
                      padding: const EdgeInsets.all(16),
                      children: [
                        Text(
                          '${_detailEvent!['description'] ?? ''}',
                          style: const TextStyle(color: Color(0xFF64748B)),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          _detailEvent!['status'] == 'abierto' ? '· Abierto' : '· Cerrado',
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
                              for (final f in ['todos', 'comida', 'snacks', 'bebidas', 'postres', 'otro'])
                                Padding(
                                  padding: const EdgeInsets.only(right: 8),
                                  child: ChoiceChip(
                                    label: Text(f == 'todos' ? 'Todos' : f),
                                    selected: _filter == f,
                                    onSelected: (_) => setState(() => _filter = f),
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
                          }[v['category']] ?? '🛍️';
                          return Card(
                            child: ListTile(
                              leading: CircleAvatar(
                                backgroundColor: const Color(0xFFF3E8FF),
                                child: Text(emoji, style: const TextStyle(fontSize: 22)),
                              ),
                              title: Text('${v['business_name']}'),
                              subtitle: Text('${v['what_they_sell']}'),
                              trailing: const Text('· Abierto', style: TextStyle(color: Color(0xFF059669))),
                            ),
                          );
                        }),
                        if (_role == UserRole.adminGeneral) ...[
                          const SizedBox(height: 20),
                          Text('Solicitudes (${pending.length})',
                              style: const TextStyle(fontWeight: FontWeight.w800)),
                          ...pending.map(
                            (a) => Card(
                              child: ListTile(
                                title: Text('${a['business_name']}'),
                                subtitle: Text('${a['what_they_sell']}'),
                                trailing: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    IconButton(
                                      icon: const Icon(Icons.check, color: Colors.green),
                                      onPressed: () => _review(a['id'] as String, 'aceptado'),
                                    ),
                                    IconButton(
                                      icon: const Icon(Icons.close, color: Colors.red),
                                      onPressed: () => _review(a['id'] as String, 'rechazado'),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
    );
  }
}
