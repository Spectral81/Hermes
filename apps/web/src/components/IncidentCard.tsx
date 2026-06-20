'use client';

import { useState } from 'react';
import {
  INCIDENT_COLORS,
  INCIDENT_LABELS,
  INFRA_CATEGORY_LABELS,
  SEVERITY_LABELS,
  timeAgo,
  type Incident,
} from '@uteq/shared';
import { toggleLike } from '@/lib/incidents';

interface Props {
  incident: Incident;
  onClose: () => void;
  onLikeChange: (id: string, likes: number, liked: boolean) => void;
}

export function IncidentCard({ incident, onClose, onLikeChange }: Props) {
  const [busy, setBusy] = useState(false);
  const color = INCIDENT_COLORS[incident.type];

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
        ✕
      </button>

      <div className="incident-card-header">
        <span className="incident-card-dot" style={{ backgroundColor: color }} />
        <h3>{INCIDENT_LABELS[incident.type]}</h3>
      </div>

      {subtitle ? <p className="incident-card-subtitle">{subtitle}</p> : null}

      <p className={incident.description ? 'incident-card-desc' : 'incident-card-desc-muted'}>
        {incident.description || 'Sin descripción'}
      </p>

      <p className="incident-card-meta">
        {incident.author_nombre ? `${incident.author_nombre} · ` : ''}
        {timeAgo(incident.created_at)}
      </p>

      <div className="incident-card-actions">
        <button
          type="button"
          className={`incident-like-btn${incident.liked_by_me ? ' active' : ''}`}
          onClick={handleLike}
          disabled={busy}
        >
          👍 {incident.likes_count}
        </button>
        <span className="incident-confirm-hint">Confirmar que sigue aquí</span>
      </div>
    </div>
  );
}
