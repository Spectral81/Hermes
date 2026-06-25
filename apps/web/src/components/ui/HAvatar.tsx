import { avatarColor, initials } from '@/lib/theme';

interface HAvatarProps {
  name?: string | null;
  size?: number;
  bg?: string;
}

export function HAvatar({ name, size = 36, bg }: HAvatarProps) {
  const text = initials(name);
  const color = bg ?? avatarColor(text);
  const fontSize = size * 0.38;

  return (
    <span
      className="h-avatar"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        fontSize,
      }}
      aria-hidden
    >
      {text}
    </span>
  );
}
