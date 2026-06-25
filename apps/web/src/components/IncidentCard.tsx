'use client';

import { useState } from 'react';
import {
  INCIDENT_LABELS,
  INFRA_CATEGORY_LABELS,
  SEVERITY_LABELS,
  timeAgo,
  type Incident,
} from '@uteq/shared';
import { HAvatar } from '@/components/ui/HAvatar';
import { CloseIcon, ThumbUpIcon } from '@/components/ui/icons';
import { toggleLike } from '@/lib/incidents';
import { CATEGORY } from '@/lib/theme';

interface Props {
  incident: Incident;
  onClose: () => void;
  onLikeChange: (id: string, likes: number, liked: boolean) => void;
}

export function IncidentCard({ incident, onClose, onLikeChange }: Props) {
  const [busy, setBusy] = useState(false);
  const meta = CATEGORY[incident.type];

  const subtitle = [
    incident.category ? INFRA_CATEGORY_LABELS[incident.category] : null,
    incident.severity ? SEVERITY_LABELS[incident.severity] : null,
  ]
    .filter(Boolean)
    .join(' · ');

  async function handleLike() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await toggleLike(incident.id);
      onLikeChange(incident.id, res.likes_count, res.liked);
    } catch {
      // ignore
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="incident-card">
      <button type="button" className="incident-card-close" onClick={onClose} aria-label="Cerrar">
        <CloseIcon />
      </button>

      <div className="incident-card-header">
        <span className="incident-card-glyph" style={{ backgroundColor: meta.bg, color: meta.color }}>
          {meta.glyph}
        </span>
        <div>
          <h3>
            {INCIDENT_LABELS[incident.type]}
            {subtitle ? ` · ${subtitle}` : ''}
          </h3>
          <p className="incident-card-meta">
            {incident.author_nombre ? `${incident.author_nombre} · ` : ''}
            {timeAgo(incident.created_at)}
          </p>
        </div>
      </div>

      <p className={incident.description ? 'incident-card-desc' : 'incident-card-desc-muted'}>
        {incident.description || 'Sin descripción'}
      </p>

      <div className="incident-card-footer">
        {incident.author_nombre ? <HAvatar name={incident.author_nombre} size={28} /> : <span />}
        <button
          type="button"
          className={`incident-like-btn${incident.liked_by_me ? ' active' : ''}`}
          onClick={handleLike}
          disabled={busy}
        >
          <ThumbUpIcon filled={incident.liked_by_me} />
          {incident.likes_count}
        </button>
      </div>
    </div>
  );
}
