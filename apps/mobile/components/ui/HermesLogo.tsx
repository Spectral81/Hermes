import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { HERMES } from '@/lib/theme';

interface MarkProps {
  size?: number;
  color?: string;
  accent?: string;
}

// Escudo geométrico "H" con acento de alas (marca HERMES)
export function HermesMark({ size = 32, color = HERMES.blue, accent = '#fff' }: MarkProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <Path d="M20 2 L36 8 V20 C36 30 28 36 20 38 C12 36 4 30 4 20 V8 Z" fill={color} />
      <Path d="M13 12 V28 M27 12 V28 M13 20 H27" stroke={accent} strokeWidth={2.6} strokeLinecap="round" />
      <Path d="M7 14 L11 14 M7 18 L11 18" stroke={accent} strokeWidth={1.4} strokeLinecap="round" opacity={0.55} />
      <Path d="M29 22 L33 22 M29 26 L33 26" stroke={accent} strokeWidth={1.4} strokeLinecap="round" opacity={0.55} />
    </Svg>
  );
}

interface WordmarkProps {
  size?: number;
  color?: string;
}

export function HermesWordmark({ size = 18, color = HERMES.gray900 }: WordmarkProps) {
  return (
    <Text
      allowFontScaling={false}
      style={{
        fontWeight: '800',
        fontSize: size,
        letterSpacing: size * 0.14,
        color,
      }}
    >
      HERMES
    </Text>
  );
}

interface LockupProps {
  size?: number;
  color?: string;
  textColor?: string;
}

export function HermesLogoLockup({ size = 28, color = HERMES.blue, textColor }: LockupProps) {
  return (
    <View style={styles.lockup}>
      <HermesMark size={size} color={color} />
      <HermesWordmark size={size * 0.58} color={textColor ?? HERMES.gray900} />
    </View>
  );
}

const styles = StyleSheet.create({
  lockup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
