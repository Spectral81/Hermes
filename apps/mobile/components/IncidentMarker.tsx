import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';
import type { IncidentType } from '@uteq/shared';
import { CATEGORY } from '@/lib/theme';

const PIN_W = 40;
const PIN_H = 50;
const PAD = 10;

export const MARKER_LAYOUT = {
  width: PIN_W + PAD * 2,
  height: PIN_H + PAD * 2,
};

interface Props {
  type: IncidentType;
  likes?: number;
}

// Pin estilo HERMES: teardrop con color de categoría + glifo en círculo blanco.
export function IncidentMarker({ type, likes = 0 }: Props) {
  const cat = CATEGORY[type];

  return (
    <View style={styles.root} collapsable={false}>
      <Svg width={PIN_W} height={PIN_H} viewBox="0 0 32 40">
        <Path
          d="M16 0 C7 0 0 7 0 16 C0 26 16 40 16 40 C16 40 32 26 32 16 C32 7 25 0 16 0 Z"
          fill={cat.color}
        />
        <Circle cx="16" cy="14" r="9" fill="#fff" />
        <SvgText
          x="16"
          y="18.5"
          textAnchor="middle"
          fill={cat.color}
          fontWeight="800"
          fontSize="13"
        >
          {cat.glyph}
        </SvgText>
      </Svg>

      {likes > 0 && (
        <View style={styles.likesBadge}>
          <Text style={styles.likesText} allowFontScaling={false}>
            {likes > 99 ? '99+' : likes}
          </Text>
        </View>
      )}
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
  },
  likesBadge: {
    position: 'absolute',
    top: PAD - 4,
    right: PAD - 6,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: '#0F172A',
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  likesText: { color: '#fff', fontSize: 10, fontWeight: '800' },
});
