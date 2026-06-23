interface MarkProps {
  size?: number;
  color?: string;
  accent?: string;
}

export function HermesMark({ size = 32, color = '#3B82F6', accent = '#fff' }: MarkProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden>
      <path d="M20 2 L36 8 V20 C36 30 28 36 20 38 C12 36 4 30 4 20 V8 Z" fill={color} />
      <path d="M13 12 V28 M27 12 V28 M13 20 H27" stroke={accent} strokeWidth={2.6} strokeLinecap="round" />
      <path d="M7 14 L11 14 M7 18 L11 18" stroke={accent} strokeWidth={1.4} strokeLinecap="round" opacity={0.55} />
      <path d="M29 22 L33 22 M29 26 L33 26" stroke={accent} strokeWidth={1.4} strokeLinecap="round" opacity={0.55} />
    </svg>
  );
}

export function HermesWordmark({ size = 18, color = '#0F172A' }: { size?: number; color?: string }) {
  return (
    <span className="hermes-wordmark" style={{ fontSize: size, color }}>
      HERMES
    </span>
  );
}

export function HermesLogoLockup({
  size = 28,
  color = '#3B82F6',
  textColor = '#0F172A',
}: {
  size?: number;
  color?: string;
  textColor?: string;
}) {
  return (
    <div className="hermes-lockup">
      <HermesMark size={size} color={color} />
      <HermesWordmark size={size * 0.58} color={textColor} />
    </div>
  );
}
