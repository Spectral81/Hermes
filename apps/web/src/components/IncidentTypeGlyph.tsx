'use client';

import type { IncidentType } from '@uteq/shared';
import { CATEGORY } from '@/lib/theme';

/** Glifo de incidente: espía animado para robo, emoji para el resto. */
export function IncidentTypeGlyph({
  type,
  className = '',
  size = 28,
}: {
  type: IncidentType;
  className?: string;
  size?: number;
}) {
  const meta = CATEGORY[type];
  if (type === 'robo') {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/markers/spy.png"
        alt="Robo"
        width={size}
        height={size}
        className={`spy-robo-icon ${className}`.trim()}
        draggable={false}
      />
    );
  }
  return (
    <span className={className} style={{ fontSize: size * 0.75, lineHeight: 1 }}>
      {meta.glyph}
    </span>
  );
}
