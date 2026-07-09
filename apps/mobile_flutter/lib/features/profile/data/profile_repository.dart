import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../domain/models.dart';

class ProfileRepository {
  ProfileRepository({SupabaseClient? supabaseClient})
      : _supabase = supabaseClient ?? Supabase.instance.client;

  final SupabaseClient _supabase;

  UserRole _fallbackRoleByEmail(String? email) {
    final normalized = email?.trim().toLowerCase() ?? '';
    switch (normalized) {
      case 'admin@uteq.edu.mx':
        return UserRole.adminGeneral;
      case 'robos@uteq.edu.mx':
        return UserRole.responsableRobos;
      case 'emergencias@uteq.edu.mx':
        return UserRole.responsableAccidentes;
      case 'infraestructura@uteq.edu.mx':
        return UserRole.responsableInfraestructura;
      default:
        return UserRole.estudiante;
    }
  }

  Future<UserRole> fetchMyRole() async {
    final user = _supabase.auth.currentUser;
    final uid = user?.id;
    if (uid == null) return UserRole.estudiante;
    try {
      final data = await _supabase
          .from('profiles')
          .select('role')
          .eq('id', uid)
          .maybeSingle();
      final role = roleFromWire(data?['role']?.toString());
      // Si la consulta devuelve vacío/estudiante para una cuenta seed administrativa,
      // usa fallback por correo para no bloquear el acceso al dashboard.
      if (role == UserRole.estudiante) {
        return _fallbackRoleByEmail(user?.email);
      }
      return role;
    } catch (_) {
      return _fallbackRoleByEmail(user?.email);
    }
  }

  Future<Map<String, dynamic>?> fetchMyProfile() async {
    final uid = _supabase.auth.currentUser?.id;
    if (uid == null) return null;
    try {
      final data = await _supabase
          .from('profiles')
          .select('nombre, apellidos, matricula, email, role')
          .eq('id', uid)
          .maybeSingle();
      return data == null ? null : Map<String, dynamic>.from(data);
    } catch (_) {
      return null;
    }
  }
}
