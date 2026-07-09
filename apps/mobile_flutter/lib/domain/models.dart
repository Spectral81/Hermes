enum UserRole {
  estudiante,
  adminGeneral,
  responsableRobos,
  responsableAccidentes,
  responsableInfraestructura,
}

UserRole roleFromWire(String? raw) {
  switch (raw) {
    case 'admin_general':
      return UserRole.adminGeneral;
    case 'responsable_robos':
      return UserRole.responsableRobos;
    case 'responsable_accidentes':
      return UserRole.responsableAccidentes;
    case 'responsable_infraestructura':
      return UserRole.responsableInfraestructura;
    case 'estudiante':
    default:
      return UserRole.estudiante;
  }
}

String roleToWire(UserRole role) {
  switch (role) {
    case UserRole.adminGeneral:
      return 'admin_general';
    case UserRole.responsableRobos:
      return 'responsable_robos';
    case UserRole.responsableAccidentes:
      return 'responsable_accidentes';
    case UserRole.responsableInfraestructura:
      return 'responsable_infraestructura';
    case UserRole.estudiante:
      return 'estudiante';
  }
}

/// Roles con acceso al panel de administración.
bool isPrivilegedRole(UserRole role) => role != UserRole.estudiante;

/// Tipos de incidente que gestiona cada rol.
List<IncidentType> incidentTypesForRole(UserRole role) {
  switch (role) {
    case UserRole.adminGeneral:
      return IncidentType.values;
    case UserRole.responsableRobos:
      return [IncidentType.robo];
    case UserRole.responsableAccidentes:
      return [IncidentType.accidente, IncidentType.panico];
    case UserRole.responsableInfraestructura:
      return [IncidentType.infraestructura];
    case UserRole.estudiante:
      return const [];
  }
}

enum IncidentType { robo, accidente, infraestructura, panico }

enum InfraCategory { agua, electricidad, internet, instalaciones, equipamiento }

enum Severity { leve, moderado, grave }

enum IncidentStatus { activo, enProceso, cerrado, rechazado }

String incidentTypeToWire(IncidentType type) {
  switch (type) {
    case IncidentType.robo:
      return 'robo';
    case IncidentType.accidente:
      return 'accidente';
    case IncidentType.infraestructura:
      return 'infraestructura';
    case IncidentType.panico:
      return 'panico';
  }
}

IncidentType incidentTypeFromWire(String raw) {
  switch (raw) {
    case 'robo':
      return IncidentType.robo;
    case 'accidente':
      return IncidentType.accidente;
    case 'infraestructura':
      return IncidentType.infraestructura;
    case 'panico':
    default:
      return IncidentType.panico;
  }
}

String? infraCategoryToWire(InfraCategory? category) {
  if (category == null) return null;
  switch (category) {
    case InfraCategory.agua:
      return 'agua';
    case InfraCategory.electricidad:
      return 'electricidad';
    case InfraCategory.internet:
      return 'internet';
    case InfraCategory.instalaciones:
      return 'instalaciones';
    case InfraCategory.equipamiento:
      return 'equipamiento';
  }
}

InfraCategory? infraCategoryFromWire(String? raw) {
  switch (raw) {
    case 'agua':
      return InfraCategory.agua;
    case 'electricidad':
      return InfraCategory.electricidad;
    case 'internet':
      return InfraCategory.internet;
    case 'instalaciones':
      return InfraCategory.instalaciones;
    case 'equipamiento':
      return InfraCategory.equipamiento;
    default:
      return null;
  }
}

String? severityToWire(Severity? severity) {
  if (severity == null) return null;
  switch (severity) {
    case Severity.leve:
      return 'leve';
    case Severity.moderado:
      return 'moderado';
    case Severity.grave:
      return 'grave';
  }
}

Severity? severityFromWire(String? raw) {
  switch (raw) {
    case 'leve':
      return Severity.leve;
    case 'moderado':
      return Severity.moderado;
    case 'grave':
      return Severity.grave;
    default:
      return null;
  }
}

IncidentStatus incidentStatusFromWire(String? raw) {
  switch (raw) {
    case 'activo':
      return IncidentStatus.activo;
    case 'en_proceso':
      return IncidentStatus.enProceso;
    case 'cerrado':
      return IncidentStatus.cerrado;
    case 'rechazado':
      return IncidentStatus.rechazado;
    default:
      return IncidentStatus.activo;
  }
}

String incidentStatusToWire(IncidentStatus status) {
  switch (status) {
    case IncidentStatus.activo:
      return 'activo';
    case IncidentStatus.enProceso:
      return 'en_proceso';
    case IncidentStatus.cerrado:
      return 'cerrado';
    case IncidentStatus.rechazado:
      return 'rechazado';
  }
}

class Profile {
  Profile({
    required this.id,
    required this.matricula,
    required this.nombre,
    required this.apellidos,
    required this.telefono,
    required this.email,
    required this.role,
    required this.active,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String matricula;
  final String nombre;
  final String apellidos;
  final String telefono;
  final String email;
  final UserRole role;
  final bool active;
  final String createdAt;
  final String updatedAt;
}

class Incident {
  Incident({
    required this.id,
    required this.type,
    required this.category,
    required this.severity,
    required this.description,
    required this.lat,
    required this.lng,
    required this.status,
    required this.likesCount,
    required this.createdAt,
    required this.createdBy,
    required this.authorNombre,
    required this.likedByMe,
  });

  final String id;
  final IncidentType type;
  final InfraCategory? category;
  final Severity? severity;
  final String description;
  final double lat;
  final double lng;
  final IncidentStatus status;
  final int likesCount;
  final String createdAt;
  final String createdBy;
  final String? authorNombre;
  final bool likedByMe;

  factory Incident.fromJson(Map<String, dynamic> json) {
    return Incident(
      id: '${json['id']}',
      type: incidentTypeFromWire('${json['type']}'),
      category: infraCategoryFromWire(json['category']?.toString()),
      severity: severityFromWire(json['severity']?.toString()),
      description: (json['description'] ?? '').toString(),
      lat: (json['lat'] as num).toDouble(),
      lng: (json['lng'] as num).toDouble(),
      status: incidentStatusFromWire(json['status']?.toString()),
      likesCount: (json['likes_count'] as num?)?.toInt() ?? 0,
      createdAt: (json['created_at'] ?? DateTime.now().toIso8601String()).toString(),
      createdBy: '${json['created_by']}',
      authorNombre: json['author_nombre']?.toString(),
      likedByMe: json['liked_by_me'] == true,
    );
  }
}

class CreateIncidentInput {
  CreateIncidentInput({
    required this.type,
    required this.description,
    required this.lat,
    required this.lng,
    this.category,
    this.severity,
  });

  final IncidentType type;
  final String description;
  final double lat;
  final double lng;
  final InfraCategory? category;
  final Severity? severity;

  Map<String, dynamic> toJson() {
    return {
      'type': incidentTypeToWire(type),
      'description': description,
      'lat': lat,
      'lng': lng,
      'category': infraCategoryToWire(category),
      'severity': severityToWire(severity),
    };
  }
}

class RegisterInput {
  RegisterInput({
    required this.matricula,
    required this.nombre,
    required this.apellidos,
    required this.telefono,
    required this.email,
    required this.password,
  });

  final String matricula;
  final String nombre;
  final String apellidos;
  final String telefono;
  final String email;
  final String password;
}

class LoginInput {
  LoginInput({required this.email, required this.password});

  final String email;
  final String password;
}
