'use client';

import type { IncidentType } from '@uteq/shared';
import { CATEGORY } from '@/lib/theme';

const MARKER_SRC: Partial<Record<IncidentType, string>> = {
  robo: '/markers/spy.png',
  accidente: '/markers/slip.png',
  infraestructura: '/markers/hammer.png',
  panico: '/markers/sos.png',
};

const MARKER_ALT: Record<IncidentType, string> = {
  robo: 'Robo',
  accidente: 'Accidente',
  infraestructura: 'Infraestructura',
  panico: 'SOS',
};

/** Glifo de incidente con PNG animado. */
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
  const src = MARKER_SRC[type];
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={MARKER_ALT[type]}
        width={size}
        height={size}
        className={`incident-anim-icon ${className}`.trim()}
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

export function EventPopperIcon({ size = 36, className = '' }: { size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/markers/popper.png"
      alt="Evento"
      width={size}
      height={size}
      className={`incident-anim-icon ${className}`.trim()}
      draggable={false}
    />
  );
}

export function EventKermesIcon({ size = 36, className = '' }: { size?: number; className?: string }) {
  return (
    <span className={`event-balloon-float ${className}`.trim()} style={{ width: size, height: size }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/markers/kermes-icon.png"
        alt="Evento"
        width={size}
        height={size}
        className="event-balloon-icon"
        draggable={false}
      />
    </span>
  );
}

/** Calendario ilustrado para fechas de eventos. */
export function EventCalendarGlyph({ size = 18, className = '' }: { size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/markers/event-calendar.png"
      alt=""
      width={size}
      height={size}
      className={`event-meta-glyph ${className}`.trim()}
      draggable={false}
    />
  );
}

/** Pin de ubicación ilustrado para eventos. */
export function EventPinGlyph({ size = 18, className = '' }: { size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/markers/event-pin.png"
      alt=""
      width={size}
      height={size}
      className={`event-meta-glyph ${className}`.trim()}
      draggable={false}
    />
  );
}

/** Negocio / puesto ilustrado. */
export function EventStoreGlyph({ size = 18, className = '' }: { size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/markers/event-store.png"
      alt=""
      width={size}
      height={size}
      className={`event-meta-glyph ${className}`.trim()}
      draggable={false}
    />
  );
}
