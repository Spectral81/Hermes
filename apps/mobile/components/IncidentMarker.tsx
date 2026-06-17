import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { INCIDENT_COLORS, type IncidentType } from '@uteq/shared';

const ICONS: Record<IncidentType, keyof typeof MaterialCommunityIcons.glyphMap> = {
  robo: 'incognito',
  accidente: 'car-emergency',
  infraestructura: 'wrench',
  panico: 'alarm-light',
};

interface Props {
  type: IncidentType;
  likes?: number;
  size?: number;
}

// Marcador estilo Waze: burbuja de chat con icono y conteo de likes
export function IncidentMarker({ type, likes = 0, size = 46 }: Props) {
  const color = INCIDENT_COLORS[type];

  return (
    <View style={styles.wrapper}>
      <View style={[styles.bubble, { backgroundColor: color, width: size, height: size }]}>
        <MaterialCommunityIcons name={ICONS[type]} size={size * 0.55} color="#fff" />
        {likes > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{likes > 99 ? '99+' : likes}</Text>
          </View>
        )}
      </View>
      <View style={[styles.tail, { borderTopColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center' },
  bubble: {
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  tail: {
    width: 0,
    height: 0,
    marginTop: -3,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 11,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#1f2937',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
