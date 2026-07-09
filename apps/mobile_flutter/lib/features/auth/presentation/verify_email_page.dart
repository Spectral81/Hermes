import 'package:flutter/material.dart';

class VerifyEmailPage extends StatelessWidget {
  const VerifyEmailPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Verifica tu correo')),
      body: const Padding(
        padding: EdgeInsets.all(16),
        child: Text('Revisa tu correo institucional para continuar.'),
      ),
    );
  }
}
