import { avatarColor, initials } from '@/lib/theme';

interface ProfileAvatarProps {
  name?: string | null;
  size?: number;
  ring?: boolean;
}

export function ProfileAvatar({ name, size = 40, ring = true }: ProfileAvatarProps) {
  const text = initials(name);
  const color = avatarColor(text);
  const fontSize = size * 0.36;

  return (
    <span
      className={`profile-avatar${ring ? ' profile-avatar-ring' : ''}`}
      style={{ width: size, height: size, fontSize }}
      aria-hidden
    >
      <span className="profile-avatar-inner" style={{ backgroundColor: color }}>
        {text}
      </span>
    </span>
  );
}
