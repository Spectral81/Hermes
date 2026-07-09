import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/di/repositories.dart';
import '../../../domain/models.dart';
import '../../../domain/validators.dart';

class RegisterPage extends StatefulWidget {
  const RegisterPage({super.key});

  @override
  State<RegisterPage> createState() => _RegisterPageState();
}

class _RegisterPageState extends State<RegisterPage> {
  final _matriculaCtrl = TextEditingController();
  final _nombreCtrl = TextEditingController();
  final _apellidosCtrl = TextEditingController();
  final _telefonoCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  final _confirmCtrl = TextEditingController();

  bool _loading = false;
  bool _showPassword = false;
  String? _error;

  @override
  void dispose() {
    _matriculaCtrl.dispose();
    _nombreCtrl.dispose();
    _apellidosCtrl.dispose();
    _telefonoCtrl.dispose();
    _emailCtrl.dispose();
    _passwordCtrl.dispose();
    _confirmCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _error = null);
    if (_passwordCtrl.text != _confirmCtrl.text) {
      setState(() => _error = 'Las contraseñas no coinciden.');
      return;
    }

    final input = RegisterInput(
      matricula: _matriculaCtrl.text,
      nombre: _nombreCtrl.text,
      apellidos: _apellidosCtrl.text,
      telefono: _telefonoCtrl.text,
      email: _emailCtrl.text,
      password: _passwordCtrl.text,
    );

    final validation = validateRegister(input);
    if (validation != null) {
      setState(() => _error = validation);
      return;
    }

    setState(() => _loading = true);
    try {
      await authRepository.register(input);
      if (!mounted) return;
      context.go('/app/home');
    } catch (e) {
      setState(() => _error = toAuthErrorMessage(e));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Crear cuenta')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (_error != null) ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF2F2),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(_error!, style: const TextStyle(color: Color(0xFF991B1B))),
              ),
              const SizedBox(height: 12),
            ],
            TextField(controller: _nombreCtrl, decoration: const InputDecoration(labelText: 'Nombre')),
            const SizedBox(height: 10),
            TextField(controller: _apellidosCtrl, decoration: const InputDecoration(labelText: 'Apellidos')),
            const SizedBox(height: 10),
            TextField(
              controller: _matriculaCtrl,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Matrícula UTEQ'),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _telefonoCtrl,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(labelText: 'Teléfono'),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _emailCtrl,
              keyboardType: TextInputType.emailAddress,
              decoration: const InputDecoration(labelText: 'Correo institucional'),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _passwordCtrl,
              obscureText: !_showPassword,
              decoration: InputDecoration(
                labelText: 'Contraseña',
                suffixIcon: IconButton(
                  onPressed: () => setState(() => _showPassword = !_showPassword),
                  icon: Icon(_showPassword ? Icons.visibility_off : Icons.visibility),
                ),
              ),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _confirmCtrl,
              obscureText: !_showPassword,
              decoration: const InputDecoration(labelText: 'Confirmar contraseña'),
            ),
            const SizedBox(height: 20),
            FilledButton(
              onPressed: _loading ? null : _submit,
              child: Text(_loading ? 'Registrando...' : 'Registrarse'),
            ),
          ],
        ),
      ),
    );
  }
}
