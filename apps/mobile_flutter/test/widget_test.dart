import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_flutter/domain/models.dart';
import 'package:mobile_flutter/domain/validators.dart';

void main() {
  test('register validator enforces institutional email format', () {
    final input = RegisterInput(
      matricula: '2020123456',
      nombre: 'Edgar',
      apellidos: 'Perez',
      telefono: '4421234567',
      email: 'test@gmail.com',
      password: 'Passw0rd!',
    );
    final result = validateRegister(input);
    expect(result, contains('@uteq.edu.mx'));
  });
}
