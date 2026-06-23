import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from 'react-native';
import {
  avatarColor,
  HERMES,
  initials,
  RADIUS,
  SHADOW,
  STATUS_META,
  type StatusKind,
} from '@/lib/theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';

interface HButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  full?: boolean;
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  size?: 'lg' | 'md';
  style?: ViewStyle;
}

const VARIANT_STYLE: Record<ButtonVariant, { bg: string; fg: string; border: string }> = {
  primary: { bg: HERMES.blue, fg: '#fff', border: 'transparent' },
  secondary: { bg: 'transparent', fg: HERMES.blue, border: HERMES.blue },
  ghost: { bg: 'transparent', fg: HERMES.gray700, border: 'transparent' },
  danger: { bg: HERMES.redIntense, fg: '#fff', border: 'transparent' },
  success: { bg: HERMES.green, fg: '#fff', border: 'transparent' },
};

export function HButton({
  label,
  onPress,
  variant = 'primary',
  full,
  loading,
  disabled,
  icon,
  size = 'lg',
  style,
}: HButtonProps) {
  const v = VARIANT_STYLE[variant];
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.btn,
        {
          height: size === 'lg' ? 50 : 42,
          backgroundColor: v.bg,
          borderColor: v.border,
          width: full ? '100%' : undefined,
          opacity: isDisabled ? 0.55 : pressed ? 0.9 : 1,
          transform: [{ scale: pressed && !isDisabled ? 0.98 : 1 }],
        },
        variant === 'primary' && SHADOW.card,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <>
          {icon && <MaterialCommunityIcons name={icon} size={size === 'lg' ? 18 : 15} color={v.fg} />}
          <Text style={[styles.btnText, { color: v.fg, fontSize: size === 'lg' ? 15 : 13 }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

interface HInputProps extends TextInputProps {
  label?: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  valid?: boolean;
  error?: string | null;
  helper?: string;
  rightSlot?: ReactNode;
}

export function HInput({ label, icon, valid, error, helper, rightSlot, style, ...rest }: HInputProps) {
  const borderColor = error ? HERMES.red : valid ? HERMES.green : HERMES.gray200;
  return (
    <View style={styles.inputWrap}>
      {label && <Text style={styles.inputLabel}>{label}</Text>}
      <View style={[styles.inputBox, { borderColor }]}>
        {icon && <MaterialCommunityIcons name={icon} size={18} color={HERMES.gray500} />}
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={HERMES.gray400}
          {...rest}
        />
        {valid && !rightSlot && <MaterialCommunityIcons name="check" size={16} color={HERMES.green} />}
        {rightSlot}
      </View>
      {error ? (
        <Text style={styles.inputError}>{error}</Text>
      ) : helper ? (
        <Text style={styles.inputHelper}>{helper}</Text>
      ) : null}
    </View>
  );
}

interface HCardProps {
  children: ReactNode;
  accent?: string;
  padding?: number;
  style?: ViewStyle;
}

export function HCard({ children, accent, padding = 16, style }: HCardProps) {
  return (
    <View
      style={[
        styles.card,
        { padding },
        accent ? { borderLeftWidth: 4, borderLeftColor: accent } : null,
        SHADOW.card,
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function HStatusBadge({ kind }: { kind: StatusKind }) {
  const m = STATUS_META[kind];
  return (
    <View style={[styles.statusBadge, { backgroundColor: m.bg }]}>
      <View style={[styles.statusDot, { backgroundColor: m.dot }]} />
      <Text style={[styles.statusText, { color: m.fg }]}>{m.label}</Text>
    </View>
  );
}

interface HAvatarProps {
  name?: string | null;
  size?: number;
  bg?: string;
}

export function HAvatar({ name, size = 36, bg }: HAvatarProps) {
  const text = initials(name);
  const color = bg ?? avatarColor(text);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text allowFontScaling={false} style={{ color: '#fff', fontWeight: '800', fontSize: size * 0.38 }}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingHorizontal: 18,
    borderWidth: 1.5,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnText: { fontWeight: '700', letterSpacing: -0.1 },
  inputWrap: { gap: 6 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: HERMES.gray700 },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 50,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderRadius: RADIUS.md,
    backgroundColor: HERMES.white,
  },
  input: { flex: 1, fontSize: 15, color: HERMES.gray900, padding: 0 },
  inputError: { fontSize: 12, color: HERMES.red },
  inputHelper: { fontSize: 12, color: HERMES.gray500 },
  card: {
    backgroundColor: '#fff',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.05)',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 22,
    paddingHorizontal: 9,
    borderRadius: RADIUS.pill,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },
});
