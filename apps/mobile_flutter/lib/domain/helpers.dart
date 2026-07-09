import 'dart:math';

String timeAgo(String iso) {
  final diff = DateTime.now().difference(DateTime.tryParse(iso) ?? DateTime.now());
  final min = diff.inMinutes;
  if (min < 1) return 'ahora';
  if (min < 60) return 'hace $min min';
  final h = diff.inHours;
  if (h < 24) return 'hace $h h';
  final d = diff.inDays;
  return 'hace $d d';
}

double distanceMeters(double lat1, double lng1, double lat2, double lng2) {
  const r = 6371000.0;
  final dLat = _toRad(lat2 - lat1);
  final dLng = _toRad(lng2 - lng1);
  final a = sin(dLat / 2) * sin(dLat / 2) +
      cos(_toRad(lat1)) * cos(_toRad(lat2)) * sin(dLng / 2) * sin(dLng / 2);
  return r * 2 * atan2(sqrt(a), sqrt(1 - a));
}

String formatDistance(double meters) {
  if (!meters.isFinite) return '—';
  if (meters < 1000) return '${meters.round()} m';
  return '${(meters / 1000).toStringAsFixed(1)} km';
}

double _toRad(double d) => d * pi / 180;

/// Devuelve true si el incidente sigue siendo reciente (dentro de [maxAgeHours]).
bool isRecentIso(String iso, {int maxAgeHours = 24}) {
  final created = DateTime.tryParse(iso);
  if (created == null) return true;
  final diff = DateTime.now().difference(created.toLocal());
  return diff.inHours < maxAgeHours;
}
