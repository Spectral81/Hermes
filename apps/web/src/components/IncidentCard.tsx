'use client';

import { useState } from 'react';
import {
  INCIDENT_LABELS,
  INCIDENT_VALIDATION_TARGET,
  INFRA_CATEGORY_LABELS,
  SEVERITY_LABELS,
  timeAgo,
  type Incident,
} from '@uteq/shared';
import { HAvatar } from '@/components/ui/HAvatar';
import { CloseIcon } from '@/components/ui/icons';
import { toggleLike } from '@/lib/incidents';
import { CATEGORY } from '@/lib/theme';

interface Props {
  incident: Incident;
  onClose: () => void;
  onLikeChange: (
    id: string,
    likes: number,
    liked: boolean,
    verified?: boolean,
    verifiedNow?: boolean,
  ) => void;
  variant?: 'overlay' | 'sidebar';
}

export function IncidentCard({ incident, onClose, onLikeChange, variant = 'overlay' }: Props) {
  const [busy, setBusy] = useState(false);
  const meta = CATEGORY[incident.type];
  const canValidate = incident.type === 'robo' || incident.type === 'accidente';
  const current = Math.min(incident.likes_count, INCIDENT_VALIDATION_TARGET);
  const remaining = Math.max(0, INCIDENT_VALIDATION_TARGET - current);
  const progress = current / INCIDENT_VALIDATION_TARGET;

  const subtitle = [
    incident.category ? INFRA_CATEGORY_LABELS[incident.category] : null,
    incident.severity ? SEVERITY_LABELS[incident.severity] : null,
  ]
    .filter(Boolean)
    .join(' · ');

  async function handleValidate() {
    if (busy || incident.liked_by_me) return;
    setBusy(true);
    try {
      const res = await toggleLike(incident.id);
      onLikeChange(incident.id, res.likes_count, res.liked, res.verified, res.verified_now);
    } catch {
      // ignore
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={variant === 'sidebar' ? 'incident-card incident-card-sidebar' : 'incident-card'}>
      <button type="button" className="incident-card-close" onClick={onClose} aria-label="Cerrar">
        <CloseIcon />
      </button>

      <div className="incident-card-header">
        <span className="incident-card-glyph" style={{ backgroundColor: meta.bg }}>
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

      {canValidate && (
        <div className="incident-validate-block">
          <div className="incident-validate-row">
            <span>Validaciones</span>
            <strong>
              {current}/{INCIDENT_VALIDATION_TARGET}
            </strong>
          </div>
          <div className="incident-validate-bar">
            <span style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
          <p className="incident-validate-hint">
            {remaining === 0
              ? 'Reporte verificado por la comunidad'
              : `Faltan ${remaining} validación${remaining === 1 ? '' : 'es'}`}
          </p>
          <button
            type="button"
            className="incident-validate-btn"
            onClick={handleValidate}
            disabled={busy || incident.liked_by_me || remaining === 0}
          >
            {incident.liked_by_me
              ? 'Ya validaste'
              : remaining === 0
                ? 'Verificado'
                : 'Confirmar que es real'}
          </button>
        </div>
      )}

      <div className="incident-card-footer">
        {incident.author_nombre ? <HAvatar name={incident.author_nombre} size={28} /> : <span />}
      </div>
    </div>
  );
}
