import 'package:flutter/material.dart';

import 'models.dart';

const String uteqEmailDomain = 'uteq.edu.mx';
const int incidentValidationTarget = 3;

/// Horas que una alerta permanece visible en el mapa/lista antes de ocultarse.
const int incidentMaxAgeHours = 24;

/// Radio en metros: solo se muestran alertas dentro de esta distancia.
const double incidentNearbyRadiusM = 1500;

const Map<IncidentType, String> incidentLabels = {
  IncidentType.robo: 'Robo',
  IncidentType.accidente: 'Accidente',
  IncidentType.infraestructura: 'Infraestructura',
  IncidentType.panico: 'Emergencia',
};

/// Emoji representativo por tipo de incidente (se muestra en los pines del mapa).
const Map<IncidentType, String> incidentEmoji = {
  IncidentType.robo: '🥷',
  IncidentType.accidente: '🚑',
  IncidentType.infraestructura: '🔧',
  IncidentType.panico: '🚨',
};

/// Color de acento por tipo de incidente (borde del pin y tarjetas).
const Map<IncidentType, Color> incidentColors = {
  IncidentType.robo: Color(0xFFEF4444),
  IncidentType.accidente: Color(0xFFF97316),
  IncidentType.infraestructura: Color(0xFFEAB308),
  IncidentType.panico: Color(0xFFDC2626),
};

/// Icono por tipo de incidente (tarjetas y listas).
const Map<IncidentType, IconData> incidentIcons = {
  IncidentType.robo: Icons.warning_amber_rounded,
  IncidentType.accidente: Icons.add_circle_outline,
  IncidentType.infraestructura: Icons.bolt,
  IncidentType.panico: Icons.sos,
};

const Map<InfraCategory, String> infraCategoryLabels = {
  InfraCategory.agua: 'Agua',
  InfraCategory.electricidad: 'Electricidad',
  InfraCategory.internet: 'Internet',
  InfraCategory.instalaciones: 'Instalaciones',
  InfraCategory.equipamiento: 'Equipamiento',
};

const Map<Severity, String> severityLabels = {
  Severity.leve: 'Leve',
  Severity.moderado: 'Moderado',
  Severity.grave: 'Grave',
};

bool isCriticalIncidentType(IncidentType type) =>
    type == IncidentType.robo || type == IncidentType.panico;

const Map<UserRole, String> roleLabels = {
  UserRole.estudiante: 'Estudiante',
  UserRole.adminGeneral: 'Administrador general',
  UserRole.responsableRobos: 'Responsable de robos',
  UserRole.responsableAccidentes: 'Responsable de emergencias',
  UserRole.responsableInfraestructura: 'Responsable de infraestructura',
};

const Map<IncidentStatus, String> statusLabels = {
  IncidentStatus.activo: 'Activo',
  IncidentStatus.enProceso: 'En proceso',
  IncidentStatus.cerrado: 'Resuelto',
  IncidentStatus.rechazado: 'Rechazado',
};

const Map<IncidentStatus, Color> statusColors = {
  IncidentStatus.activo: Color(0xFFEF4444),
  IncidentStatus.enProceso: Color(0xFFF59E0B),
  IncidentStatus.cerrado: Color(0xFF10B981),
  IncidentStatus.rechazado: Color(0xFF64748B),
};
