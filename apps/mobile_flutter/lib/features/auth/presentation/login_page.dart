import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/di/repositories.dart';
import '../../../domain/models.dart';
import '../../../domain/validators.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _emailCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  bool _loading = false;
  bool _showPassword = false;
  bool _remember = true;
  String? _error;

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _error = null);

    final input = LoginInput(email: _emailCtrl.text, password: _passwordCtrl.text);
    final validationError = validateLogin(input);
    if (validationError != null) {
      setState(() => _error = validationError);
      return;
    }

    setState(() => _loading = true);
    try {
      await authRepository.login(input);
      if (!mounted) return;
      context.go('/app/home');
    } catch (e) {
      final parsed = toAuthErrorMessage(e);
      const fallback = 'Error desconocido. Revisa Supabase y las variables en Railway.';
      final raw = e.toString().replaceFirst('Exception: ', '').trim();
      setState(() => _error = (parsed == fallback && raw.isNotEmpty) ? raw : parsed);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _forgotPassword() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Recupera tu contraseña desde el portal web de HERMES.'),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    const blue = Color(0xFF2563EB);

    return Scaffold(
      appBar: AppBar(
        title: const Text('HERMES'),
        titleTextStyle: const TextStyle(
          color: Color(0xFF0F172A),
          fontSize: 18,
          fontWeight: FontWeight.w800,
          letterSpacing: 2,
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/auth'),
        ),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            const SizedBox(height: 8),
            const Text(
              'Bienvenido',
              style: TextStyle(fontSize: 28, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
            ),
            const SizedBox(height: 6),
            const Text(
              'Ingresa con tu cuenta institucional',
              style: TextStyle(fontSize: 14, color: Colors.black54),
            ),
            const SizedBox(height: 24),
            if (_error != null) ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF2F2),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFFECACA)),
                ),
                child: Text(_error!, style: const TextStyle(color: Color(0xFF991B1B))),
              ),
              const SizedBox(height: 16),
            ],
            const Text('Correo institucional',
                style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
            const SizedBox(height: 6),
            TextField(
              controller: _emailCtrl,
              keyboardType: TextInputType.emailAddress,
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(
                prefixIcon: Icon(Icons.mail_outline),
                hintText: 'nombre@uteq.edu.mx',
              ),
            ),
            const SizedBox(height: 16),
            const Text('Contraseña',
                style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
            const SizedBox(height: 6),
            TextField(
              controller: _passwordCtrl,
              obscureText: !_showPassword,
              onSubmitted: (_) => _submit(),
              decoration: InputDecoration(
                prefixIcon: const Icon(Icons.lock_outline),
                hintText: '••••••••',
                suffixIcon: IconButton(
                  onPressed: () => setState(() => _showPassword = !_showPassword),
                  icon: Icon(_showPassword ? Icons.visibility_off : Icons.visibility),
                ),
              ),
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Checkbox(
                      value: _remember,
                      onChanged: (v) => setState(() => _remember = v ?? true),
                    ),
                    const Text('Recordarme'),
                  ],
                ),
                TextButton(
                  onPressed: _forgotPassword,
                  child: const Text('¿Olvidaste tu contraseña?'),
                ),
              ],
            ),
            const SizedBox(height: 12),
            FilledButton(
              style: FilledButton.styleFrom(
                backgroundColor: blue,
                minimumSize: const Size.fromHeight(52),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
              ),
              onPressed: _loading ? null : _submit,
              child: Text(_loading ? 'Cargando...' : 'Iniciar sesión'),
            ),
            const SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Text('¿Eres nuevo? ', style: TextStyle(color: Colors.black54)),
                GestureDetector(
                  onTap: () => context.go('/auth/register'),
                  child: const Text(
                    'Crea una cuenta',
                    style: TextStyle(color: blue, fontWeight: FontWeight.w700),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
