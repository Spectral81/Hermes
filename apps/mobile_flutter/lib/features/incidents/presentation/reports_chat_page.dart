import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/config/env.dart';

class ReportsChatPage extends StatefulWidget {
  const ReportsChatPage({super.key});

  @override
  State<ReportsChatPage> createState() => _ReportsChatPageState();
}

class _ChatMessage {
  const _ChatMessage({
    required this.role,
    required this.text,
    this.mapLat,
    this.mapLng,
    this.mapLabel,
  });
  final String role; // user | assistant
  final String text;
  final double? mapLat;
  final double? mapLng;
  final String? mapLabel;
}

class _ReportsChatPageState extends State<ReportsChatPage> {
  final _controller = TextEditingController();
  final _scroll = ScrollController();
  final _messages = <_ChatMessage>[
    const _ChatMessage(
      role: 'assistant',
      text: 'Hola, soy HERMES. Pregúntame sobre los últimos reportes del campus.',
    ),
  ];
  bool _loading = false;

  static const _suggestions = [
    '¿Qué reportes hubo esta semana?',
    '¿Cuántos robos hay activos?',
    '¿Dónde hay más incidentes?',
    'Resume el último reporte',
  ];

  @override
  void dispose() {
    _controller.dispose();
    _scroll.dispose();
    super.dispose();
  }

  void _scrollToEnd() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scroll.hasClients) return;
      _scroll.animateTo(
        _scroll.position.maxScrollExtent,
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeOut,
      );
    });
  }

  Future<void> _send(String raw) async {
    final message = raw.trim();
    if (message.isEmpty || _loading) return;

    final base = AppEnv.webApiUrl;
    if (base == null) {
      setState(() {
        _messages.add(
          const _ChatMessage(
            role: 'assistant',
            text: 'Configura WEB_API_URL para usar el asistente.',
          ),
        );
      });
      return;
    }

    setState(() {
      _messages.add(_ChatMessage(role: 'user', text: message));
      _loading = true;
    });
    _controller.clear();
    _scrollToEnd();

    try {
      final token = Supabase.instance.client.auth.currentSession?.accessToken;
      final dio = Dio(BaseOptions(baseUrl: base));
      final res = await dio.post(
        '/api/chat/reports',
        data: {'message': message},
        options: Options(
          headers: {
            if (token != null) 'Authorization': 'Bearer $token',
            'Content-Type': 'application/json',
          },
        ),
      );
      final data = res.data;
      String reply = 'Sin respuesta.';
      double? mapLat;
      double? mapLng;
      String? mapLabel;
      if (data is Map) {
        reply = '${data['reply'] ?? data['error'] ?? 'Sin respuesta.'}';
        final map = data['map'];
        if (map is Map) {
          mapLat = (map['lat'] as num?)?.toDouble();
          mapLng = (map['lng'] as num?)?.toDouble();
          mapLabel = map['label']?.toString();
        }
      }
      if (!mounted) return;
      setState(() {
        _messages.add(
          _ChatMessage(
            role: 'assistant',
            text: reply,
            mapLat: mapLat,
            mapLng: mapLng,
            mapLabel: mapLabel,
          ),
        );
      });
    } on DioException catch (e) {
      final data = e.response?.data;
      String msg = 'Error al consultar el asistente.';
      if (data is Map) {
        msg = '${data['error'] ?? data['reply'] ?? msg}';
      } else if (e.message != null) {
        msg = e.message!;
      }
      if (!mounted) return;
      setState(() {
        _messages.add(_ChatMessage(role: 'assistant', text: msg));
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _messages.add(_ChatMessage(role: 'assistant', text: e.toString()));
      });
    } finally {
      if (mounted) setState(() => _loading = false);
      _scrollToEnd();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF0F172A),
        elevation: 0,
        title: const Text('Asistente de reportes'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () {
            if (context.canPop()) {
              context.pop();
            } else {
              context.go('/app/alerts');
            }
          },
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            SizedBox(
              height: 44,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 12),
                children: [
                  for (final s in _suggestions)
                    Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: ActionChip(
                        label: Text(s, style: const TextStyle(fontSize: 12)),
                        onPressed: _loading ? null : () => _send(s),
                      ),
                    ),
                ],
              ),
            ),
            Expanded(
              child: ListView.builder(
                controller: _scroll,
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                itemCount: _messages.length + (_loading ? 1 : 0),
                itemBuilder: (context, index) {
                  if (_loading && index == _messages.length) {
                    return const Align(
                      alignment: Alignment.centerLeft,
                      child: Padding(
                        padding: EdgeInsets.symmetric(vertical: 6),
                        child: Text(
                          'Pensando…',
                          style: TextStyle(
                            color: Color(0xFF64748B),
                            fontStyle: FontStyle.italic,
                          ),
                        ),
                      ),
                    );
                  }
                  final m = _messages[index];
                  final isUser = m.role == 'user';
                  final hasMap = !isUser && m.mapLat != null && m.mapLng != null;
                  return Align(
                    alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
                    child: Column(
                      crossAxisAlignment:
                          isUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                      children: [
                        Container(
                          margin: const EdgeInsets.symmetric(vertical: 5),
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                          constraints: BoxConstraints(
                            maxWidth: MediaQuery.of(context).size.width * 0.82,
                          ),
                          decoration: BoxDecoration(
                            color: isUser ? const Color(0xFF2563EB) : Colors.white,
                            borderRadius: BorderRadius.only(
                              topLeft: const Radius.circular(14),
                              topRight: const Radius.circular(14),
                              bottomLeft: Radius.circular(isUser ? 14 : 4),
                              bottomRight: Radius.circular(isUser ? 4 : 14),
                            ),
                            border:
                                isUser ? null : Border.all(color: const Color(0xFFE2E8F0)),
                          ),
                          child: Text(
                            m.text,
                            style: TextStyle(
                              color: isUser ? Colors.white : const Color(0xFF0F172A),
                              height: 1.4,
                            ),
                          ),
                        ),
                        if (hasMap)
                          Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: OutlinedButton.icon(
                              onPressed: () => context.go('/app/home'),
                              icon: const Icon(Icons.map_outlined, size: 18),
                              label: Text(m.mapLabel ?? 'Ver en el mapa'),
                            ),
                          ),
                      ],
                    ),
                  );
                },
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _controller,
                      enabled: !_loading,
                      textInputAction: TextInputAction.send,
                      onSubmitted: _send,
                      decoration: InputDecoration(
                        hintText: 'Pregunta sobre reportes…',
                        filled: true,
                        fillColor: Colors.white,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
                        ),
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 14,
                          vertical: 12,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  FilledButton(
                    onPressed: _loading ? null : () => _send(_controller.text),
                    style: FilledButton.styleFrom(
                      backgroundColor: const Color(0xFF2563EB),
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    ),
                    child: const Text('Enviar'),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
