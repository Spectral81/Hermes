import { Platform, StyleSheet, Text, View } from 'react-native';
import { INCIDENT_COLORS, INCIDENT_EMOJI, type IncidentType } from '@uteq/shared';

const BUBBLE = 52;
const TAIL = 14;
const PAD = 8;

export const MARKER_LAYOUT = {
  width: BUBBLE + PAD * 2,
  height: BUBBLE + TAIL + PAD * 2,
};

interface Props {
  type: IncidentType;
  likes?: number;
}

export function IncidentMarker({ type, likes = 0 }: Props) {
  const color = INCIDENT_COLORS[type];
  const emoji = INCIDENT_EMOJI[type];

  return (
    <View style={styles.root} collapsable={false}>
      <View style={[styles.bubble, { backgroundColor: color }]}>
        <Text style={styles.emoji} allowFontScaling={false}>
          {emoji}
        </Text>
        {likes > 0 && (
          <View style={styles.likesBadge}>
            <Text style={styles.likesText} allowFontScaling={false}>
              {likes > 99 ? '99+' : likes}
            </Text>
          </View>
        )}
      </View>
      <View style={[styles.tail, { borderTopColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: MARKER_LAYOUT.width,
    height: MARKER_LAYOUT.height,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: PAD,
    backgroundColor: 'transparent',
    ...Platform.select({
      android: { overflow: 'visible' as const },
    }),
  },
  bubble: {
    width: BUBBLE,
    height: BUBBLE,
    borderRadius: BUBBLE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#ffffff',
  },
  emoji: {
    fontSize: 26,
    lineHeight: 30,
    textAlign: 'center',
  },
  tail: {
    width: 0,
    height: 0,
    marginTop: -1,
    borderLeftWidth: 9,
    borderRightWidth: 9,
    borderTopWidth: TAIL,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  likesBadge: {
    position: 'absolute',
    top: -6,
    right: -8,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 5,
    borderRadius: 11,
    backgroundColor: '#111827',
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  likesText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
});
